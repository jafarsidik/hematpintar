import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Result } from '@/lib/calc/result'
import { errorMessage } from '@/lib/storage/errors'
import {
  createSimulation,
  duplicateSimulation,
  listSimulations,
  removeSimulation,
  updateSimulation,
  type CreateSimulationInput,
  type UpdateSimulationInput,
} from '@/lib/storage/repository'
import type { ModuleType, SimulationRecord } from '@/lib/storage/schemas'

export const useSimulationStore = defineStore('simulations', () => {
  const items = ref<SimulationRecord[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false)

  const recent = computed(() => items.value.slice(0, 5))

  function applyFailure(result: Result<unknown>): void {
    if (!result.ok) {
      error.value = errorMessage(result.errors)
    }
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
    const result = await createSimulation(input)
    applyFailure(result)
    if (result.ok) await load()
    return result
  }

  async function update(
    id: string,
    patch: UpdateSimulationInput,
  ): Promise<Result<SimulationRecord>> {
    const result = await updateSimulation(id, patch)
    applyFailure(result)
    if (result.ok) await load()
    return result
  }

  async function duplicate(id: string): Promise<Result<SimulationRecord>> {
    const result = await duplicateSimulation(id)
    applyFailure(result)
    if (result.ok) await load()
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
