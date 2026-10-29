export const GENERIC_LOGIN_ERROR = 'Email atau password salah.'
export const EMAIL_TAKEN_ERROR = 'Email sudah terdaftar.'
export const AUTH_UNAVAILABLE_ERROR =
  'Login belum tersedia karena Supabase belum dikonfigurasi. Aplikasi tetap bisa dipakai tanpa akun.'

const RATE_LIMIT_ERROR =
  'Terlalu banyak percobaan, coba lagi beberapa menit lagi.'
const NETWORK_ERROR =
  'Tidak dapat menghubungi server. Periksa koneksi internet.'
const WEAK_PASSWORD_ERROR = 'Password minimal 8 karakter.'
const SAME_PASSWORD_ERROR =
  'Password baru harus berbeda dari password saat ini.'

export interface AuthErrorLike {
  message?: string
  code?: string
  status?: number
}

function toSearchableText(error: AuthErrorLike | string): string {
  if (typeof error === 'string') return error.toLowerCase()

  return `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase()
}

function includesAny(text: string, needles: readonly string[]): boolean {
  return needles.some((needle) => text.includes(needle))
}

function isEmailTaken(text: string): boolean {
  return includesAny(text, [
    'user_already_exists',
    'email_exists',
    'already registered',
    'already exists',
    'duplicate key',
    'email already exists',
    'database error saving new user',
  ])
}

function isWeakPassword(text: string): boolean {
  return includesAny(text, [
    'weak password',
    'weak_password',
    'password should be at least',
    'password is too short',
  ])
}

function isRateLimited(text: string): boolean {
  return includesAny(text, [
    'rate limit',
    'too many requests',
    'over_request_rate_limit',
    'over_email_send_rate_limit',
  ])
}

function isNetworkError(text: string): boolean {
  return includesAny(text, [
    'failed to fetch',
    'fetch failed',
    'network error',
    'network request',
  ])
}

function isInvalidCredentials(text: string): boolean {
  return includesAny(text, ['invalid login credentials', 'invalid_credentials'])
}

function isSamePassword(text: string): boolean {
  return includesAny(text, [
    'same password',
    'same_password',
    'different from the old password',
  ])
}

export function mapSignUpError(error: AuthErrorLike | string): string {
  const text = toSearchableText(error)

  if (isEmailTaken(text)) return EMAIL_TAKEN_ERROR
  if (isWeakPassword(text)) return WEAK_PASSWORD_ERROR
  if (isRateLimited(text)) return RATE_LIMIT_ERROR
  if (isNetworkError(text)) return NETWORK_ERROR

  return 'Pendaftaran gagal. Coba lagi.'
}

export function mapChangePasswordError(error: AuthErrorLike | string): string {
  const text = toSearchableText(error)

  if (isInvalidCredentials(text)) return 'Password saat ini salah.'
  if (isSamePassword(text)) return SAME_PASSWORD_ERROR
  if (isWeakPassword(text)) return WEAK_PASSWORD_ERROR
  if (isRateLimited(text)) return RATE_LIMIT_ERROR
  if (isNetworkError(text)) return NETWORK_ERROR

  return 'Password tidak dapat diubah. Coba lagi.'
}

export function mapAuthError(error: AuthErrorLike | string): string {
  const text = toSearchableText(error)

  if (isInvalidCredentials(text)) return GENERIC_LOGIN_ERROR
  if (isEmailTaken(text)) return EMAIL_TAKEN_ERROR
  if (isWeakPassword(text)) return WEAK_PASSWORD_ERROR
  if (isRateLimited(text)) return RATE_LIMIT_ERROR
  if (isNetworkError(text)) return NETWORK_ERROR

  return 'Terjadi kesalahan pada akun. Coba lagi.'
}

/**
 * Login deliberately exposes only one message. This keeps the client from
 * revealing whether an email exists.
 */
export function mapLoginError(): string {
  return GENERIC_LOGIN_ERROR
}
