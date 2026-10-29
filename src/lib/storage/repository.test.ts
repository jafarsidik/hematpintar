import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { expectErr, expectOk } from '@/lib/calc/test-helpers'
import { createDatabase, ensureSettings, type HematPintarDatabase } from './db'
import {
  createSimulation,
  duplicateSimulation,
  getSimulationById,
  listSimulations,
  markSimulationsSynced,
  putSimulationRecords,
  removeSimulation,
  simulationRepository,
  updateSimulation,
} from './repository'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function householdInput() {
  return {
    moduleType: 'household' as const,
    name: 'Belanja Bulanan',
    payload: {
      budget: 500_000,
      items: [
        { nama: 'Beras', kuantitas: 5, satuan: 'kg' as const, harga: 15_000 },
      ],
      baselineItems: [],
      alternativeItems: [],
      notes: 'Contoh',
    },
  }
}

let db: HematPintarDatabase

beforeEach(() => {
  db = createDatabase(`hematpintar-test-${crypto.randomUUID()}`)
})

afterEach(async () => {
  db.close()
  await Dexie.delete(db.name)
})

describe('simulation repository', () => {
  it('membuat simulasi dengan UUID, schemaVersion, dan timestamp', async () => {
    const result = await createSimulation(householdInput(), db)
    const created = expectOk(result)

    expect(created.id).toMatch(UUID_PATTERN)
    expect(created.schemaVersion).toBe(1)
    expect(created.name).toBe('Belanja Bulanan')
    expect(Number.isNaN(Date.parse(created.createdAt))).toBe(false)
    expect(created.updatedAt).toBe(created.createdAt)
  })

  it('menolak payload yang tidak valid dan tidak menyimpan apa pun', async () => {
    const input = householdInput()
    const result = await createSimulation(
      { ...input, payload: { ...input.payload, budget: -1 } },
      db,
    )

    expectErr(result, 'VALIDASI_GAGAL')
    expect(expectOk(await listSimulations(undefined, db))).toHaveLength(0)
  })

  it('menolak nama kosong', async () => {
    const result = await createSimulation(
      { ...householdInput(), name: '   ' },
      db,
    )
    expectErr(result, 'VALIDASI_GAGAL')
  })

  it('mengambil simulasi berdasarkan id dan null bila tidak ada', async () => {
    const created = expectOk(await createSimulation(householdInput(), db))

    const found = expectOk(await getSimulationById(created.id, db))
    expect(found?.id).toBe(created.id)

    const missing = expectOk(
      await getSimulationById(crypto.randomUUID(), db),
    )
    expect(missing).toBeNull()
  })

  it('mendaftar simulasi berdasarkan moduleType dan urutan terbaru', async () => {
    const first = expectOk(await createSimulation(householdInput(), db))
    await new Promise((resolve) => setTimeout(resolve, 2))
    const second = expectOk(
      await createSimulation(
        { ...householdInput(), name: 'Belanja Mingguan' },
        db,
      ),
    )
    expectOk(
      await createSimulation(
        {
          moduleType: 'margin',
          name: 'HPP Kue',
          payload: {
            productName: 'Kue Lapis',
            batchYield: 20,
            ingredients: [
              { nama: 'Tepung', kuantitas: 1, hargaPerSatuan: 12_000 },
            ],
            packagingCost: 5_000,
            directLaborCost: 20_000,
            allocatedOverhead: 10_000,
            sellingPrice: 10_000,
            targetMargin: 0.3,
          },
        },
        db,
      ),
    )

    const household = expectOk(await listSimulations('household', db))
    expect(household.map((item) => item.id)).toEqual([second.id, first.id])

    const all = expectOk(await listSimulations(undefined, db))
    expect(all).toHaveLength(3)
  })

  it('memperbarui nama dan payload lalu mempertahankan id', async () => {
    const created = expectOk(await createSimulation(householdInput(), db))
    const payload = {
      ...householdInput().payload,
      budget: 750_000,
    }

    const updated = expectOk(
      await updateSimulation(created.id, { name: 'Belanja Baru', payload }, db),
    )

    expect(updated.id).toBe(created.id)
    expect(updated.name).toBe('Belanja Baru')
    expect(updated.payload).toEqual(payload)
    expect(updated.createdAt).toBe(created.createdAt)
  })

  it('menolak update dengan payload tidak valid tanpa mengubah data lama', async () => {
    const created = expectOk(await createSimulation(householdInput(), db))
    const invalid = {
      ...householdInput().payload,
      budget: -5,
    }

    expectErr(
      await updateSimulation(created.id, { payload: invalid }, db),
      'VALIDASI_GAGAL',
    )

    const found = expectOk(await getSimulationById(created.id, db))
    expect(found?.payload).toEqual(householdInput().payload)
  })

  it('menolak update untuk id yang tidak ada', async () => {
    expectErr(
      await updateSimulation(crypto.randomUUID(), { name: 'X' }, db),
      'TIDAK_DITEMUKAN',
    )
  })

  it('menduplikasi dengan id baru dan payload tersalin', async () => {
    const created = expectOk(await createSimulation(householdInput(), db))
    const duplicate = expectOk(await duplicateSimulation(created.id, db))

    expect(duplicate.id).not.toBe(created.id)
    expect(duplicate.id).toMatch(UUID_PATTERN)
    expect(duplicate.name).toBe('Belanja Bulanan (salinan)')
    expect(duplicate.payload).toEqual(created.payload)

    const all = expectOk(await listSimulations(undefined, db))
    expect(all).toHaveLength(2)
  })

  it('menandai simulasi sebagai tercadangkan ke akun', async () => {
    const created = expectOk(await createSimulation(householdInput(), db))
    const userId = '11111111-1111-4111-8111-111111111111'
    const syncedAt = '2999-02-01T00:00:00.000Z'

    expectOk(await markSimulationsSynced([created.id], userId, syncedAt, db))

    const found = expectOk(await getSimulationById(created.id, db))
    expect(found?.syncedAt).toBe(syncedAt)
    expect(found?.cloudUserId).toBe(userId)
  })

  it('tidak mewariskan status tercadangkan ke salinan', async () => {
    const created = expectOk(await createSimulation(householdInput(), db))
    const userId = '11111111-1111-4111-8111-111111111111'
    expectOk(
      await markSimulationsSynced(
        [created.id],
        userId,
        '2999-02-01T00:00:00.000Z',
        db,
      ),
    )

    const copy = expectOk(await duplicateSimulation(created.id, db))

    expect(copy.syncedAt).toBeUndefined()
    expect(copy.cloudUserId).toBeUndefined()
  })

  it('menyimpan record hasil pemulihan akun setelah validasi', async () => {
    const timestamp = '2026-03-01T00:00:00.000Z'
    const userId = '11111111-1111-4111-8111-111111111111'
    const remote = {
      id: crypto.randomUUID(),
      moduleType: 'household' as const,
      name: 'Belanja dari akun',
      payload: householdInput().payload,
      createdAt: timestamp,
      updatedAt: timestamp,
      schemaVersion: 1,
      syncedAt: timestamp,
      cloudUserId: userId,
    }

    expectOk(await putSimulationRecords([remote], db))

    const found = expectOk(await getSimulationById(remote.id, db))
    expect(found).toMatchObject({
      id: remote.id,
      name: 'Belanja dari akun',
      syncedAt: timestamp,
      cloudUserId: userId,
    })
  })

  it('menolak record pemulihan yang tidak valid tanpa menulis apa pun', async () => {
    const timestamp = '2026-03-01T00:00:00.000Z'
    const invalid = {
      id: crypto.randomUUID(),
      moduleType: 'household' as const,
      name: 'Rusak',
      payload: { ...householdInput().payload, budget: -1 },
      createdAt: timestamp,
      updatedAt: timestamp,
      schemaVersion: 1,
    }

    expectErr(await putSimulationRecords([invalid], db), 'VALIDASI_GAGAL')
    expect(expectOk(await listSimulations(undefined, db))).toHaveLength(0)
  })

  it('menghapus simulasi dan menolak id yang tidak ada', async () => {
    const created = expectOk(await createSimulation(householdInput(), db))

    expectOk(await removeSimulation(created.id, db))
    expect(expectOk(await getSimulationById(created.id, db))).toBeNull()

    expectErr(await removeSimulation(created.id, db), 'TIDAK_DITEMUKAN')
  })

  it('mengembalikan error penyimpanan, bukan sukses, saat IndexedDB gagal', async () => {
    db.close()
    const result = await createSimulation(householdInput(), db)
    expectErr(result, 'PENYIMPANAN_GAGAL')
  })

  it('menyediakan antarmuka repository bernama sesuai kontrak', async () => {
    const created = expectOk(
      await simulationRepository.create(householdInput(), db),
    )
    const listed = expectOk(
      await simulationRepository.list('household', db),
    )

    expect(listed.map((item) => item.id)).toContain(created.id)
    expect(expectOk(await simulationRepository.getById(created.id, db))?.id).toBe(
      created.id,
    )
  })
})

describe('settings', () => {
  it('membuat pengaturan default sekali saja', async () => {
    const first = expectOk(await ensureSettings(db))
    expect(first).toMatchObject({
      id: 'app',
      currency: 'IDR',
      locale: 'id-ID',
      theme: 'system',
      onboardingCompleted: false,
    })

    const second = expectOk(await ensureSettings(db))
    expect(second).toEqual(first)
  })
})
