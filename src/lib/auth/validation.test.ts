import { describe, expect, it } from 'vitest'
import { emailSchema, passwordSchema, signUpSchema } from './validation'

describe('validasi email', () => {
  it('menerima email valid', () => {
    expect(emailSchema.safeParse('budi@contoh.com').success).toBe(true)
    expect(emailSchema.safeParse('  Budi_01@Contoh.COM  ').success).toBe(true)
    if (emailSchema.safeParse('  Budi_01@Contoh.COM  ').success) {
      expect(emailSchema.safeParse('  Budi_01@Contoh.COM  ').data).toBe(
        'budi_01@contoh.com',
      )
    }
  })

  it('menolak email tidak valid', () => {
    expect(emailSchema.safeParse('').success).toBe(false)
    expect(emailSchema.safeParse('budi').success).toBe(false)
    expect(emailSchema.safeParse('budi@').success).toBe(false)
    expect(emailSchema.safeParse('@contoh.com').success).toBe(false)
    expect(emailSchema.safeParse('budi contoh.com').success).toBe(false)
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
  it('memvalidasi email dan password sekaligus', () => {
    expect(
      signUpSchema.safeParse({
        email: 'Budi_01@Contoh.com',
        password: '12345678',
        confirmPassword: '12345678',
      }).success,
    ).toBe(true)
    expect(
      signUpSchema
        .safeParse({ email: 'ab@contoh.com', password: '12345678' })
        .success,
    ).toBe(false)
    expect(
      signUpSchema
        .safeParse({ email: 'budi@contoh.com', password: '1234567' })
        .success,
    ).toBe(false)
  })

  it('menolak konfirmasi password yang tidak cocok', () => {
    expect(
      signUpSchema
        .safeParse({
          email: 'budi@contoh.com',
          password: '12345678',
          confirmPassword: '123456789',
        })
        .success,
    ).toBe(false)
  })
})
