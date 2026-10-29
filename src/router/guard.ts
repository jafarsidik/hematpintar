import type { RouteLocationNormalized, Router } from 'vue-router'

export interface AuthGuardStore {
  initialized: boolean
  isAuthenticated: boolean
  initialize(): Promise<void>
}

/**
 * Only allow an internal path after login. Reject protocol-relative and
 * absolute URLs so the redirect query cannot become an open redirect.
 */
export function safeRedirectPath(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//')
  ) {
    return '/'
  }

  return value
}

function requiresLogin(
  to: RouteLocationNormalized,
  requireLogin: boolean,
): boolean {
  if (to.name === 'login') return false
  // E2E bypass: saat variabel lingkungan diisi, abaikan wajib login agar
  // tes dapat mengakses halaman terlindungi tanpa mengelola sesi Supabase.
  if (
    typeof import.meta.env.VITE_E2E_BYPASS_AUTH === 'string' &&
    import.meta.env.VITE_E2E_BYPASS_AUTH.toLowerCase() === 'true'
  ) {
    return false
  }
  return requireLogin || to.meta.requiresAuth === true
}

export function installAuthGuard(
  router: Router,
  authStore: AuthGuardStore,
  requireLogin: boolean,
): void {
  router.beforeEach(async (to) => {
    if (!requiresLogin(to, requireLogin)) return true

    if (!authStore.initialized) {
      await authStore.initialize()
    }

    if (authStore.isAuthenticated) return true

    return {
      name: 'login',
      query: { redirect: to.fullPath },
    }
  })
}
