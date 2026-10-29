import { fail, type Result, type ValidationError } from '@/lib/calc/result'
import { PLANS, type Plan } from '@/config/plans'
import { getSimulationLimit } from './access'

export const SIMULATION_LIMIT_CODE = 'BATAS_SIMULASI'

export function simulationLimitError(plan: Plan): ValidationError {
  const limit = getSimulationLimit(plan) ?? 0

  return {
    field: 'simulations',
    code: SIMULATION_LIMIT_CODE,
    message:
      `Batas paket ${PLANS[plan].name} tercapai: maksimal ${limit} simulasi ` +
      'per modul. Data lama tetap tersimpan dan tidak dihapus. Buka Paket & ' +
      'Upgrade untuk menambah batas.',
  }
}

export function failSimulationLimit<T = never>(plan: Plan): Result<T> {
  return fail(simulationLimitError(plan))
}

export function isSimulationLimitError(result: Result<unknown>): boolean {
  return (
    !result.ok &&
    result.errors.some((error) => error.code === SIMULATION_LIMIT_CODE)
  )
}
