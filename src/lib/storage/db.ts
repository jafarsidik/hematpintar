import Dexie, { type Table } from 'dexie'
import { fail, ok, type Result } from '@/lib/calc/result'
import { storageError } from './errors'
import type {
  ProductRecord,
  SettingsRecord,
  SimulationRecord,
} from './schemas'

/** Cache Mirror Tabel Supabase untuk modul Hemat Rumah Tangga. */
export interface CachedShoppingNeed {
  id: string
  user_id: string
  name: string
  target_qty: number | null
  unit: string | null
  chosen_product_id: string | null
  created_at: string
  updated_at: string
}

export interface CachedSavedProduct {
  id: string
  user_id: string
  need_id: string
  title: string
  platform: string
  store_name: string | null
  url: string
  price: number
  pack_size: number
  pack_unit: string
  shipping_cost: number
  voucher_discount: number
  note: string | null
  price_checked_at: string | null
  created_at: string
  updated_at: string
}

export interface CachedHouseholdBudget {
  user_id: string
  monthly_budget: number
  updated_at: string
}

export class HematPintarDatabase extends Dexie {
  settings!: Table<SettingsRecord, string>
  simulations!: Table<SimulationRecord, string>
  products!: Table<ProductRecord, string>
  householdNeeds!: Table<CachedShoppingNeed, string>
  householdProducts!: Table<CachedSavedProduct, string>
  householdBudgetsCache!: Table<CachedHouseholdBudget, string>

  constructor(name = 'hematpintar') {
    super(name)
    this.version(1).stores({
      settings: 'id',
      simulations: 'id, moduleType, updatedAt, createdAt',
      products: 'id, category, updatedAt',
    })
    this.version(2).stores({
      settings: 'id',
      simulations: 'id, moduleType, updatedAt, createdAt',
      products: 'id, category, updatedAt',
      householdNeeds: 'id, user_id, updated_at',
      householdProducts: 'id, user_id, need_id, updated_at',
      householdBudgetsCache: 'user_id',
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
