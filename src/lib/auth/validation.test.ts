import { describe, expect, it } from 'vitest'
import { passwordSchema, signUpSchema, usernameSchema } from './validation'

describe('validasi username', () => {
  it('menerima huruf kecil, angka, dan underscore 3-20 karakter', () => {
    expect(usernameSchema.safeParse('budi').success).toBe(true)
    expect(usernameSchema.safeParse('budi_01').success).toBe(true)
    expect(usernameSchema.safeParse('a'.repeat(20)).success).toBe(true)
  })

  it('menormalkan spasi dan huruf besar sebelum divalidasi', () => {
    const result = usernameSchema.safeParse('  Budi_01  ')

    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toBe('budi_01')
  })

  it('menolak username terlalu pendek, terlalu panjang, atau bersimbol', () => {
    expect(usernameSchema.safeParse('ab').success).toBe(false)
    expect(usernameSchema.safeParse('a'.repeat(21)).success).toBe(false)
    expect(usernameSchema.safeParse('budi-01').success).toBe(false)
    expect(usernameSchema.safeParse('budi 01').success).toBe(false)
    expect(usernameSchema.safeParse('budi@01').success).toBe(false)
  })
})

describe('validasi password', () => {
  it('menerima password minimal 8 karakter', () => {
    expect(passwordSchema.safeParse('12345678').success).toBe(true)
  })

  it('menolak password kurang dari 8 karakter', () => {
    const result = passwordSchema.safeParse('1234567')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        'Password minimal 8 karakter.',
      )
    }
  })
})

describe('validasi pendaftaran', () => {
  it('memvalidasi username dan password sekaligus', () => {
    expect(
      signUpSchema.safeParse({ username: 'Budi_01', password: '12345678' })
        .success,
    ).toBe(true)
    expect(
      signUpSchema.safeParse({ username: 'ab', password: '12345678' }).success,
    ).toBe(false)
    expect(
      signUpSchema.safeParse({ username: 'budi', password: '1234567' }).success,
    ).toBe(false)
  })
})
