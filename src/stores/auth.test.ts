import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const supabaseMock = vi.hoisted(() => ({
  auth: {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    signInWithOtp: vi.fn(),
    signOut: vi.fn(),
  },
}))

vi.mock('@/lib/supabase/client', () => ({
  supabase: supabaseMock,
  isSupabaseConfigured: true,
}))

import { mapAuthError, useAuthStore } from './auth'

const session = {
  access_token: 'token',
  refresh_token: 'refresh',
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'ibu@example.com',
  },
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  supabaseMock.auth.getSession.mockResolvedValue({
    data: { session: null },
    error: null,
  })
  supabaseMock.auth.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  })
  supabaseMock.auth.signInWithOtp.mockResolvedValue({ error: null })
  supabaseMock.auth.signOut.mockResolvedValue({ error: null })
})

describe('auth store', () => {
  it('memuat sesi awal dan berlangganan perubahan auth', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({
      data: { session },
      error: null,
    })

    const store = useAuthStore()
    await store.initialize()

    expect(store.session).toEqual(session)
    expect(store.isAuthenticated).toBe(true)
    expect(store.email).toBe('ibu@example.com')
    expect(store.loading).toBe(false)
    expect(supabaseMock.auth.onAuthStateChange).toHaveBeenCalledOnce()
  })

  it('tetap selesai tanpa crash bila pemeriksaan sesi gagal', async () => {
    supabaseMock.auth.getSession.mockRejectedValue(new Error('network down'))

    const store = useAuthStore()

    await expect(store.initialize()).resolves.toBeUndefined()
    expect(store.loading).toBe(false)
    expect(store.initialized).toBe(true)
    expect(store.error).toContain('Sesi akun tidak dapat diperiksa')
  })

  it('menolak email tidak valid tanpa memanggil Supabase', async () => {
    const store = useAuthStore()

    const result = await store.login('bukan-email')

    expect(result).toBe(false)
    expect(store.error).toBe('Masukkan alamat email yang valid.')
    expect(supabaseMock.auth.signInWithOtp).not.toHaveBeenCalled()
  })

  it('mengirim magic link untuk email valid', async () => {
    const store = useAuthStore()

    const result = await store.login(' ibu@example.com ')

    expect(result).toBe(true)
    expect(store.submitting).toBe(false)
    expect(supabaseMock.auth.signInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'ibu@example.com' }),
    )
  })

  it('menangani kegagalan jaringan saat mengirim tautan', async () => {
    supabaseMock.auth.signInWithOtp.mockRejectedValue(new Error('network down'))

    const store = useAuthStore()
    const result = await store.login('ibu@example.com')

    expect(result).toBe(false)
    expect(store.submitting).toBe(false)
    expect(store.error).toContain('Tidak dapat menghubungi server')
  })

  it('menampilkan pesan Bahasa Indonesia saat pengiriman gagal', async () => {
    supabaseMock.auth.signInWithOtp.mockResolvedValue({
      error: { message: 'Rate limit exceeded' },
    })

    const store = useAuthStore()
    const result = await store.login('ibu@example.com')

    expect(result).toBe(false)
    expect(store.error).toContain('Terlalu banyak percobaan')
  })

  it('menangani kegagalan jaringan saat logout tanpa mengubah sesi', async () => {
    supabaseMock.auth.signOut.mockRejectedValue(new Error('network down'))

    const store = useAuthStore()
    store.session = session as never

    const result = await store.logout()

    expect(result).toBe(false)
    expect(store.submitting).toBe(false)
    expect(store.session).toEqual(session)
    expect(store.error).toContain('Tidak dapat menghubungi server')
  })

  it('logout membersihkan sesi lokal', async () => {
    const store = useAuthStore()
    store.session = session as never

    const result = await store.logout()

    expect(result).toBe(true)
    expect(supabaseMock.auth.signOut).toHaveBeenCalledOnce()
    expect(store.session).toBeNull()
  })
})

describe('mapAuthError', () => {
  it('menerjemahkan error umum ke Bahasa Indonesia', () => {
    expect(mapAuthError('Invalid email address')).toBe(
      'Alamat email tidak valid.',
    )
    expect(mapAuthError('Failed to fetch')).toContain('koneksi internet')
    expect(mapAuthError('unknown')).toBe(
      'Login gagal. Periksa email lalu coba lagi.',
    )
  })
})
