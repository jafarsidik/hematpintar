export const DEFAULT_AUTH_EMAIL_DOMAIN = 'users.hematpintar.local'

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase()
}

export function authEmailDomain(): string {
  const raw = import.meta.env.VITE_AUTH_EMAIL_DOMAIN
  const domain =
    typeof raw === 'string'
      ? raw.trim().toLowerCase().replace(/^@+/, '')
      : ''

  return domain || DEFAULT_AUTH_EMAIL_DOMAIN
}

/**
 * Supabase Auth still needs an email-shaped identifier. The app never shows
 * this synthetic address as a real contact address and never sends email.
 */
export function usernameToEmail(
  username: string,
  domain: string = authEmailDomain(),
): string {
  const normalizedDomain =
    domain.trim().toLowerCase().replace(/^@+/, '') ||
    DEFAULT_AUTH_EMAIL_DOMAIN

  return `${normalizeUsername(username)}@${normalizedDomain}`
}
