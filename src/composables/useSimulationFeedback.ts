import type { Result } from '@/lib/calc/result'
import { isSimulationLimitError } from '@/lib/plans/limit'
import { errorMessage } from '@/lib/storage/errors'
import type { ModuleType } from '@/lib/storage/schemas'
import { useEntitlementStore } from '@/stores/entitlements'
import { useToastStore } from '@/stores/toast'
import { useUpgradePromptStore } from '@/stores/upgradePrompt'

/**
 * Menampilkan error simpan/duplikasi. Batas paket memakai dialog upgrade,
 * sedangkan kegagalan penyimpanan biasa tetap memakai toast.
 */
export function useSimulationFeedback() {
  const toastStore = useToastStore()
  const entitlementStore = useEntitlementStore()
  const upgradePrompt = useUpgradePromptStore()

  function reportSaveError(
    result: Result<unknown>,
    moduleType: ModuleType,
  ): void {
    if (result.ok) return

    if (isSimulationLimitError(result)) {
      upgradePrompt.show(moduleType, entitlementStore.plan)
      return
    }

    toastStore.error(errorMessage(result.errors))
  }

  return { reportSaveError }
}
