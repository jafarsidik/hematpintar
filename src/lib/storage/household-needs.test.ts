import 'fake-indexeddb/auto'
import Dexie from 'dexie'
declare module '@/lib/supabase/client' {
  export function __calls(): string[]
  export function __clearCalls(): void
  export const __query: { lastData: any; lastError: any }
}

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { expectErr, expectOk } from '@/lib/calc/test-helpers'
import {
  __calls,
  __clearCalls,
  __query,
  supabase,
} from '@/lib/supabase/client'
import { createDatabase, type HematPintarDatabase } from './db'
import {
  createNeed,
  createProduct,
  getBudget,
  listNeeds,
  removeNeed,
  setBudget,
  type CreateNeedInput,
  type CreateProductInput,
  type HouseholdBudget,
  type SavedProduct,
  type ShoppingNeed,
} from './household-needs'

vi.mock('@/lib/supabase/client', () => {
  const fromCalls: string[] = []

  const sharedQuery = {
    lastData: null,
    lastError: null,
    select: vi.fn().mockReturnThis(),
    eq: vi.fn(function (this: any, col: string, val: any) {
      fromCalls.push(`eq:${col}=${String(val)}`)
      return this
    }),
    order: vi.fn().mockReturnThis(),
    insert: vi.fn(function (this: any, row: any) {
      fromCalls.push(`insert:${JSON.stringify(row)}`)
      return this
    }),
    update: vi.fn(function (this: any, patch: any) {
      fromCalls.push(`update:${JSON.stringify(patch)}`)
      return this
    }),
    upsert: vi.fn(function (this: any, row: any) {
      fromCalls.push(`upsert:${JSON.stringify(row)}`)
      return this
    }),
    delete: vi.fn(function (this: any) {
      fromCalls.push('delete:')
      return this
    }),
    then: (resolve: (value: any) => void) =>
      resolve({ data: sharedQuery.lastData, error: sharedQuery.lastError }),
    single: vi.fn(async () => ({
      data: sharedQuery.lastData,
      error: sharedQuery.lastError,
    })),
    maybeSingle: vi.fn(async () => ({
      data: sharedQuery.lastData,
      error: sharedQuery.lastError,
    })),
  }

  const mockFrom = vi.fn((table: string) => {
    fromCalls.push(`from:${table}`)
    return sharedQuery
  })

  return {
    supabase: { from: mockFrom } as any,
    isSupabaseConfigured: true,
    __query: sharedQuery,
    __calls: () => [...fromCalls],
    __clearCalls: () => {
      fromCalls.length = 0
    },
  }
})

const USER_ID = '11111111-1111-1111-1111-111111111111'

let databases: HematPintarDatabase[] = []

function newDb(): HematPintarDatabase {
  return createDatabase(`hematpintar-household-test-${crypto.randomUUID()}`)
}

function needInput(overrides: Partial<CreateNeedInput> = {}): CreateNeedInput {
  return { name: 'Kebutuhan Beras', ...overrides }
}

function productInput(overrides: Partial<CreateProductInput> = {}): CreateProductInput {
  return {
    title: 'Beras A',
    url: 'https://shopee.co.id/produk/a',
    pack_size: 5,
    pack_unit: 'kg',
    price: 75_000,
    shipping_cost: 10_000,
    voucher_discount: 3_000,
    ...overrides,
  }
}

function setResult(data: any, error: any = null): void {
  __query.lastData = data
  __query.lastError = error
}

function calls(): string[] {
  return __calls()
}

function fromMock(): ReturnType<typeof vi.fn> {
  return vi.mocked(supabase!.from)
}

beforeEach(() => {
  databases = []
  setResult(null, null)
  __clearCalls()
  fromMock().mockClear()
  Object.defineProperty(navigator, 'onLine', {
    value: true,
    configurable: true,
  })
})

afterEach(async () => {
  for (const database of databases) {
    database.close()
    await Dexie.delete(database.name)
  }
})

describe('household needs repository', () => {
  it('membuat kebutuhan dan menyimpan ke Supabase serta cache', async () => {
    const db = newDb()
    databases.push(db)
    const created: ShoppingNeed = {
      id: 'need-1',
      user_id: USER_ID,
      name: 'Kebutuhan Beras',
      target_qty: 5,
      unit: 'kg',
      chosen_product_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    setResult(created, null)
    const result = await createNeed(USER_ID, needInput(), db)
    const need = expectOk(result)

    expect(need.id).toBe('need-1')
    expect(need.name).toBe('Kebutuhan Beras')
    expect(need.unit).toBe('kg')
    const callList = calls()
    expect(callList.some((call) => call.startsWith('from:shopping_needs'))).toBe(true)
    expect(callList.some((call) => call.startsWith('insert:'))).toBe(true)

    setResult([created], null)
    const cached = expectOk(await listNeeds(USER_ID, db))
    expect(cached.map((n) => n.id)).toContain('need-1')
  })

  it('menolak pembuatan kebutuhan saat offline dan tidak memanggil Supabase', async () => {
    const db = newDb()
    databases.push(db)
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      configurable: true,
    })

    const result = await createNeed(USER_ID, needInput(), db)

    expectErr(result, 'OFFLINE')
    expect(calls().length).toBe(0)
  })

  it('membaca kebutuhan dari cache bila offline', async () => {
    const db = newDb()
    databases.push(db)
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      configurable: true,
    })
    await db.householdNeeds.add({
      id: 'need-cache',
      user_id: USER_ID,
      name: 'Cache Only',
      target_qty: 2,
      unit: 'kg',
      chosen_product_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    const result = await listNeeds(USER_ID, db)
    const needs = expectOk(result)

    expect(needs.map((n) => n.id)).toEqual(['need-cache'])
    expect(calls().length).toBe(0)
  })

  it('membuat produk dan menerima URL aman', async () => {
    const db = newDb()
    databases.push(db)
    const created: SavedProduct = {
      id: 'prod-1',
      user_id: USER_ID,
      need_id: 'need-1',
      title: 'Beras A',
      platform: 'Shopee',
      store_name: null,
      url: 'https://shopee.co.id/produk/a',
      price: 75_000,
      pack_size: 5,
      pack_unit: 'kg',
      shipping_cost: 10_000,
      voucher_discount: 3_000,
      note: null,
      price_checked_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    setResult(created, null)
    const result = await createProduct('need-1', USER_ID, productInput(), db)
    const product = expectOk(result)

    expect(product.title).toBe('Beras A')
    expect(product.platform).toBe('Shopee')
    expect(product.url).toBe('https://shopee.co.id/produk/a')
    const callList = calls()
    expect(callList.some((call) => call.startsWith('from:saved_products'))).toBe(true)
  })

  it('menolak produk dengan URL berbahaya tanpa memanggil Supabase', async () => {
    const db = newDb()
    databases.push(db)

    const result = await createProduct(
      'need-1',
      USER_ID,
      productInput({ url: 'javascript:alert(1)' }),
      db,
    )

    expectErr(result, 'URL_TIDAK_VALID')
    expect(calls().length).toBe(0)
  })

  it('menghapus kebutuhan', async () => {
    const db = newDb()
    databases.push(db)
    setResult(null, null)

    const result = await removeNeed('need-1', USER_ID, db)
    expectOk(result)

    const callList = calls()
    expect(callList.some((call) => call.startsWith('from:shopping_needs'))).toBe(true)
    expect(callList.some((call) => call.startsWith('delete:'))).toBe(true)
  })

  it('menyimpan dan membaca anggaran bulanan', async () => {
    const db = newDb()
    databases.push(db)
    const budgetRow: HouseholdBudget = {
      user_id: USER_ID,
      monthly_budget: 500_000,
      updated_at: new Date().toISOString(),
    }

    setResult(budgetRow, null)
    const saveResult = await setBudget(USER_ID, 500_000, db)
    expectOk(saveResult)

    setResult(budgetRow, null)
    const getResult = await getBudget(USER_ID, db)
    const budget = expectOk(getResult)
    expect(budget?.monthly_budget).toBe(500_000)
  })
})
