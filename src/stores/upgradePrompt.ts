import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { PLANS, type Plan } from '@/config/plans'
import { getSimulationLimit, simulationLimitLabel } from '@/lib/plans/access'
import { moduleInfo } from '@/lib/modules'
import type { ModuleType } from '@/lib/storage/schemas'

export const useUpgradePromptStore = defineStore('upgradePrompt', () => {
  const open = ref(false)
  const moduleType = ref<ModuleType | null>(null)
  const plan = ref<Plan>('free')

  const limit = computed(() => getSimulationLimit(plan.value))

  const message = computed(() => {
    const limitText = limit.value === null ? 'tanpa batas' : `${limit.value} simulasi`
    const moduleLabel = moduleType.value
      ? moduleInfo(moduleType.value).shortLabel
      : 'modul ini'

    const nextStep =
      plan.value === 'free'
        ? `Paket Plus memberi ${simulationLimitLabel('plus')}; Bisnis memberi simulasi tanpa batas.`
        : plan.value === 'plus'
          ? 'Paket Bisnis memberi simulasi tanpa batas.'
          : 'Hapus beberapa simulasi lama jika ingin menyimpan simulasi baru.'

    return (
      `Batas paket ${PLANS[plan.value].name} untuk ${moduleLabel} sudah ` +
      `tercapai (${limitText}). Data lama tetap aman dan tidak dihapus. ` +
      nextStep
    )
  })

  function show(nextModuleType: ModuleType, currentPlan: Plan): void {
    moduleType.value = nextModuleType
    plan.value = currentPlan
    open.value = true
  }

  function close(): void {
    open.value = false
  }

  return {
    open,
    moduleType,
    plan,
    limit,
    message,
    show,
    close,
  }
})
