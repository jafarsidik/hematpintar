import { PLANS, type Plan, type PlanFeature } from '@/config/plans'

/**
 * Pemeriksaan fitur terpisah dari UI. Semua pembatasan paket harus memakai
 * fungsi ini atau helper di bawahnya.
 */
export function canUse(feature: PlanFeature, plan: Plan): boolean {
  return PLANS[plan].features.includes(feature)
}

export function getSimulationLimit(plan: Plan): number | null {
  return PLANS[plan].simulationLimit
}

/**
 * Batas dihitung per modul. `currentCount` adalah jumlah simulasi modul yang
 * sudah tersimpan di perangkat. Fungsi ini tidak pernah menghapus data.
 */
export function canCreateSimulation(
  plan: Plan,
  currentCount: number,
): boolean {
  if (canUse('unlimited-simulations', plan)) return true

  const limit = getSimulationLimit(plan)
  if (limit === null) return false
  return currentCount < limit
}

export function remainingSimulations(
  plan: Plan,
  currentCount: number,
): number | null {
  if (canUse('unlimited-simulations', plan)) return null

  const limit = getSimulationLimit(plan) ?? 0
  return Math.max(0, limit - Math.max(0, currentCount))
}

export function simulationLimitLabel(plan: Plan): string {
  if (canUse('unlimited-simulations', plan)) return 'Simulasi tanpa batas'

  const limit = getSimulationLimit(plan)
  return limit === null ? 'Simulasi tanpa batas' : `${limit} simulasi per modul`
}
