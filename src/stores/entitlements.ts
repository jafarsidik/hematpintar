import { defineStore } from 'pinia'
import { computed } from 'vue'
import { PLANS, type Plan } from '@/config/plans'
import { useAuthStore } from './auth'

export { resolvePlan } from '@/lib/plans/entitlement'
export type { EntitlementRow } from '@/lib/plans/entitlement'
export type { Plan }

/**
 * Read-only facade for components that only need the effective plan. The
 * authoritative session and plan state live in the auth store, which reads
 * `entitlements` after login and falls back to Free without a session.
 */
export const useEntitlementStore = defineStore('entitlements', () => {
  const authStore = useAuthStore()

  const plan = computed<Plan>(() => authStore.plan)
  const validUntil = computed(() => authStore.validUntil)
  const loading = computed(() => authStore.planLoading)
  const error = computed(() => authStore.planError)
  const isPremium = computed(() => plan.value !== 'free')
  const planLabel = computed(() => PLANS[plan.value].name)

  async function refresh(): Promise<void> {
    await authStore.refreshPlan()
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
