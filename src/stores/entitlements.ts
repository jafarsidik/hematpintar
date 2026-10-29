import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { PLANS, type Plan } from '@/config/plans'
import {
  isSupabaseConfigured,
  supabase,
} from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'

export type { Plan }

interface EntitlementRow {
  plan: string | null
  valid_until: string | null
}

/**
 * Resolves the effective plan. Free stays free; paid plans without an expiry
 * are lifetime plans; paid plans past `valid_until` fall back to free.
 */
export function resolvePlan(
  plan: unknown,
  validUntil: string | null | undefined,
  now: Date = new Date(),
): Plan {
  if (plan !== 'plus' && plan !== 'business') return 'free'
  if (!validUntil) return plan

  const expiry = new Date(validUntil)
  if (Number.isNaN(expiry.getTime())) return 'free'

  return expiry.getTime() >= now.getTime() ? plan : 'free'
}

export const useEntitlementStore = defineStore('entitlements', () => {
  const authStore = useAuthStore()
  const plan = ref<Plan>('free')
  const validUntil = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isPremium = computed(() => plan.value !== 'free')
  const planLabel = computed(() => PLANS[plan.value].name)

  let requestId = 0

  function applyFree(): void {
    plan.value = 'free'
    validUntil.value = null
  }

  async function refresh(): Promise<void> {
    const currentRequest = ++requestId
    const user = authStore.user

    if (!user || !supabase || !isSupabaseConfigured) {
      applyFree()
      loading.value = false
      error.value = null
      return
    }

    loading.value = true
    error.value = null

    const { data, error: queryError } = await supabase
      .from('entitlements')
      .select('plan, valid_until')
      .eq('user_id', user.id)
      .maybeSingle()

    if (currentRequest !== requestId) return

    loading.value = false

    if (queryError) {
      applyFree()
      error.value =
        'Status paket tidak dapat dimuat. Aplikasi memakai paket Free.'
      return
    }

    const row = data as EntitlementRow | null
    validUntil.value = row?.valid_until ?? null
    plan.value = resolvePlan(row?.plan, row?.valid_until)
  }

  return {
    plan,
    validUntil,
    loading,
    error,
    isPremium,
    planLabel,
    refresh,
  }
})
