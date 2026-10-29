import { z } from 'zod'

export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/
export const USERNAME_MESSAGE =
  'Username hanya boleh huruf kecil, angka, dan underscore (3-20 karakter).'
export const PASSWORD_MESSAGE = 'Password minimal 8 karakter.'

export const usernameSchema = z
  .string()
  .transform((value) => value.trim().toLowerCase())
  .pipe(z.string().regex(USERNAME_PATTERN, USERNAME_MESSAGE))

export const passwordSchema = z.string().min(8, PASSWORD_MESSAGE)

export const signUpSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
})

export type SignUpInput = z.infer<typeof signUpSchema>
