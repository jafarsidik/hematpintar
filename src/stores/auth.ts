import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Session } from '@supabase/supabase-js'
import type { Plan } from '@/config/plans'
import {
  changePassword as changePasswordService,
  signIn as signInService,
  signOut as signOutService,
  signUp as signUpService,
} from '@/lib/auth'
import {
  resolvePlan,
  type EntitlementRow,
} from '@/lib/plans/entitlement'
import { errorMessage } from '@/lib/storage/errors'
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client'

const SESSION_CHECK_ERROR =
  'Sesi akun tidak dapat diperiksa. Aplikasi tetap berjalan tanpa login.'
const PLAN_LOAD_ERROR =
  'Status paket tidak dapat dimuat. Aplikasi memakai paket Free.'

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null)
  const loading = ref(false)
  const submitting = ref(false)
  const initialized = ref(false)
  const error = ref<string | null>(null)

  const plan = ref<Plan>('free')
  const validUntil = ref<string | null>(null)
  const planLoading = ref(false)
  const planError = ref<string | null>(null)

  const user = computed(() => session.value?.user ?? null)
  const email = computed(() => user.value?.email ?? null)
  const username = computed(() => {
    const metadataUsername = user.value?.user_metadata?.username

    if (
      typeof metadataUsername === 'string' &&
      metadataUsername.trim() !== ''
    ) {
      return metadataUsername.trim()
    }

    const address = email.value
    if (!address) return null

    return address.split('@')[0] ?? null
  })
  const isAuthenticated = computed(() => user.value !== null)

  let unsubscribe: (() => void) | null = null
  let initialization: Promise<void> | null = null
  let planRequestId = 0

  function applyFreePlan(): void {
    planRequestId += 1
    plan.value = 'free'
    validUntil.value = null
    planLoading.value = false
    planError.value = null
  }

  async function refreshPlan(): Promise<void> {
    const currentRequest = ++planRequestId
    const currentUser = user.value

    if (!currentUser || !supabase || !isSupabaseConfigured) {
      applyFreePlan()
      return
    }

    planLoading.value = true
    planError.value = null

    try {
      const { data, error: queryError } = await supabase
        .from('entitlements')
        .select('plan, valid_until')
        .eq('user_id', currentUser.id)
        .maybeSingle()

      if (currentRequest !== planRequestId) return

      planLoading.value = false

      if (queryError) {
        plan.value = 'free'
        validUntil.value = null
        planError.value = PLAN_LOAD_ERROR
        return
      }

      const row = data as EntitlementRow | null
      validUntil.value = row?.valid_until ?? null
      plan.value = resolvePlan(row?.plan, row?.valid_until)
    } catch {
      if (currentRequest !== planRequestId) return
      planLoading.value = false
      plan.value = 'free'
      validUntil.value = null
      planError.value = PLAN_LOAD_ERROR
    }
  }

  async function doInitialize(): Promise<void> {
    if (!supabase || !isSupabaseConfigured) {
      initialized.value = true
      loading.value = false
      applyFreePlan()
      return
    }

    loading.value = true

    try {
      const { data, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        error.value = SESSION_CHECK_ERROR
      }
      session.value = data.session

      if (data.session?.user) {
        void refreshPlan()
      } else {
        applyFreePlan()
      }

      const { data: listener } = supabase.auth.onAuthStateChange(
        (_event, nextSession) => {
          const previousUserId = session.value?.user?.id ?? null
          session.value = nextSession
          error.value = null

          if (!nextSession?.user) {
            applyFreePlan()
            return
          }

          if (nextSession.user.id !== previousUserId) {
            void refreshPlan()
          }
        },
      )
      unsubscribe = () => listener.subscription.unsubscribe()
    } catch {
      error.value = SESSION_CHECK_ERROR
      session.value = null
      applyFreePlan()
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

  async function signIn(
    usernameInput: string,
    password: string,
  ): Promise<boolean> {
    error.value = null
    submitting.value = true

    try {
      const result = await signInService(usernameInput, password)

      if (!result.ok) {
        error.value = errorMessage(result.errors)
        return false
      }

      session.value = result.value
      await refreshPlan()
      return true
    } finally {
      submitting.value = false
    }
  }

  async function signUp(
    usernameInput: string,
    password: string,
  ): Promise<boolean> {
    error.value = null
    submitting.value = true

    try {
      const result = await signUpService(usernameInput, password)

      if (!result.ok) {
        error.value = errorMessage(result.errors)
        return false
      }

      session.value = result.value.session

      if (result.value.session?.user) {
        await refreshPlan()
      } else {
        applyFreePlan()
      }

      return true
    } finally {
      submitting.value = false
    }
  }

  async function signOut(): Promise<boolean> {
    error.value = null
    submitting.value = true

    try {
      const result = await signOutService()

      if (!result.ok) {
        error.value = errorMessage(result.errors)
        return false
      }

      session.value = null
      applyFreePlan()
      return true
    } finally {
      submitting.value = false
    }
  }

  async function changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<boolean> {
    error.value = null
    submitting.value = true

    try {
      const result = await changePasswordService(
        currentPassword,
        newPassword,
      )

      if (!result.ok) {
        error.value = errorMessage(result.errors)
        return false
      }

      return true
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
    username,
    isAuthenticated,
    plan,
    validUntil,
    planLoading,
    planError,
    loading,
    submitting,
    initialized,
    error,
    initialize,
    signIn,
    signUp,
    signOut,
    changePassword,
    refreshPlan,
    clearError,
    dispose,
  }
})
