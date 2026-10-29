import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useHouseholdStore } from './household'

const USER_ID = '11111111-1111-1111-1111-111111111111'

const mockAuth = {
  user: { id: USER_ID } as { id: string } | null,
  isAuthenticated: true,
}

vi.mock('./auth', () => ({
  useAuthStore: () => mockAuth,
}))

vi.mock('@/lib/storage/household-needs', () => ({
  listNeeds: vi.fn(),
  createNeed: vi.fn(),
  updateNeed: vi.fn(),
  chooseProduct: vi.fn(),
  listProducts: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  removeNeed: vi.fn(),
  removeProduct: vi.fn(),
  getBudget: vi.fn(),
  setBudget: vi.fn(),
}))

import {
  chooseProduct,
  createNeed,
  createProduct,
  getBudget,
  listNeeds,
  listProducts,
  removeNeed,
  removeProduct,
  setBudget,
  updateNeed,
  updateProduct,
} from '@/lib/storage/household-needs'

const mockListNeeds = vi.mocked(listNeeds)
const mockCreateNeed = vi.mocked(createNeed)
const mockUpdateNeed = vi.mocked(updateNeed)
const mockChooseProduct = vi.mocked(chooseProduct)
const mockListProducts = vi.mocked(listProducts)
const mockCreateProduct = vi.mocked(createProduct)
const mockUpdateProduct = vi.mocked(updateProduct)
const mockRemoveNeed = vi.mocked(removeNeed)
const mockRemoveProduct = vi.mocked(removeProduct)
const mockGetBudget = vi.mocked(getBudget)
const mockSetBudget = vi.mocked(setBudget)

beforeEach(() => {
  setActivePinia(createPinia())
  mockAuth.user = { id: USER_ID }
  mockAuth.isAuthenticated = true
  mockListNeeds.mockReset()
  mockCreateNeed.mockReset()
  mockUpdateNeed.mockReset()
  mockChooseProduct.mockReset()
  mockListProducts.mockReset()
  mockCreateProduct.mockReset()
  mockUpdateProduct.mockReset()
  mockRemoveNeed.mockReset()
  mockRemoveProduct.mockReset()
  mockGetBudget.mockReset()
  mockSetBudget.mockReset()
})

describe('useHouseholdStore', () => {
  it('tidak memuat kebutuhan bila belum login', () => {
    mockAuth.isAuthenticated = false
    mockAuth.user = null

    const store = useHouseholdStore()
    expect(store.isAuthenticated).toBe(false)
    expect(store.userId).toBeNull()
  })

  it('membuat kebutuhan dan menambahkannya ke daftar', async () => {
    const created = {
      id: 'need-1',
      user_id: USER_ID,
      name: 'Beras',
      target_qty: 5,
      unit: 'kg',
      chosen_product_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    mockCreateNeed.mockResolvedValue({ ok: true, value: created })

    const store = useHouseholdStore()
    const result = await store.createNeedItem({ name: 'Beras', target_qty: 5, unit: 'kg' })

    expect(result?.id).toBe('need-1')
    expect(mockCreateNeed).toHaveBeenCalledWith(USER_ID, {
      name: 'Beras',
      target_qty: 5,
      unit: 'kg',
    })
    expect(store.needs).toHaveLength(1)
    expect(store.needs[0]!.name).toBe('Beras')
    expect(store.error).toBeNull()
  })

  it('mengembalikan null dan error bila gagal membuat kebutuhan', async () => {
    mockCreateNeed.mockResolvedValue({
      ok: false,
      errors: [{ field: 'name', code: 'VALIDASI_GAGAL', message: 'Nama wajib diisi.' }],
    })

    const store = useHouseholdStore()
    const result = await store.createNeedItem({ name: '', target_qty: 5, unit: 'kg' })

    expect(result).toBeNull()
    expect(store.error).toContain('Nama wajib diisi.')
  })

  it('memilih produk dan memperbarui chosen_product_id', async () => {
    mockChooseProduct.mockResolvedValue({ ok: true, value: undefined })

    const store = useHouseholdStore()
    store.needs = [
      {
        id: 'need-1',
        user_id: USER_ID,
        name: 'Beras',
        target_qty: 5,
        unit: 'kg',
        chosen_product_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    const ok = await store.chooseNeedProduct('need-1', 'prod-1')
    expect(ok).toBe(true)
    expect(mockChooseProduct).toHaveBeenCalledWith('need-1', 'prod-1', USER_ID)
    expect(store.needs[0]!.chosen_product_id).toBe('prod-1')
  })

  it('menambahkan produk ke daftar produk kebutuhan', async () => {
    const created = {
      id: 'prod-1',
      user_id: USER_ID,
      need_id: 'need-1',
      title: 'Beras A',
      platform: 'Shopee',
      store_name: null,
      url: 'https://shopee.co.id/a',
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
    mockCreateProduct.mockResolvedValue({ ok: true, value: created })

    const store = useHouseholdStore()
    const result = await store.createNeedProduct('need-1', {
      title: 'Beras A',
      url: 'https://shopee.co.id/a',
      pack_size: 5,
      pack_unit: 'kg',
    })

    expect(result?.id).toBe('prod-1')
    expect(store.productsFor('need-1')).toHaveLength(1)
    expect(store.productsFor('need-1')[0]!.title).toBe('Beras A')
  })

  it('menghapus kebutuhan dan produk turunannya', async () => {
    mockRemoveNeed.mockResolvedValue({ ok: true, value: undefined })

    const store = useHouseholdStore()
    store.needs = [
      {
        id: 'need-1',
        user_id: USER_ID,
        name: 'Beras',
        target_qty: 5,
        unit: 'kg',
        chosen_product_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]
    store.productsByNeed = { 'need-1': [] }

    const ok = await store.removeNeedItem('need-1')
    expect(ok).toBe(true)
    expect(store.needs).toHaveLength(0)
    expect(store.productsByNeed['need-1']).toBeUndefined()
  })

  it('menyimpan anggaran bulanan', async () => {
    mockSetBudget.mockResolvedValue({
      ok: true,
      value: { user_id: USER_ID, monthly_budget: 500_000, updated_at: new Date().toISOString() },
    })

    const store = useHouseholdStore()
    const ok = await store.setMonthlyBudget(500_000)

    expect(ok).toBe(true)
    expect(mockSetBudget).toHaveBeenCalledWith(USER_ID, 500_000)
    expect(store.budget?.monthly_budget).toBe(500_000)
  })
})
