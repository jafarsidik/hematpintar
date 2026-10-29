import { fail, ok, type Result, type ValidationError } from '@/lib/calc/result'
import {
  listSimulations,
  markSimulationsSynced,
  putSimulationRecords,
} from '@/lib/storage/repository'
import {
  simulationSchema,
  type ModuleType,
  type SimulationRecord,
} from '@/lib/storage/schemas'
import { planRestore, planUpload, type SyncPlan } from '@/lib/sync/plan'
import { supabase } from './client'

export type CloudSyncDirection = 'upload' | 'restore'

export interface CloudSnapshot {
  local: SimulationRecord[]
  remote: SimulationRecord[]
  invalidRemote: number
}

export interface CloudSyncAction {
  direction: CloudSyncDirection
  snapshot: CloudSnapshot
  plan: SyncPlan<SimulationRecord>
}

export interface CloudSyncSummary {
  uploaded: number
  downloaded: number
  conflicts: number
  upToDate: number
  invalid: number
}

interface RemoteSimulationRow {
  id: string
  user_id: string
  module_type: ModuleType
  name: string
  payload: unknown
  schema_version: number
  created_at: string
  updated_at: string
}

function cloudError(message: string): ValidationError {
  return {
    field: 'supabase',
    code: 'SUPABASE_GAGAL',
    message,
  }
}

function remoteRowToRecord(
  row: RemoteSimulationRow,
): SimulationRecord | null {
  const candidate = {
    id: row.id,
    moduleType: row.module_type,
    name: row.name,
    payload: row.payload,
    schemaVersion: row.schema_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncedAt: row.updated_at,
    cloudUserId: row.user_id,
  }

  const parsed = simulationSchema.safeParse(candidate)
  return parsed.success ? parsed.data : null
}

function recordToRemoteRow(
  record: SimulationRecord,
  userId: string,
): RemoteSimulationRow {
  return {
    id: record.id,
    user_id: userId,
    module_type: record.moduleType,
    name: record.name,
    payload: record.payload,
    schema_version: record.schemaVersion,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  }
}

async function fetchRemoteSimulations(
  userId: string,
): Promise<Result<{ records: SimulationRecord[]; invalid: number }>> {
  if (!supabase) {
    return fail(
      cloudError(
        'Fitur akun belum tersedia karena Supabase belum dikonfigurasi.',
      ),
    )
  }

  const { data, error } = await supabase
    .from('simulations')
    .select(
      'id, user_id, module_type, name, payload, schema_version, created_at, updated_at',
    )
    .eq('user_id', userId)

  if (error) {
    return fail(
      cloudError(
        'Data akun tidak dapat dimuat. Periksa koneksi lalu coba lagi.',
      ),
    )
  }

  const records: SimulationRecord[] = []
  let invalid = 0

  ;(data as RemoteSimulationRow[] | null)?.forEach((row) => {
    const record = remoteRowToRecord(row)
    if (record) {
      records.push(record)
    } else {
      invalid += 1
    }
  })

  return ok({ records, invalid })
}

export async function buildCloudSyncAction(
  direction: CloudSyncDirection,
  userId: string,
): Promise<Result<CloudSyncAction>> {
  const localResult = await listSimulations()
  if (!localResult.ok) return localResult

  const remoteResult = await fetchRemoteSimulations(userId)
  if (!remoteResult.ok) return remoteResult

  const snapshot: CloudSnapshot = {
    local: localResult.value,
    remote: remoteResult.value.records,
    invalidRemote: remoteResult.value.invalid,
  }

  const plan =
    direction === 'upload'
      ? planUpload(snapshot.local, snapshot.remote)
      : planRestore(snapshot.local, snapshot.remote)

  return ok({ direction, snapshot, plan })
}

export async function applyCloudSyncAction(
  action: CloudSyncAction,
  userId: string,
): Promise<Result<CloudSyncSummary>> {
  if (action.direction === 'upload') {
    if (!supabase) {
      return fail(
        cloudError(
          'Fitur akun belum tersedia karena Supabase belum dikonfigurasi.',
        ),
      )
    }

    const rows = action.plan.toApply.map((record) =>
      recordToRemoteRow(record, userId),
    )

    if (rows.length > 0) {
      const { error } = await supabase
        .from('simulations')
        .upsert(rows, { onConflict: 'id' })

      if (error) {
        return fail(
          cloudError(
            'Cadangan ke akun gagal. Data lokal tidak diubah; coba lagi.',
          ),
        )
      }
    }

    const syncedAt = new Date().toISOString()
    const markResult = await markSimulationsSynced(
      action.plan.toApply.map((record) => record.id),
      userId,
      syncedAt,
    )
    if (!markResult.ok) return markResult

    return ok({
      uploaded: rows.length,
      downloaded: 0,
      conflicts: action.plan.conflicts.length,
      upToDate: action.plan.upToDate,
      invalid: action.snapshot.invalidRemote,
    })
  }

  const syncedAt = new Date().toISOString()
  const records = action.plan.toApply.map((record) => ({
    ...record,
    syncedAt,
    cloudUserId: userId,
  }))
  const putResult = await putSimulationRecords(records)
  if (!putResult.ok) return putResult

  return ok({
    uploaded: 0,
    downloaded: records.length,
    conflicts: action.plan.conflicts.length,
    upToDate: action.plan.upToDate,
    invalid: action.snapshot.invalidRemote,
  })
}
