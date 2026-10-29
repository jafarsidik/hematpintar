import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { errorMessage } from '@/lib/storage/errors'
import {
  applyCloudSyncAction,
  buildCloudSyncAction,
  type CloudSyncAction,
  type CloudSyncDirection,
  type CloudSyncSummary,
} from '@/lib/supabase/sync'
import { useAuthStore } from '@/stores/auth'
import { useSimulationStore } from '@/stores/simulations'

export const useCloudSyncStore = defineStore('cloudSync', () => {
  const authStore = useAuthStore()
  const simulationStore = useSimulationStore()

  const pending = ref<CloudSyncAction | null>(null)
  const busy = ref(false)
  const error = ref<string | null>(null)
  const summary = ref<CloudSyncSummary | null>(null)

  watch(
    () => authStore.user?.id,
    () => {
      pending.value = null
      error.value = null
      summary.value = null
    },
  )

  const pendingConflicts = computed(
    () => pending.value?.plan.conflicts.length ?? 0,
  )

  const conflictMessage = computed(() => {
    const action = pending.value
    if (!action) return ''

    const direction =
      action.direction === 'upload'
        ? 'saat mencadangkan ke akun'
        : 'saat memulihkan dari akun'

    return `${action.plan.conflicts.length} simulasi memiliki versi berbeda antara perangkat dan akun. Versi dengan updated_at terbaru akan dipakai ${direction}. Data lokal yang tidak ada di akun tidak dihapus.`
  })

  async function apply(action: CloudSyncAction): Promise<void> {
    const user = authStore.user
    if (!user) {
      error.value = 'Masuk ke akun terlebih dahulu untuk mencadangkan data.'
      return
    }

    busy.value = true
    try {
      const result = await applyCloudSyncAction(action, user.id)

      if (!result.ok) {
        error.value = errorMessage(result.errors)
        return
      }

      summary.value = result.value
      const loadResult = await simulationStore.load()
      if (!loadResult.ok) {
        error.value = errorMessage(loadResult.errors)
      }
    } catch {
      error.value =
        'Data akun tidak dapat diproses. Data lokal tidak diubah; coba lagi.'
    } finally {
      busy.value = false
    }
  }

  async function start(direction: CloudSyncDirection): Promise<void> {
    error.value = null
    summary.value = null

    const user = authStore.user
    if (!user) {
      error.value = 'Masuk ke akun terlebih dahulu untuk mencadangkan data.'
      return
    }

    busy.value = true
    try {
      const result = await buildCloudSyncAction(direction, user.id)

      if (!result.ok) {
        error.value = errorMessage(result.errors)
        return
      }

      if (result.value.plan.conflicts.length > 0) {
        pending.value = result.value
        return
      }

      await apply(result.value)
    } catch {
      error.value =
        'Data akun tidak dapat diproses. Data lokal tidak diubah; coba lagi.'
    } finally {
      busy.value = false
    }
  }

  async function confirmPending(): Promise<void> {
    const action = pending.value
    if (!action) return
    pending.value = null
    await apply(action)
  }

  function cancelPending(): void {
    pending.value = null
  }

  function clear(): void {
    pending.value = null
    error.value = null
    summary.value = null
  }

  return {
    pending,
    pendingConflicts,
    conflictMessage,
    busy,
    error,
    summary,
    start,
    confirmPending,
    cancelPending,
    clear,
  }
})
