import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Session, User } from '@supabase/supabase-js'
import { fail, ok } from '@/lib/calc/result'

const authServiceMock = vi.hoisted(() => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  changePassword: vi.fn(),
}))

const supabaseMock = vi.hoisted(() => ({
  auth: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
  },
  from: vi.fn(),
}))

vi.mock('@/lib/auth', () => authServiceMock)

vi.mock('@/lib/supabase/client', () => ({
  supabase: supabaseMock,
  isSupabaseConfigured: true,
}))

import { useAuthStore } from './auth'

const user = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'budi@contoh.test',
  user_metadata: { username: 'budi' },
} as unknown as User

const session = {
  access_token: 'token',
  refresh_token: 'refresh',
  expires_in: 3600,
  token_type: 'bearer',
  user,
} as unknown as Session

type AuthListener = (event: string, nextSession: Session | null) => void
let authListener: AuthListener | null = null

function mockPlanRow(
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
  vi.clearAllMocks()
  authListener = null
  supabaseMock.auth.getSession.mockResolvedValue({
    data: { session: null },
    error: null,
  })
  supabaseMock.auth.onAuthStateChange.mockImplementation(
    (callback: AuthListener) => {
      authListener = callback
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      }
    },
  )
  mockPlanRow(null)

  authServiceMock.signIn.mockResolvedValue(ok(session))
  authServiceMock.signUp.mockResolvedValue(ok({ user, session }))
  authServiceMock.signOut.mockResolvedValue(ok(undefined))
  authServiceMock.changePassword.mockResolvedValue(ok(undefined))
})

describe('auth store', () => {
  it('memuat sesi awal, email, dan berlangganan perubahan auth', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({
      data: { session },
      error: null,
    })

    const store = useAuthStore()
    await store.initialize()

    expect(store.session).toEqual(session)
    expect(store.isAuthenticated).toBe(true)
    expect(store.email).toBe('budi@contoh.test')
    expect(store.loading).toBe(false)
    expect(supabaseMock.auth.onAuthStateChange).toHaveBeenCalledOnce()
  })

  it('tetap selesai tanpa crash bila pemeriksaan sesi gagal', async () => {
    supabaseMock.auth.getSession.mockRejectedValue(new Error('network down'))

    const store = useAuthStore()
    await store.initialize()

    expect(store.loading).toBe(false)
    expect(store.initialized).toBe(true)
    expect(store.error).toContain('Sesi akun tidak dapat diperiksa')
  })

  it('masuk dan memuat plan dari entitlement', async () => {
    mockPlanRow({
      plan: 'plus',
      valid_until: '2999-12-31T23:59:59.000Z',
    })

    const store = useAuthStore()
    const result = await store.signIn('budi', '12345678')

    expect(result).toBe(true)
    expect(store.session).toEqual(session)
    expect(store.plan).toBe('plus')
    expect(store.error).toBeNull()
    expect(authServiceMock.signIn).toHaveBeenCalledWith('budi', '12345678')
    expect(store.submitting).toBe(false)
  })

  it('menampilkan pesan umum saat login gagal', async () => {
    authServiceMock.signIn.mockResolvedValue(
      fail({
        field: 'auth',
        code: 'AUTH_GAGAL',
        message: 'Username atau password salah.',
      }),
    )

    const store = useAuthStore()
    const result = await store.signIn('budi', '12345678')

    expect(result).toBe(false)
    expect(store.session).toBeNull()
    expect(store.error).toBe('Username atau password salah.')
  })

  it('mendaftar dan memakai sesi bila Supabase langsung memberi sesi', async () => {
    mockPlanRow({ plan: 'plus', valid_until: null })

    const store = useAuthStore()
    const result = await store.signUp('budi', '12345678')

    expect(result).toBe(true)
    expect(store.session).toEqual(session)
    expect(store.plan).toBe('plus')
    expect(authServiceMock.signUp).toHaveBeenCalledWith('budi', '12345678')
  })

  it('tetap berhasil mendaftar walau sesi belum aktif', async () => {
    authServiceMock.signUp.mockResolvedValue(ok({ user, session: null }))

    const store = useAuthStore()
    const result = await store.signUp('budi', '12345678')

    expect(result).toBe(true)
    expect(store.session).toBeNull()
    expect(store.plan).toBe('free')
    expect(supabaseMock.from).not.toHaveBeenCalled()
  })

  it('keluar dan mengembalikan plan ke free', async () => {
    mockPlanRow({ plan: 'plus', valid_until: null })
    const store = useAuthStore()
    await store.signIn('budi', '12345678')

    const result = await store.signOut()

    expect(result).toBe(true)
    expect(store.session).toBeNull()
    expect(store.plan).toBe('free')
    expect(authServiceMock.signOut).toHaveBeenCalledOnce()
  })

  it('mempertahankan sesi bila logout gagal', async () => {
    authServiceMock.signOut.mockResolvedValue(
      fail({
        field: 'auth',
        code: 'AUTH_GAGAL',
        message: 'Tidak dapat menghubungi server.',
      }),
    )
    const store = useAuthStore()
    store.session = session

    const result = await store.signOut()

    expect(result).toBe(false)
    expect(store.session).toEqual(session)
    expect(store.error).toContain('Tidak dapat menghubungi server')
  })

  it('mengganti password dan menampilkan error yang dipetakan', async () => {
    const store = useAuthStore()

    expect(await store.changePassword('lama1234', 'baru12345')).toBe(true)

    authServiceMock.changePassword.mockResolvedValue(
      fail({
        field: 'currentPassword',
        code: 'PASSWORD_LAMA_SALAH',
        message: 'Password saat ini salah.',
      }),
    )

    expect(await store.changePassword('salah', 'baru12345')).toBe(false)
    expect(store.error).toBe('Password saat ini salah.')
  })

  it('membersihkan sesi dan plan saat Supabase mengirim SIGNED_OUT', async () => {
    const store = useAuthStore()
    store.session = session
    store.plan = 'plus'
    await store.initialize()

    authListener?.('SIGNED_OUT', null)

    expect(store.session).toBeNull()
    expect(store.plan).toBe('free')
  })
})
