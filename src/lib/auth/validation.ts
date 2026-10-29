import { z } from 'zod'

export const EMAIL_MESSAGE = 'Masukkan alamat email yang valid.'
export const PASSWORD_MESSAGE = 'Password minimal 8 karakter.'
export const CONFIRM_PASSWORD_MESSAGE = 'Konfirmasi password tidak cocok.'

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, EMAIL_MESSAGE)
  .pipe(z.email(EMAIL_MESSAGE))

export const passwordSchema = z.string().min(8, PASSWORD_MESSAGE)

export const signUpSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine(
    (data) => data.password === data.confirmPassword,
    {
      path: ['confirmPassword'],
      message: CONFIRM_PASSWORD_MESSAGE,
    },
  )

export type SignUpInput = z.infer<typeof signUpSchema>
