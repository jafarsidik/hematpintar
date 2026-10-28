import Dexie, { type Table } from 'dexie'
import { fail, ok, type Result } from '@/lib/calc/result'
import { storageError } from './errors'
import type {
  ProductRecord,
  SettingsRecord,
  SimulationRecord,
} from './schemas'

export class HematPintarDatabase extends Dexie {
  settings!: Table<SettingsRecord, string>
  simulations!: Table<SimulationRecord, string>
  products!: Table<ProductRecord, string>

  constructor(name = 'hematpintar') {
    super(name)
    this.version(1).stores({
      settings: 'id',
      simulations: 'id, moduleType, updatedAt, createdAt',
      products: 'id, category, updatedAt',
    })
  }
}

export const db = new HematPintarDatabase()

export function createDatabase(name: string): HematPintarDatabase {
  return new HematPintarDatabase(name)
}

export const DEFAULT_SETTINGS: SettingsRecord = {
  id: 'app',
  currency: 'IDR',
  locale: 'id-ID',
  theme: 'system',
  onboardingCompleted: false,
}

export async function ensureSettings(
  database: HematPintarDatabase = db,
): Promise<Result<SettingsRecord>> {
  try {
    const existing = await database.settings.get(DEFAULT_SETTINGS.id)
    if (existing) return ok(existing)

    await database.settings.put(DEFAULT_SETTINGS)
    return ok(DEFAULT_SETTINGS)
  } catch {
    return fail(storageError('baca'))
  }
}
