import { fail, ok, type Result } from '@/lib/calc/result'
import { db, type HematPintarDatabase } from './db'
import { storageError, zodValidationErrors } from './errors'
import {
  SCHEMA_VERSION,
  simulationSchema,
  type ModuleType,
  type SimulationRecord,
} from './schemas'

export interface CreateSimulationInput {
  moduleType: ModuleType
  name: string
  payload: unknown
}

export interface UpdateSimulationInput {
  name?: string
  payload?: unknown
}

function now(): string {
  return new Date().toISOString()
}

function notFound(): Result<never> {
  return fail({
    field: 'id',
    code: 'TIDAK_DITEMUKAN',
    message: 'Simulasi tidak ditemukan. Muat ulang daftar riwayat.',
  })
}

export async function createSimulation(
  input: CreateSimulationInput,
  database: HematPintarDatabase = db,
): Promise<Result<SimulationRecord>> {
  const timestamp = now()
  const record: SimulationRecord = {
    id: crypto.randomUUID(),
    moduleType: input.moduleType,
    name: input.name,
    payload: input.payload,
    createdAt: timestamp,
    updatedAt: timestamp,
    schemaVersion: SCHEMA_VERSION,
  }

  const parsed = simulationSchema.safeParse(record)
  if (!parsed.success) return fail(zodValidationErrors(parsed.error))

  try {
    await database.simulations.add(parsed.data)
    return ok(parsed.data)
  } catch {
    return fail(storageError('simpan'))
  }
}

export async function getSimulationById(
  id: string,
  database: HematPintarDatabase = db,
): Promise<Result<SimulationRecord | null>> {
  try {
    const found = await database.simulations.get(id)
    return ok(found ?? null)
  } catch {
    return fail(storageError('baca'))
  }
}

export async function listSimulations(
  moduleType?: ModuleType,
  database: HematPintarDatabase = db,
): Promise<Result<SimulationRecord[]>> {
  try {
    const rows = await database.simulations.toArray()
    const filtered = moduleType
      ? rows.filter((row) => row.moduleType === moduleType)
      : rows

    filtered.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    return ok(filtered)
  } catch {
    return fail(storageError('baca'))
  }
}

export async function updateSimulation(
  id: string,
  patch: UpdateSimulationInput,
  database: HematPintarDatabase = db,
): Promise<Result<SimulationRecord>> {
  let existing: SimulationRecord | undefined
  try {
    existing = await database.simulations.get(id)
  } catch {
    return fail(storageError('baca'))
  }
  if (!existing) return notFound()

  const merged: SimulationRecord = {
    ...existing,
    name: patch.name ?? existing.name,
    payload: patch.payload === undefined ? existing.payload : patch.payload,
    updatedAt: now(),
  }

  const parsed = simulationSchema.safeParse(merged)
  if (!parsed.success) return fail(zodValidationErrors(parsed.error))

  try {
    await database.simulations.put(parsed.data)
    return ok(parsed.data)
  } catch {
    return fail(storageError('simpan'))
  }
}

export async function duplicateSimulation(
  id: string,
  database: HematPintarDatabase = db,
): Promise<Result<SimulationRecord>> {
  let existing: SimulationRecord | undefined
  try {
    existing = await database.simulations.get(id)
  } catch {
    return fail(storageError('baca'))
  }
  if (!existing) return notFound()

  const timestamp = now()
  const copy: SimulationRecord = {
    ...existing,
    id: crypto.randomUUID(),
    name: `${existing.name} (salinan)`,
    payload: structuredClone(existing.payload),
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  const parsed = simulationSchema.safeParse(copy)
  if (!parsed.success) return fail(zodValidationErrors(parsed.error))

  try {
    await database.simulations.add(parsed.data)
    return ok(parsed.data)
  } catch {
    return fail(storageError('simpan'))
  }
}

export async function removeSimulation(
  id: string,
  database: HematPintarDatabase = db,
): Promise<Result<void>> {
  try {
    const existing = await database.simulations.get(id)
    if (!existing) return notFound()
    await database.simulations.delete(id)
    return ok(undefined)
  } catch {
    return fail(storageError('hapus'))
  }
}

/**
 * Antarmuka repository dengan nama metode sesuai kontrak PRD.
 * Fungsi individual tetap diekspor untuk pemakaian langsung dan pengujian.
 */
export const simulationRepository = {
  create: createSimulation,
  getById: getSimulationById,
  list: listSimulations,
  update: updateSimulation,
  duplicate: duplicateSimulation,
  remove: removeSimulation,
} as const
