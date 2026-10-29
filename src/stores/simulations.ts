import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { fail, ok, type Result } from '@/lib/calc/result'
import { canCreateSimulation } from '@/lib/plans/access'
import {
  failSimulationLimit,
  isSimulationLimitError,
} from '@/lib/plans/limit'
import { errorMessage } from '@/lib/storage/errors'
import {
  createSimulation,
  duplicateSimulation,
  getSimulationById,
  listSimulations,
  removeSimulation,
  updateSimulation,
  type CreateSimulationInput,
  type UpdateSimulationInput,
} from '@/lib/storage/repository'
import type { ModuleType, SimulationRecord } from '@/lib/storage/schemas'
import { useAnalyticsStore } from '@/stores/analytics'
import { useEntitlementStore } from '@/stores/entitlements'

export const useSimulationStore = defineStore('simulations', () => {
  const entitlementStore = useEntitlementStore()
  const analyticsStore = useAnalyticsStore()
  const items = ref<SimulationRecord[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false)

  const recent = computed(() => items.value.slice(0, 5))

  function applyFailure(result: Result<unknown>): void {
    if (!result.ok && !isSimulationLimitError(result)) {
      error.value = errorMessage(result.errors)
    }
  }

  async function ensureCanCreate(
    moduleType: ModuleType,
  ): Promise<Result<true>> {
    const countResult = await listSimulations(moduleType)
    if (!countResult.ok) return fail(countResult.errors)

    if (
      !canCreateSimulation(entitlementStore.plan, countResult.value.length)
    ) {
      return failSimulationLimit(entitlementStore.plan)
    }

    return ok(true)
  }

  async function load(
    moduleType?: ModuleType,
  ): Promise<Result<SimulationRecord[]>> {
    loading.value = true
    const result = await listSimulations(moduleType)
    loading.value = false
    initialized.value = true

    if (result.ok) {
      items.value = result.value
      error.value = null
    } else {
      items.value = []
      error.value = errorMessage(result.errors)
    }
    return result
  }

  async function create(
    input: CreateSimulationInput,
  ): Promise<Result<SimulationRecord>> {
    const permission = await ensureCanCreate(input.moduleType)
    if (!permission.ok) {
      applyFailure(permission)
      return permission
    }

    const result = await createSimulation(input)
    applyFailure(result)
    if (result.ok) {
      void analyticsStore.track('simulation_saved', result.value.moduleType)
      await load()
    }
    return result
  }

  async function update(
    id: string,
    patch: UpdateSimulationInput,
  ): Promise<Result<SimulationRecord>> {
    const result = await updateSimulation(id, patch)
    applyFailure(result)
    if (result.ok) {
      void analyticsStore.track('simulation_saved', result.value.moduleType)
      await load()
    }
    return result
  }

  async function duplicate(id: string): Promise<Result<SimulationRecord>> {
    const existing = await getSimulationById(id)
    if (!existing.ok) {
      applyFailure(existing)
      return existing
    }
    if (!existing.value) {
      const notFound = fail<SimulationRecord>({
        field: 'id',
        code: 'TIDAK_DITEMUKAN',
        message: 'Simulasi tidak ditemukan. Muat ulang daftar riwayat.',
      })
      applyFailure(notFound)
      return notFound
    }

    const permission = await ensureCanCreate(existing.value.moduleType)
    if (!permission.ok) {
      applyFailure(permission)
      return permission
    }

    const result = await duplicateSimulation(id)
    applyFailure(result)
    if (result.ok) {
      void analyticsStore.track('simulation_saved', result.value.moduleType)
      await load()
    }
    return result
  }

  async function remove(id: string): Promise<Result<void>> {
    const result = await removeSimulation(id)
    applyFailure(result)
    if (result.ok) await load()
    return result
  }

  function clearError(): void {
    error.value = null
  }

  return {
    items,
    recent,
    loading,
    error,
    initialized,
    load,
    create,
    update,
    duplicate,
    remove,
    clearError,
  }
})
