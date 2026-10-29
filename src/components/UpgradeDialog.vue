<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useAnalyticsStore } from '@/stores/analytics'
import { useUpgradePromptStore } from '@/stores/upgradePrompt'

const router = useRouter()
const analyticsStore = useAnalyticsStore()
const upgradePrompt = useUpgradePromptStore()

const open = computed({
  get: () => upgradePrompt.open,
  set: (value: boolean) => {
    if (!value) upgradePrompt.close()
  },
})

function goToPricing(): void {
  void analyticsStore.track('upgrade_click', upgradePrompt.moduleType)
  upgradePrompt.close()
  void router.push('/pricing')
}
</script>

<template>
  <ConfirmDialog
    v-model:open="open"
    title="Batas simulasi tercapai"
    :message="upgradePrompt.message"
    confirm-label="Lihat Paket & Upgrade"
    cancel-label="Nanti"
    @confirm="goToPricing"
  />
</template>
