import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  supabase: supabaseMock,
  isSupabaseConfigured: true,
}))

import { useAuthStore } from './auth'
import { resolvePlan, useEntitlementStore } from './entitlements'

const USER_ID = '11111111-1111-4111-8111-111111111111'

const session = {
  access_token: 'token',
  refresh_token: 'refresh',
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: USER_ID,
    email: 'budi@contoh.test',
    user_metadata: { username: 'budi' },
  },
} as unknown as Session

function signInUser(): void {
  useAuthStore().session = session
}

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
  supabaseMock.from.mockReset()
})

describe('resolvePlan', () => {
  it('mempertahankan free dan menurunkan plan kedaluwarsa', () => {
    expect(resolvePlan('free', null)).toBe('free')
    expect(resolvePlan('plus', null)).toBe('plus')
    expect(resolvePlan('plus', '2000-01-01T00:00:00.000Z')).toBe('free')
    expect(resolvePlan('business', '2999-01-01T00:00:00.000Z')).toBe(
      'business',
    )
    expect(resolvePlan('unknown', '2999-01-01T00:00:00.000Z')).toBe('free')
  })
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
    signInUser()
    const chain = mockEntitlement({
      plan: 'plus',
      valid_until: '2000-01-01T00:00:00.000Z',
    })

    const store = useEntitlementStore()
    await store.refresh()

    expect(chain.eq).toHaveBeenCalledWith('user_id', USER_ID)
    expect(store.plan).toBe('free')
    expect(store.isPremium).toBe(false)
  })

  it('memakai plan plus yang masih aktif', async () => {
    signInUser()
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
    signInUser()
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
    signInUser()
    mockEntitlement({
      plan: 'plus',
      valid_until: '2999-12-31T23:59:59.000Z',
    })
    const authStore = useAuthStore()
    const store = useEntitlementStore()

    await store.refresh()
    expect(store.plan).toBe('plus')

    authStore.session = null
    await store.refresh()

    expect(store.plan).toBe('free')
    expect(store.isPremium).toBe(false)
    expect(supabaseMock.from).toHaveBeenCalledOnce()
  })

  it('memakai free bila baris entitlement tidak ditemukan', async () => {
    signInUser()
    mockEntitlement(null)

    const store = useEntitlementStore()
    await store.refresh()

    expect(store.plan).toBe('free')
  })
})
