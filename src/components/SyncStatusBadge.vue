<script setup lang="ts">
import { computed } from 'vue'
import StatusBadge from '@/components/StatusBadge.vue'
import type { SimulationRecord } from '@/lib/storage/schemas'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  record: SimulationRecord
}>()

const authStore = useAuthStore()

const status = computed(() => {
  const user = authStore.user
  if (!user || props.record.cloudUserId !== user.id || !props.record.syncedAt) {
    return {
      label: 'Tersimpan di perangkat ini',
      tone: 'neutral' as const,
    }
  }

  const syncedTime = Date.parse(props.record.syncedAt)
  const updatedTime = Date.parse(props.record.updatedAt)
  if (
    Number.isFinite(syncedTime) &&
    Number.isFinite(updatedTime) &&
    syncedTime >= updatedTime
  ) {
    return {
      label: 'Tercadangkan ke akun',
      tone: 'success' as const,
    }
  }

  return {
    label: 'Perubahan belum dicadangkan',
    tone: 'warning' as const,
  }
})
</script>

<template>
  <StatusBadge :label="status.label" :tone="status.tone" />
</template>
