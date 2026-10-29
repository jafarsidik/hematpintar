import { fail, ok, type Result } from '@/lib/calc/result'
import { supabase } from '@/lib/supabase/client'
import { normalizeUrl } from '@/lib/links/normalize-url'
import { db } from './db'
import { storageError } from './errors'
import type {
  CachedHouseholdBudget,
  CachedSavedProduct,
  CachedShoppingNeed,
} from './db'

const OFFLINE_ERROR = {
  field: 'supabase',
  code: 'OFFLINE',
  message:
    'Tidak ada koneksi internet. Penyimpanan ke akun ditolak; data tidak disimpan.',
}

export interface ShoppingNeed {
  id: string
  user_id: string
  name: string
  target_qty: number | null
  unit: string | null
  chosen_product_id: string | null
  created_at: string
  updated_at: string
}

export interface SavedProduct {
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

export interface HouseholdBudget {
  user_id: string
  monthly_budget: number
  updated_at: string
}

export interface CreateNeedInput {
  name: string
  target_qty?: number | null
  unit?: string | null
}

export interface UpdateNeedInput {
  name?: string
  target_qty?: number | null
  unit?: string | null
  chosen_product_id?: string | null
}

export interface CreateProductInput {
  title: string
  platform?: string
  store_name?: string | null
  url: string
  price?: number
  pack_size?: number
  pack_unit?: string
  shipping_cost?: number
  voucher_discount?: number
  note?: string | null
  price_checked_at?: string | null
}

export interface UpdateProductInput {
  title?: string
  platform?: string
  store_name?: string | null
  url?: string
  price?: number
  pack_size?: number
  pack_unit?: string
  shipping_cost?: number
  voucher_discount?: number
  note?: string | null
  price_checked_at?: string | null
}

function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine !== false
}

function needRowToNeed(row: CachedShoppingNeed): ShoppingNeed {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    target_qty: row.target_qty ?? null,
    unit: row.unit ?? null,
    chosen_product_id: row.chosen_product_id ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function productRowToProduct(row: CachedSavedProduct): SavedProduct {
  return {
    id: row.id,
    user_id: row.user_id,
    need_id: row.need_id,
    title: row.title,
    platform: row.platform,
    store_name: row.store_name,
    url: row.url,
    price: row.price,
    pack_size: row.pack_size,
    pack_unit: row.pack_unit,
    shipping_cost: row.shipping_cost,
    voucher_discount: row.voucher_discount,
    note: row.note,
    price_checked_at: row.price_checked_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function budgetRowToBudget(row: CachedHouseholdBudget): HouseholdBudget {
  return {
    user_id: row.user_id,
    monthly_budget: row.monthly_budget,
    updated_at: row.updated_at,
  }
}

/* ------------------------------------------------------------------ */
/* Kebutuhan                                                          */
/* ------------------------------------------------------------------ */

export async function listNeeds(
  userId: string,
  database: typeof db = db,
): Promise<Result<ShoppingNeed[]>> {
  if (supabase && isOnline()) {
    const { data, error } = await supabase
      .from('shopping_needs')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (!error) {
      const rows: CachedShoppingNeed[] = (data ?? []).map((row) => ({
        id: row.id,
        user_id: row.user_id,
        name: row.name,
        target_qty: row.target_qty ?? null,
        unit: row.unit ?? null,
        chosen_product_id: row.chosen_product_id ?? null,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }))
      try {
        await database.transaction('rw', database.householdNeeds, async () => {
          await database.householdNeeds.clear()
          await database.householdNeeds.bulkAdd(rows)
        })
      } catch {
        // Cache gagal tidak memblokir baca dari Supabase.
      }
      return ok(rows.map(needRowToNeed))
    }
  }

  try {
    const rows = await database.householdNeeds
      .where('user_id')
      .equals(userId)
      .sortBy('updated_at')
    return ok(rows.map(needRowToNeed))
  } catch {
    return fail(storageError('baca'))
  }
}

export async function getNeed(
  id: string,
  userId: string,
  database: typeof db = db,
): Promise<Result<ShoppingNeed | null>> {
  if (supabase && isOnline()) {
    const { data, error } = await supabase
      .from('shopping_needs')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle()

    if (!error) {
      if (data) {
        const row: CachedShoppingNeed = {
          id: data.id,
          user_id: data.user_id,
          name: data.name,
          target_qty: data.target_qty ?? null,
          unit: data.unit ?? null,
          chosen_product_id: data.chosen_product_id ?? null,
          created_at: data.created_at,
          updated_at: data.updated_at,
        }
        try {
          await database.householdNeeds.put(row)
        } catch {
          // Cache gagal tidak memblokir baca.
        }
        return ok(needRowToNeed(row))
      }
      return ok(null)
    }
  }

  try {
    const row = await database.householdNeeds.get(id)
    if (!row || row.user_id !== userId) return ok(null)
    return ok(needRowToNeed(row))
  } catch {
    return fail(storageError('baca'))
  }
}

export async function createNeed(
  userId: string,
  input: CreateNeedInput,
  database: typeof db = db,
): Promise<Result<ShoppingNeed>> {
  if (!isOnline()) {
    return fail(OFFLINE_ERROR)
  }
  if (!supabase) {
    return fail(storageError('simpan'))
  }

  const { data, error } = await supabase
    .from('shopping_needs')
    .insert({
      user_id: userId,
      name: input.name,
      target_qty: input.target_qty ?? null,
      unit: input.unit ?? null,
    })
    .select('*')
    .single()

  if (error) return fail(storageError('simpan'))

  const row: CachedShoppingNeed = {
    id: data.id,
    user_id: data.user_id,
    name: data.name,
    target_qty: data.target_qty ?? null,
    unit: data.unit ?? null,
    chosen_product_id: data.chosen_product_id ?? null,
    created_at: data.created_at,
    updated_at: data.updated_at,
  }

  try {
    await database.householdNeeds.put(row)
  } catch {
    // Cache gagal tidak membatalkan penyimpanan utama.
  }

  return ok(needRowToNeed(row))
}

export async function updateNeed(
  id: string,
  userId: string,
  patch: UpdateNeedInput,
  database: typeof db = db,
): Promise<Result<ShoppingNeed>> {
  if (!isOnline()) {
    return fail(OFFLINE_ERROR)
  }
  if (!supabase) {
    return fail(storageError('simpan'))
  }

  const { data, error } = await supabase
    .from('shopping_needs')
    .update({
      name: patch.name,
      target_qty: patch.target_qty ?? null,
      unit: patch.unit ?? null,
      chosen_product_id: patch.chosen_product_id ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error) return fail(storageError('simpan'))

  const row: CachedShoppingNeed = {
    id: data.id,
    user_id: data.user_id,
    name: data.name,
    target_qty: data.target_qty ?? null,
    unit: data.unit ?? null,
    chosen_product_id: data.chosen_product_id ?? null,
    created_at: data.created_at,
    updated_at: data.updated_at,
  }

  try {
    await database.householdNeeds.put(row)
  } catch {
    // Cache gagal tidak membatalkan penyimpanan utama.
  }

  return ok(needRowToNeed(row))
}

export async function chooseProduct(
  needId: string,
  productId: string | null,
  userId: string,
  database: typeof db = db,
): Promise<Result<void>> {
  if (!isOnline()) {
    return fail(OFFLINE_ERROR)
  }
  if (!supabase) {
    return fail(storageError('simpan'))
  }

  const { error } = await supabase
    .from('shopping_needs')
    .update({ chosen_product_id: productId, updated_at: new Date().toISOString() })
    .eq('id', needId)
    .eq('user_id', userId)

  if (error) return fail(storageError('simpan'))

  try {
    const row = await database.householdNeeds.get(needId)
    if (row && row.user_id === userId) {
      await database.householdNeeds.update(needId, {
        chosen_product_id: productId,
        updated_at: new Date().toISOString(),
      })
    }
  } catch {
    // Cache gagal tidak membatalkan penyimpanan utama.
  }

  return ok(undefined)
}

export async function removeNeed(
  id: string,
  userId: string,
  database: typeof db = db,
): Promise<Result<void>> {
  if (!isOnline()) {
    return fail(OFFLINE_ERROR)
  }
  if (!supabase) {
    return fail(storageError('hapus'))
  }

  const { error } = await supabase
    .from('shopping_needs')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) return fail(storageError('hapus'))

  try {
    await database.transaction('rw', database.householdNeeds, async () => {
      await database.householdNeeds.where('id').equals(id).delete()
    })
  } catch {
    // Cache gagal tidak membatalkan penghapusan utama.
  }

  return ok(undefined)
}

/* ------------------------------------------------------------------ */
/* Produk                                                             */
/* ------------------------------------------------------------------ */

export async function listProducts(
  needId: string,
  userId: string,
  database: typeof db = db,
): Promise<Result<SavedProduct[]>> {
  if (supabase && isOnline()) {
    const { data, error } = await supabase
      .from('saved_products')
      .select('*')
      .eq('need_id', needId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (!error) {
      const rows: CachedSavedProduct[] = (data ?? []).map((row) => ({
        id: row.id,
        user_id: row.user_id,
        need_id: row.need_id,
        title: row.title,
        platform: row.platform,
        store_name: row.store_name,
        url: row.url,
        price: row.price ?? 0,
        pack_size: row.pack_size ?? 0,
        pack_unit: row.pack_unit,
        shipping_cost: row.shipping_cost ?? 0,
        voucher_discount: row.voucher_discount ?? 0,
        note: row.note,
        price_checked_at: row.price_checked_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }))
      try {
        await database.transaction('rw', database.householdProducts, async () => {
          await database.householdProducts
            .where('need_id')
            .equals(needId)
            .delete()
          await database.householdProducts.bulkAdd(rows)
        })
      } catch {
        // Cache gagal tidak memblokir baca.
      }
      return ok(rows.map(productRowToProduct))
    }
  }

  try {
    const rows = await database.householdProducts
      .where('need_id')
      .equals(needId)
      .filter((row) => row.user_id === userId)
      .sortBy('created_at')
    return ok(rows.map(productRowToProduct))
  } catch {
    return fail(storageError('baca'))
  }
}

export async function getProduct(
  id: string,
  userId: string,
  database: typeof db = db,
): Promise<Result<SavedProduct | null>> {
  if (supabase && isOnline()) {
    const { data, error } = await supabase
      .from('saved_products')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle()

    if (!error) {
      if (data) {
        const row: CachedSavedProduct = {
          id: data.id,
          user_id: data.user_id,
          need_id: data.need_id,
          title: data.title,
          platform: data.platform,
          store_name: data.store_name,
          url: data.url,
          price: data.price ?? 0,
          pack_size: data.pack_size ?? 0,
          pack_unit: data.pack_unit,
          shipping_cost: data.shipping_cost ?? 0,
          voucher_discount: data.voucher_discount ?? 0,
          note: data.note,
          price_checked_at: data.price_checked_at,
          created_at: data.created_at,
          updated_at: data.updated_at,
        }
        try {
          await database.householdProducts.put(row)
        } catch {
          // Cache gagal tidak memblokir baca.
        }
        return ok(productRowToProduct(row))
      }
      return ok(null)
    }
  }

  try {
    const row = await database.householdProducts.get(id)
    if (!row || row.user_id !== userId) return ok(null)
    return ok(productRowToProduct(row))
  } catch {
    return fail(storageError('baca'))
  }
}

export async function createProduct(
  needId: string,
  userId: string,
  input: CreateProductInput,
  database: typeof db = db,
): Promise<Result<SavedProduct>> {
  if (!isOnline()) {
    return fail(OFFLINE_ERROR)
  }
  if (!supabase) {
    return fail(storageError('simpan'))
  }

  const normalized = normalizeUrlStrict(input.url)
  if ('error' in normalized) {
    return fail({
      field: 'url',
      code: 'URL_TIDAK_VALID',
      message: normalized.error,
    })
  }

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('saved_products')
    .insert({
      user_id: userId,
      need_id: needId,
      title: input.title,
      platform: input.platform ?? 'Lainnya',
      store_name: input.store_name ?? null,
      url: normalized.url,
      price: input.price ?? 0,
      pack_size: input.pack_size ?? 0,
      pack_unit: input.pack_unit ?? 'pcs',
      shipping_cost: input.shipping_cost ?? 0,
      voucher_discount: input.voucher_discount ?? 0,
      note: input.note ?? null,
      price_checked_at: input.price_checked_at ?? now,
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single()

  if (error) return fail(storageError('simpan'))

  const row: CachedSavedProduct = {
    id: data.id,
    user_id: data.user_id,
    need_id: data.need_id,
    title: data.title,
    platform: data.platform,
    store_name: data.store_name,
    url: data.url,
    price: data.price ?? 0,
    pack_size: data.pack_size ?? 0,
    pack_unit: data.pack_unit,
    shipping_cost: data.shipping_cost ?? 0,
    voucher_discount: data.voucher_discount ?? 0,
    note: data.note,
    price_checked_at: data.price_checked_at,
    created_at: data.created_at,
    updated_at: data.updated_at,
  }

  try {
    await database.householdProducts.put(row)
  } catch {
    // Cache gagal tidak membatalkan penyimpanan utama.
  }

  return ok(productRowToProduct(row))
}

export async function updateProduct(
  id: string,
  userId: string,
  patch: UpdateProductInput,
  database: typeof db = db,
): Promise<Result<SavedProduct>> {
  if (!isOnline()) {
    return fail(OFFLINE_ERROR)
  }
  if (!supabase) {
    return fail(storageError('simpan'))
  }

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (patch.title !== undefined) update.title = patch.title
  if (patch.platform !== undefined) update.platform = patch.platform
  if (patch.store_name !== undefined) update.store_name = patch.store_name
  if (patch.url !== undefined) {
    const normalized = normalizeUrlStrict(patch.url)
    if ('error' in normalized) {
      return fail({
        field: 'url',
        code: 'URL_TIDAK_VALID',
        message: normalized.error,
      })
    }
    update.url = normalized.url
  }
  if (patch.price !== undefined) update.price = patch.price
  if (patch.pack_size !== undefined) update.pack_size = patch.pack_size
  if (patch.pack_unit !== undefined) update.pack_unit = patch.pack_unit
  if (patch.shipping_cost !== undefined)
    update.shipping_cost = patch.shipping_cost
  if (patch.voucher_discount !== undefined)
    update.voucher_discount = patch.voucher_discount
  if (patch.note !== undefined) update.note = patch.note
  if (patch.price_checked_at !== undefined)
    update.price_checked_at = patch.price_checked_at

  const { data, error } = await supabase
    .from('saved_products')
    .update(update)
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error) return fail(storageError('simpan'))

  const row: CachedSavedProduct = {
    id: data.id,
    user_id: data.user_id,
    need_id: data.need_id,
    title: data.title,
    platform: data.platform,
    store_name: data.store_name,
    url: data.url,
    price: data.price ?? 0,
    pack_size: data.pack_size ?? 0,
    pack_unit: data.pack_unit,
    shipping_cost: data.shipping_cost ?? 0,
    voucher_discount: data.voucher_discount ?? 0,
    note: data.note,
    price_checked_at: data.price_checked_at,
    created_at: data.created_at,
    updated_at: data.updated_at,
  }

  try {
    await database.householdProducts.put(row)
  } catch {
    // Cache gagal tidak membatalkan penyimpanan utama.
  }

  return ok(productRowToProduct(row))
}

export async function removeProduct(
  id: string,
  userId: string,
  database: typeof db = db,
): Promise<Result<void>> {
  if (!isOnline()) {
    return fail(OFFLINE_ERROR)
  }
  if (!supabase) {
    return fail(storageError('hapus'))
  }

  const { error } = await supabase
    .from('saved_products')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) return fail(storageError('hapus'))

  try {
    await database.householdProducts.where('id').equals(id).delete()
  } catch {
    // Cache gagal tidak membatalkan penghapusan utama.
  }

  return ok(undefined)
}

/* ------------------------------------------------------------------ */
/* Anggaran                                                           */
/* ------------------------------------------------------------------ */

export async function getBudget(
  userId: string,
  database: typeof db = db,
): Promise<Result<HouseholdBudget | null>> {
  if (supabase && isOnline()) {
    const { data, error } = await supabase
      .from('household_budgets')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (!error) {
      if (data) {
        const row: CachedHouseholdBudget = {
          user_id: data.user_id,
          monthly_budget: data.monthly_budget ?? 0,
          updated_at: data.updated_at,
        }
        try {
          await database.householdBudgetsCache.put(row)
        } catch {
          // Cache gagal tidak memblokir baca.
        }
        return ok(budgetRowToBudget(row))
      }
      return ok(null)
    }
  }

  try {
    const row = await database.householdBudgetsCache.get(userId)
    if (!row) return ok(null)
    return ok(budgetRowToBudget(row))
  } catch {
    return fail(storageError('baca'))
  }
}

export async function setBudget(
  userId: string,
  monthlyBudget: number,
  database: typeof db = db,
): Promise<Result<HouseholdBudget>> {
  if (!isOnline()) {
    return fail(OFFLINE_ERROR)
  }
  if (!supabase) {
    return fail(storageError('simpan'))
  }

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('household_budgets')
    .upsert(
      {
        user_id: userId,
        monthly_budget: monthlyBudget,
        updated_at: now,
      },
      { onConflict: 'user_id' },
    )
    .select('*')
    .single()

  if (error) return fail(storageError('simpan'))

  const row: CachedHouseholdBudget = {
    user_id: data.user_id,
    monthly_budget: data.monthly_budget ?? 0,
    updated_at: data.updated_at,
  }

  try {
    await database.householdBudgetsCache.put(row)
  } catch {
    // Cache gagal tidak membatalkan penyimpanan utama.
  }

  return ok(budgetRowToBudget(row))
}

/* ------------------------------------------------------------------ */
/* Helper                                                             */
/* ------------------------------------------------------------------ */

function normalizeUrlStrict(url: string): { url: string } | { error: string } {
  return normalizeUrl(url)
}
