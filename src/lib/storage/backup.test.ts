import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { expectErr, expectOk } from '@/lib/calc/test-helpers'
import {
  createBackup,
  deleteAllData,
  importBackup,
  parseBackup,
  serializeBackup,
} from './backup'
import { createDatabase, ensureSettings, type HematPintarDatabase } from './db'
import { createSimulation, listSimulations } from './repository'

function householdInput(name = 'Belanja Bulanan') {
  return {
    moduleType: 'household' as const,
    name,
    payload: {
      budget: 500_000,
      items: [
        { nama: 'Beras', kuantitas: 5, satuan: 'kg' as const, harga: 15_000 },
      ],
      baselineItems: [],
      alternativeItems: [],
      notes: '',
    },
  }
}

const databases: HematPintarDatabase[] = []

function newDb(): HematPintarDatabase {
  const database = createDatabase(`hematpintar-backup-${crypto.randomUUID()}`)
  databases.push(database)
  return database
}

beforeEach(() => {
  databases.length = 0
})

afterEach(async () => {
  for (const database of databases) {
    database.close()
    await Dexie.delete(database.name)
  }
})

describe('backup', () => {
  it('mengekspor seluruh tabel dan memvalidasi hasilnya', async () => {
    const db = newDb()
    expectOk(await ensureSettings(db))
    expectOk(await createSimulation(householdInput(), db))

    const backup = expectOk(await createBackup(db))
    expect(backup.format).toBe('hematpintar-backup')
    expect(backup.version).toBe(1)
    expect(backup.settings).toHaveLength(1)
    expect(backup.simulations).toHaveLength(1)
    expect(backup.products).toEqual([])

    const roundTrip = expectOk(parseBackup(serializeBackup(backup)))
    expect(roundTrip.simulations).toEqual(backup.simulations)
  })

  it('menolak JSON rusak dengan pesan jelas dan tidak mengubah data lama', async () => {
    const db = newDb()
    expectOk(await createSimulation(householdInput(), db))

    expectErr(await importBackup('{ bukan json', db), 'JSON_TIDAK_VALID')

    const rows = expectOk(await listSimulations(undefined, db))
    expect(rows).toHaveLength(1)
  })

  it('menolak struktur backup yang tidak valid tanpa mengubah data lama', async () => {
    const db = newDb()
    expectOk(await createSimulation(householdInput(), db))

    const invalid = JSON.stringify({
      format: 'hematpintar-backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: [],
      products: [],
    })

    expectErr(await importBackup(invalid, db), 'IMPOR_TIDAK_VALID')

    const rows = expectOk(await listSimulations(undefined, db))
    expect(rows).toHaveLength(1)
  })

  it('menolak payload simulasi yang tidak valid di dalam backup', async () => {
    const db = newDb()
    expectOk(await createSimulation(householdInput(), db))

    const backup = expectOk(await createBackup(db))
    const broken = {
      ...backup,
      simulations: [
        {
          ...backup.simulations[0],
          payload: {
            ...(backup.simulations[0]?.payload as object),
            budget: -1,
          },
        },
      ],
    }

    expectErr(
      await importBackup(JSON.stringify(broken), db),
      'IMPOR_TIDAK_VALID',
    )

    const rows = expectOk(await listSimulations(undefined, db))
    expect(rows).toHaveLength(1)
  })

  it('mengganti seluruh data saat impor backup valid', async () => {
    const source = newDb()
    expectOk(await createSimulation(householdInput('Hanya Satu'), source))
    const json = serializeBackup(expectOk(await createBackup(source)))

    const target = newDb()
    expectOk(await createSimulation(householdInput('Lama A'), target))
    expectOk(await createSimulation(householdInput('Lama B'), target))

    expectOk(await importBackup(json, target))

    const rows = expectOk(await listSimulations(undefined, target))
    expect(rows).toHaveLength(1)
    expect(rows[0]?.name).toBe('Hanya Satu')
  })

  it('menghapus semua data dan mengembalikan pengaturan default', async () => {
    const db = newDb()
    expectOk(await ensureSettings(db))
    expectOk(await createSimulation(householdInput(), db))

    expectOk(await deleteAllData(db))

    expect(expectOk(await listSimulations(undefined, db))).toEqual([])
    const settings = expectOk(await ensureSettings(db))
    expect(settings.id).toBe('app')
  })
})
