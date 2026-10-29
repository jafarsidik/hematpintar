import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_AUTH_EMAIL_DOMAIN,
  authEmailDomain,
  normalizeUsername,
  usernameToEmail,
} from './username'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('username auth', () => {
  it('membentuk email dari username dan domain environment', () => {
    vi.stubEnv('VITE_AUTH_EMAIL_DOMAIN', 'contoh.test')

    expect(usernameToEmail('budi')).toBe('budi@contoh.test')
    expect(usernameToEmail(' Budi_01 ')).toBe('budi_01@contoh.test')
  })

  it('memakai domain bawaan bila environment kosong', () => {
    vi.stubEnv('VITE_AUTH_EMAIL_DOMAIN', '')

    expect(authEmailDomain()).toBe(DEFAULT_AUTH_EMAIL_DOMAIN)
    expect(usernameToEmail('budi')).toBe(
      `budi@${DEFAULT_AUTH_EMAIL_DOMAIN}`,
    )
  })

  it('menormalkan username menjadi huruf kecil tanpa spasi tepi', () => {
    expect(normalizeUsername('  Budi_01  ')).toBe('budi_01')
  })
})
