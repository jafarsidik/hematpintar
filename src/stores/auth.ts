import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function mapAuthError(message: string): string {
  const normalized = message.toLowerCase()

  if (normalized.includes('invalid email')) {
    return 'Alamat email tidak valid.'
  }
  if (
    normalized.includes('rate limit') ||
    normalized.includes('too many requests')
  ) {
    return 'Terlalu banyak percobaan. Tunggu beberapa saat lalu coba lagi.'
  }
  if (
    normalized.includes('failed to fetch') ||
    normalized.includes('network') ||
    normalized.includes('fetch')
  ) {
    return 'Tidak dapat menghubungi server. Periksa koneksi internet.'
  }
  if (
    normalized.includes('expired') ||
    normalized.includes('invalid token') ||
    normalized.includes('token has expired')
  ) {
    return 'Tautan login tidak valid atau sudah kedaluwarsa. Minta tautan baru.'
  }

  return 'Login gagal. Periksa email lalu coba lagi.'
}

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null)
  const loading = ref(false)
  const submitting = ref(false)
  const initialized = ref(false)
  const error = ref<string | null>(null)

  const user = computed(() => session.value?.user ?? null)
  const email = computed(() => user.value?.email ?? null)
  const isAuthenticated = computed(() => user.value !== null)

  let unsubscribe: (() => void) | null = null
  let initialization: Promise<void> | null = null

  async function doInitialize(): Promise<void> {
    if (!supabase) {
      initialized.value = true
      loading.value = false
      return
    }

    loading.value = true

    try {
      const { data, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        error.value = mapAuthError(sessionError.message)
      }
      session.value = data.session

      const { data: listener } = supabase.auth.onAuthStateChange(
        (_event, nextSession) => {
          session.value = nextSession
          error.value = null
        },
      )
      unsubscribe = () => listener.subscription.unsubscribe()
    } catch {
      error.value =
        'Sesi akun tidak dapat diperiksa. Aplikasi tetap berjalan tanpa login.'
    } finally {
      initialized.value = true
      loading.value = false
    }
  }

  async function initialize(): Promise<void> {
    if (initialized.value) return
    if (initialization) return initialization

    initialization = doInitialize().finally(() => {
      initialization = null
    })
    return initialization
  }

  async function login(emailInput: string): Promise<boolean> {
    error.value = null
    const normalized = emailInput.trim().toLowerCase()

    if (!EMAIL_PATTERN.test(normalized)) {
      error.value = 'Masukkan alamat email yang valid.'
      return false
    }

    if (!supabase) {
      error.value =
        'Login belum tersedia karena Supabase belum dikonfigurasi. Aplikasi tetap bisa dipakai tanpa akun.'
      return false
    }

    submitting.value = true
    const redirectTo =
      typeof window === 'undefined'
        ? undefined
        : `${window.location.origin}/login`

    try {
      const { error: loginError } = await supabase.auth.signInWithOtp({
        email: normalized,
        options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
      })

      if (loginError) {
        error.value = mapAuthError(loginError.message)
        return false
      }

      return true
    } catch (loginError) {
      error.value = mapAuthError(
        loginError instanceof Error ? loginError.message : String(loginError),
      )
      return false
    } finally {
      submitting.value = false
    }
  }

  async function logout(): Promise<boolean> {
    error.value = null
    if (!supabase) {
      session.value = null
      return true
    }

    submitting.value = true

    try {
      const { error: logoutError } = await supabase.auth.signOut()

      if (logoutError) {
        error.value = mapAuthError(logoutError.message)
        return false
      }

      session.value = null
      return true
    } catch (logoutError) {
      error.value = mapAuthError(
        logoutError instanceof Error ? logoutError.message : String(logoutError),
      )
      return false
    } finally {
      submitting.value = false
    }
  }

  function clearError(): void {
    error.value = null
  }

  function dispose(): void {
    unsubscribe?.()
    unsubscribe = null
  }

  return {
    session,
    user,
    email,
    isAuthenticated,
    loading,
    submitting,
    initialized,
    error,
    initialize,
    login,
    logout,
    clearError,
    dispose,
  }
})
