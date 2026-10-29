import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const authState = vi.hoisted(() => ({
  user: null as { id: string } | null,
}))

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => authState,
}))

vi.mock('@/lib/supabase/client', () => ({
  supabase: supabaseMock,
  isSupabaseConfigured: true,
}))

import { useEntitlementStore } from './entitlements'

function mockEntitlement(
  data: { plan: string; valid_until: string | null } | null,
) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error: null })
  const eq = vi.fn().mockReturnValue({ maybeSingle })
  const select = vi.fn().mockReturnValue({ eq })
  supabaseMock.from.mockReturnValue({ select })
  return { maybeSingle, eq, select }
}

beforeEach(() => {
  setActivePinia(createPinia())
  authState.user = null
  supabaseMock.from.mockReset()
})

describe('entitlement store', () => {
  it('memakai plan free tanpa login dan tidak memanggil Supabase', async () => {
    const store = useEntitlementStore()

    await store.refresh()

    expect(store.plan).toBe('free')
    expect(store.isPremium).toBe(false)
    expect(supabaseMock.from).not.toHaveBeenCalled()
  })

  it('menurunkan plan kedaluwarsa menjadi free', async () => {
    authState.user = { id: '11111111-1111-4111-8111-111111111111' }
    const chain = mockEntitlement({
      plan: 'plus',
      valid_until: '2000-01-01T00:00:00.000Z',
    })

    const store = useEntitlementStore()
    await store.refresh()

    expect(chain.eq).toHaveBeenCalledWith(
      'user_id',
      '11111111-1111-4111-8111-111111111111',
    )
    expect(store.plan).toBe('free')
    expect(store.isPremium).toBe(false)
  })

  it('memakai plan plus yang masih aktif', async () => {
    authState.user = { id: '11111111-1111-4111-8111-111111111111' }
    mockEntitlement({
      plan: 'plus',
      valid_until: '2999-12-31T23:59:59.000Z',
    })

    const store = useEntitlementStore()
    await store.refresh()

    expect(store.plan).toBe('plus')
    expect(store.isPremium).toBe(true)
    expect(store.planLabel).toBe('Plus')
  })

  it('memakai plan business yang masih aktif', async () => {
    authState.user = { id: '11111111-1111-4111-8111-111111111111' }
    mockEntitlement({
      plan: 'business',
      valid_until: '2999-12-31T23:59:59.000Z',
    })

    const store = useEntitlementStore()
    await store.refresh()

    expect(store.plan).toBe('business')
    expect(store.planLabel).toBe('Bisnis')
  })

  it('kembali ke free saat pengguna keluar', async () => {
    authState.user = { id: '11111111-1111-4111-8111-111111111111' }
    mockEntitlement({
      plan: 'plus',
      valid_until: '2999-12-31T23:59:59.000Z',
    })

    const store = useEntitlementStore()
    await store.refresh()
    expect(store.plan).toBe('plus')

    authState.user = null
    await store.refresh()

    expect(store.plan).toBe('free')
    expect(store.isPremium).toBe(false)
    expect(supabaseMock.from).toHaveBeenCalledOnce()
  })

  it('memakai free bila baris entitlement tidak ditemukan', async () => {
    authState.user = { id: '11111111-1111-4111-8111-111111111111' }
    mockEntitlement(null)

    const store = useEntitlementStore()
    await store.refresh()

    expect(store.plan).toBe('free')
  })
})
