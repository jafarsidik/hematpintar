import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Session, User } from '@supabase/supabase-js'

const supabaseMock = vi.hoisted(() => ({
  auth: {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    getUser: vi.fn(),
    updateUser: vi.fn(),
    resetPasswordForEmail: vi.fn(),
  },
}))

vi.mock('@/lib/supabase/client', () => ({
  supabase: supabaseMock,
  isSupabaseConfigured: true,
}))

import { changePassword, signIn, signOut, signUp, resetPasswordForEmail } from './service'

const user = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'budi@contoh.test',
} as unknown as User

const session = {
  access_token: 'token',
  refresh_token: 'refresh',
  expires_in: 3600,
  token_type: 'bearer',
  user,
} as unknown as Session

beforeEach(() => {
  vi.clearAllMocks()
  supabaseMock.auth.signUp.mockResolvedValue({
    data: { user, session },
    error: null,
  })
  supabaseMock.auth.signInWithPassword.mockResolvedValue({
    data: { user, session },
    error: null,
  })
  supabaseMock.auth.signOut.mockResolvedValue({ error: null })
  supabaseMock.auth.getUser.mockResolvedValue({
    data: { user },
    error: null,
  })
  supabaseMock.auth.updateUser.mockResolvedValue({
    data: { user },
    error: null,
  })
  supabaseMock.auth.resetPasswordForEmail.mockResolvedValue({ error: null })
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('auth service', () => {
  it('mendaftar dengan email dan password', async () => {
    const result = await signUp(' Budi_01@Contoh.Test ', '12345678')

    expect(result.ok).toBe(true)
    expect(supabaseMock.auth.signUp).toHaveBeenCalledWith({
      email: 'budi_01@contoh.test',
      password: '12345678',
    })
  })

  it('menolak pendaftaran tidak valid tanpa memanggil Supabase', async () => {
    const badEmail = await signUp('budi', '12345678')
    const shortPassword = await signUp('budi@contoh.test', '1234567')

    expect(badEmail.ok).toBe(false)
    expect(shortPassword.ok).toBe(false)
    expect(supabaseMock.auth.signUp).not.toHaveBeenCalled()
  })

  it('memetakan email yang sudah dipakai saat mendaftar', async () => {
    supabaseMock.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'User already registered', code: 'user_already_exists' },
    })

    const result = await signUp('budi@contoh.test', '12345678')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors[0]?.message).toBe('Email sudah terdaftar.')
    }
  })

  it('memetakan identitas kosong Supabase sebagai email yang sudah dipakai', async () => {
    supabaseMock.auth.signUp.mockResolvedValue({
      data: {
        user: { ...user, identities: [] },
        session: null,
      },
      error: null,
    })

    const result = await signUp('budi@contoh.test', '12345678')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors[0]?.message).toBe('Email sudah terdaftar.')
    }
  })

  it('masuk dengan email dan password', async () => {
    const result = await signIn('Budi@Contoh.Test', '12345678')

    expect(result.ok).toBe(true)
    expect(supabaseMock.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'budi@contoh.test',
      password: '12345678',
    })
  })

  it('selalu memakai pesan umum saat login gagal', async () => {
    supabaseMock.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    })

    const result = await signIn('budi@contoh.test', '12345678')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors[0]?.message).toBe('Email atau password salah.')
    }
  })

  it('memakai pesan umum untuk email atau password yang tidak valid', async () => {
    const badEmail = await signIn('budi-01', '12345678')
    const badPassword = await signIn('budi@contoh.test', '1234567')

    expect(badEmail.ok).toBe(false)
    expect(badPassword.ok).toBe(false)
    expect(supabaseMock.auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('keluar dari sesi Supabase', async () => {
    const result = await signOut()

    expect(result.ok).toBe(true)
    expect(supabaseMock.auth.signOut).toHaveBeenCalledOnce()
  })

  it('mengganti password setelah memverifikasi password saat ini', async () => {
    const result = await changePassword('lama1234', 'baru12345')

    expect(result.ok).toBe(true)
    expect(supabaseMock.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'budi@contoh.test',
      password: 'lama1234',
    })
    expect(supabaseMock.auth.updateUser).toHaveBeenCalledWith({
      password: 'baru12345',
    })
  })

  it('menolak password saat ini yang salah tanpa mengubah password', async () => {
    supabaseMock.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    })

    const result = await changePassword('salah123', 'baru12345')

    expect(result.ok).toBe(false)
    expect(supabaseMock.auth.updateUser).not.toHaveBeenCalled()
    if (!result.ok) {
      expect(result.errors[0]?.message).toBe('Password saat ini salah.')
    }
  })

  it('menolak password baru yang kurang dari 8 karakter', async () => {
    const result = await changePassword('lama1234', 'baru123')

    expect(result.ok).toBe(false)
    expect(supabaseMock.auth.getUser).not.toHaveBeenCalled()
    expect(supabaseMock.auth.updateUser).not.toHaveBeenCalled()
  })

  it('menolak password baru yang sama dengan password lama', async () => {
    supabaseMock.auth.updateUser.mockResolvedValue({
      data: { user: null },
      error: {
        message: 'New password should be different from the old password.',
        code: 'same_password',
      },
    })

    const result = await changePassword('lama1234', 'lama1234')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors[0]?.message).toBe(
        'Password baru harus berbeda dari password saat ini.',
      )
    }
  })

  it('mengirim email reset password bila dikonfigurasi', async () => {
    const result = await resetPasswordForEmail('budi@contoh.test')

    expect(result.ok).toBe(true)
    expect(supabaseMock.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'budi@contoh.test',
      expect.objectContaining({ redirectTo: '/reset-password' }),
    )
  })

  it('menolak email reset yang tidak valid', async () => {
    const result = await resetPasswordForEmail('bukan-email')

    expect(result.ok).toBe(false)
    expect(supabaseMock.auth.resetPasswordForEmail).not.toHaveBeenCalled()
  })
})
