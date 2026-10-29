import type { Session, User } from '@supabase/supabase-js'
import { fail, ok, type Result, type ValidationError } from '@/lib/calc/result'
import { zodValidationErrors } from '@/lib/storage/errors'
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client'
import {
  AUTH_UNAVAILABLE_ERROR,
  EMAIL_TAKEN_ERROR,
  GENERIC_LOGIN_ERROR,
  mapAuthError,
  mapChangePasswordError,
  mapSignUpError,
} from './errors'
import { EMAIL_MESSAGE, emailSchema, passwordSchema, signUpSchema } from './validation'

export interface SignUpResult {
  user: User
  session: Session | null
}

function authError(
  message: string,
  field = 'auth',
  code = 'AUTH_GAGAL',
): ValidationError {
  return { field, code, message }
}

function unknownErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export async function signUp(
  emailInput: string,
  password: string,
): Promise<Result<SignUpResult>> {
  const parsed = signUpSchema.safeParse({
    email: emailInput,
    password,
    confirmPassword: password,
  })

  if (!parsed.success) return fail(zodValidationErrors(parsed.error))
  if (!supabase || !isSupabaseConfigured) {
    return fail(authError(AUTH_UNAVAILABLE_ERROR))
  }

  const { email } = parsed.data

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      return fail(authError(mapSignUpError(error), 'email'))
    }

    // Confirm email disabled -> Supabase returns a session immediately.
    // Confirm email enabled -> no session, user must check their inbox.
    if (
      data.user &&
      Array.isArray(data.user.identities) &&
      data.user.identities.length === 0
    ) {
      return fail(authError(EMAIL_TAKEN_ERROR, 'email'))
    }
    if (!data.user) {
      return fail(authError('Pendaftaran gagal. Coba lagi.', 'email'))
    }

    return ok({ user: data.user, session: data.session })
  } catch (error) {
    return fail(
      authError(mapSignUpError(unknownErrorMessage(error)), 'email'),
    )
  }
}

/**
 * Login always returns the same public error for invalid input, unknown users,
 * or wrong passwords. Network/configuration failures remain distinguishable
 * only when Supabase itself is unavailable before the request.
 */
export async function signIn(
  emailInput: string,
  password: string,
): Promise<Result<Session>> {
  const parsed = emailSchema.safeParse(emailInput)

  if (!parsed.success || password.length < 8) {
    return fail(authError(GENERIC_LOGIN_ERROR))
  }
  if (!supabase || !isSupabaseConfigured) {
    return fail(authError(AUTH_UNAVAILABLE_ERROR))
  }

  const email = parsed.data

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data.session) {
      return fail(authError(GENERIC_LOGIN_ERROR))
    }

    return ok(data.session)
  } catch {
    return fail(authError(GENERIC_LOGIN_ERROR))
  }
}

export async function signOut(): Promise<Result<void>> {
  if (!supabase || !isSupabaseConfigured) return ok(undefined)

  try {
    const { error } = await supabase.auth.signOut()

    if (error) return fail(authError(mapAuthError(error)))

    return ok(undefined)
  } catch (error) {
    return fail(authError(mapAuthError(unknownErrorMessage(error))))
  }
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<Result<void>> {
  const parsed = passwordSchema.safeParse(newPassword)

  if (!parsed.success) return fail(zodValidationErrors(parsed.error))
  if (currentPassword.length === 0) {
    return fail(
      authError(
        'Masukkan password saat ini.',
        'currentPassword',
        'VALIDASI_GAGAL',
      ),
    )
  }
  if (!supabase || !isSupabaseConfigured) {
    return fail(authError(AUTH_UNAVAILABLE_ERROR))
  }

  try {
    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError || !userData.user?.email) {
      return fail(
        authError('Sesi akun tidak ditemukan. Masuk ulang.', 'auth'),
      )
    }

    // Re-authenticate before changing the password so a borrowed session
    // cannot silently take over the account.
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: userData.user.email,
      password: currentPassword,
    })

    if (verifyError) {
      return fail(
        authError(
          'Password saat ini salah.',
          'currentPassword',
          'PASSWORD_LAMA_SALAH',
        ),
      )
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: parsed.data,
    })

    if (updateError) {
      return fail(
        authError(mapChangePasswordError(updateError), 'newPassword'),
      )
    }

    return ok(undefined)
  } catch (error) {
    return fail(
      authError(
        mapChangePasswordError(unknownErrorMessage(error)),
        'newPassword',
      ),
    )
  }
}

export async function resetPasswordForEmail(
  emailInput: string,
): Promise<Result<void>> {
  const parsed = emailSchema.safeParse(emailInput)

  if (!parsed.success) return fail(authError(EMAIL_MESSAGE, 'email'))
  if (!supabase || !isSupabaseConfigured) {
    return fail(authError(AUTH_UNAVAILABLE_ERROR))
  }

  const email = parsed.data

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: '/reset-password',
    })

    if (error) {
      const mapped = mapSignUpError(error)
      return fail(authError(mapped, 'email'))
    }

    return ok(undefined)
  } catch (error) {
    return fail(
      authError(
        mapSignUpError(unknownErrorMessage(error)),
        'email',
      ),
    )
  }
}
