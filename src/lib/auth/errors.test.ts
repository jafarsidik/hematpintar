import { describe, expect, it } from 'vitest'
import {
  GENERIC_LOGIN_ERROR,
  mapAuthError,
  mapChangePasswordError,
  mapLoginError,
  mapSignUpError,
} from './errors'

describe('pemetaan error autentikasi', () => {
  it('memetakan email yang sudah dipakai', () => {
    expect(mapSignUpError({ message: 'User already registered' })).toBe(
      'Email sudah terdaftar.',
    )
    expect(
      mapSignUpError(
        'duplicate key value violates unique constraint "entitlements_email_key"',
      ),
    ).toBe('Email sudah terdaftar.')
    expect(mapSignUpError('Database error saving new user')).toBe(
      'Email sudah terdaftar.',
    )
  })

  it('memetakan password lemah', () => {
    expect(mapSignUpError('Password should be at least 6 characters')).toBe(
      'Password minimal 8 karakter.',
    )
  })

  it('memetakan rate limit dan jaringan', () => {
    expect(mapSignUpError('email rate limit exceeded')).toContain(
      'Terlalu banyak percobaan',
    )
    expect(mapSignUpError('Failed to fetch')).toContain('koneksi internet')
  })

  it('selalu memakai pesan umum untuk login gagal', () => {
    expect(mapLoginError()).toBe(GENERIC_LOGIN_ERROR)
    expect(mapLoginError()).toBe('Email atau password salah.')
  })

  it('memetakan password saat ini yang salah dan password baru yang sama', () => {
    expect(mapChangePasswordError('Invalid login credentials')).toBe(
      'Password saat ini salah.',
    )
    expect(
      mapChangePasswordError(
        'New password should be different from the old password.',
      ),
    ).toBe('Password baru harus berbeda dari password saat ini.')
  })

  it('memakai pesan umum untuk error yang tidak dikenal', () => {
    expect(mapAuthError('unknown')).toContain('akun')
    expect(mapAuthError('unknown')).toContain('Coba lagi')
  })
})
