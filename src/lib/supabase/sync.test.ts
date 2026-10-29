import { beforeEach, describe, expect, it, vi } from 'vitest'
import { expectOk } from '@/lib/calc/test-helpers'
import type { SimulationRecord } from '@/lib/storage/schemas'

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
}))

const repoMock = vi.hoisted(() => ({
  listSimulations: vi.fn(),
  markSimulationsSynced: vi.fn(),
  putSimulationRecords: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  supabase: supabaseMock,
  isSupabaseConfigured: true,
}))

vi.mock('@/lib/storage/repository', () => repoMock)

import { applyCloudSyncAction, buildCloudSyncAction } from './sync'

const USER_ID = '11111111-1111-4111-8111-111111111111'

function localRecord(overrides: Partial<SimulationRecord> = {}): SimulationRecord {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    moduleType: 'household',
    name: 'Belanja Bulanan',
    payload: {
      budget: 500_000,
      items: [
        { nama: 'Beras', kuantitas: 5, satuan: 'kg', harga: 15_000 },
      ],
      baselineItems: [],
      alternativeItems: [],
      notes: '',
    },
    schemaVersion: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    ...overrides,
  }
}

function remoteRow(record: SimulationRecord) {
  return {
    id: record.id,
    user_id: USER_ID,
    module_type: record.moduleType,
    name: record.name,
    payload: record.payload,
    schema_version: record.schemaVersion,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  }
}

function mockRemote(rows: unknown[]) {
  const eq = vi.fn().mockResolvedValue({ data: rows, error: null })
  const select = vi.fn().mockReturnValue({ eq })
  const upsert = vi.fn().mockResolvedValue({ error: null })
  supabaseMock.from.mockReturnValue({ select, upsert })
  return { eq, select, upsert }
}

beforeEach(() => {
  vi.clearAllMocks()
  repoMock.listSimulations.mockResolvedValue({ ok: true, value: [] })
  repoMock.markSimulationsSynced.mockResolvedValue({ ok: true, value: undefined })
  repoMock.putSimulationRecords.mockResolvedValue({
    ok: true,
    value: undefined,
  })
})

describe('cloud sync service', () => {
  it('merencanakan unggahan data lokal dan memakai user id dari sesi', async () => {
    const local = localRecord()
    repoMock.listSimulations.mockResolvedValue({ ok: true, value: [local] })
    const remote = mockRemote([])

    const action = expectOk(await buildCloudSyncAction('upload', USER_ID))

    expect(remote.eq).toHaveBeenCalledWith('user_id', USER_ID)
    expect(action.plan.toApply).toEqual([local])
    expect(action.plan.conflicts).toEqual([])
  })

  it('mengunggah baris snake_case tanpa metadata lokal', async () => {
    const local = localRecord({
      syncedAt: '2026-01-03T00:00:00.000Z',
      cloudUserId: USER_ID,
    })
    repoMock.listSimulations.mockResolvedValue({ ok: true, value: [local] })
    const remote = mockRemote([])

    const action = expectOk(await buildCloudSyncAction('upload', USER_ID))
    const summary = expectOk(await applyCloudSyncAction(action, USER_ID))

    expect(remote.upsert).toHaveBeenCalledWith(
      [
        {
          id: local.id,
          user_id: USER_ID,
          module_type: local.moduleType,
          name: local.name,
          payload: local.payload,
          schema_version: local.schemaVersion,
          created_at: local.createdAt,
          updated_at: local.updatedAt,
        },
      ],
      { onConflict: 'id' },
    )
    expect(repoMock.markSimulationsSynced).toHaveBeenCalledWith(
      [local.id],
      USER_ID,
      expect.any(String),
    )
    expect(summary.uploaded).toBe(1)
  })

  it('meminta konfirmasi bila versi akun lebih baru dan tidak menimpa akun', async () => {
    const local = localRecord()
    const newerRemote = localRecord({
      updatedAt: '2026-02-01T00:00:00.000Z',
    })
    repoMock.listSimulations.mockResolvedValue({ ok: true, value: [local] })
    const remote = mockRemote([remoteRow(newerRemote)])

    const action = expectOk(await buildCloudSyncAction('upload', USER_ID))
    expect(action.plan.toApply).toEqual([])
    expect(action.plan.conflicts).toHaveLength(1)

    const summary = expectOk(await applyCloudSyncAction(action, USER_ID))

    expect(remote.upsert).not.toHaveBeenCalled()
    expect(summary.uploaded).toBe(0)
    expect(summary.conflicts).toBe(1)
  })

  it('memulihkan data akun ke Dexie dengan metadata akun', async () => {
    const remoteRecord = localRecord()
    const remote = mockRemote([remoteRow(remoteRecord)])

    const action = expectOk(await buildCloudSyncAction('restore', USER_ID))
    const summary = expectOk(await applyCloudSyncAction(action, USER_ID))

    expect(remote.upsert).not.toHaveBeenCalled()
    expect(repoMock.putSimulationRecords).toHaveBeenCalledWith([
      expect.objectContaining({
        id: remoteRecord.id,
        cloudUserId: USER_ID,
        syncedAt: expect.any(String),
      }),
    ])
    expect(summary.downloaded).toBe(1)
  })

  it('melewati baris akun yang tidak lolos validasi', async () => {
    const invalid = remoteRow(localRecord())
    invalid.payload = { budget: -1 }
    mockRemote([invalid])

    const action = expectOk(await buildCloudSyncAction('restore', USER_ID))

    expect(action.plan.toApply).toEqual([])
    expect(action.snapshot.invalidRemote).toBe(1)
  })
})
