import type { Plan } from '@/config/plans'

export interface EntitlementRow {
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
