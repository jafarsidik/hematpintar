import { fail, ok, type Result } from '@/lib/calc/result'
import { db, DEFAULT_SETTINGS, type HematPintarDatabase } from './db'
import { storageError, zodValidationErrors } from './errors'
import {
  SCHEMA_VERSION,
  backupSchema,
  type BackupData,
} from './schemas'

export async function createBackup(
  database: HematPintarDatabase = db,
): Promise<Result<BackupData>> {
  try {
    const [settings, products, simulations] = await Promise.all([
      database.settings.toArray(),
      database.products.toArray(),
      database.simulations.toArray(),
    ])

    const data = {
      format: 'hematpintar-backup',
      version: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      settings,
      products,
      simulations,
    }

    const parsed = backupSchema.safeParse(data)
    if (!parsed.success) return fail(zodValidationErrors(parsed.error))
    return ok(parsed.data)
  } catch {
    return fail(storageError('baca'))
  }
}

export function serializeBackup(data: BackupData): string {
  return JSON.stringify(data, null, 2)
}

export function parseBackup(json: string): Result<BackupData> {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return fail({
      field: 'file',
      code: 'JSON_TIDAK_VALID',
      message:
        'Berkas backup bukan JSON yang valid. Pilih berkas backup HematPintar yang benar.',
    })
  }

  const parsed = backupSchema.safeParse(raw)
  if (!parsed.success) {
    return fail(zodValidationErrors(parsed.error, 'IMPOR_TIDAK_VALID'))
  }
  return ok(parsed.data)
}

/**
 * Impor bersifat mengganti seluruh data. Validasi dilakukan penuh sebelum
 * transaksi tulis, sehingga berkas rusak tidak mengubah data lama.
 */
export async function importBackup(
  json: string,
  database: HematPintarDatabase = db,
): Promise<Result<BackupData>> {
  const parsed = parseBackup(json)
  if (!parsed.ok) return parsed

  try {
    await database.transaction(
      'rw',
      database.settings,
      database.simulations,
      database.products,
      async () => {
        await Promise.all([
          database.settings.clear(),
          database.simulations.clear(),
          database.products.clear(),
        ])

        await database.settings.bulkPut(parsed.value.settings)
        await database.simulations.bulkPut(parsed.value.simulations)
        await database.products.bulkPut(parsed.value.products)

        if (parsed.value.settings.length === 0) {
          await database.settings.put(DEFAULT_SETTINGS)
        }
      },
    )
    return ok(parsed.value)
  } catch {
    return fail(storageError('simpan'))
  }
}

export async function deleteAllData(
  database: HematPintarDatabase = db,
): Promise<Result<void>> {
  try {
    await database.transaction(
      'rw',
      database.settings,
      database.simulations,
      database.products,
      async () => {
        await Promise.all([
          database.settings.clear(),
          database.simulations.clear(),
          database.products.clear(),
        ])
        await database.settings.put(DEFAULT_SETTINGS)
      },
    )
    return ok(undefined)
  } catch {
    return fail(storageError('hapus'))
  }
}
