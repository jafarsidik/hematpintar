<script setup lang="ts">
import StatusBadge from './StatusBadge.vue'
import { type ToastTone, useToastStore } from '@/stores/toast'

const toastStore = useToastStore()

const badgeTone: Record<
  ToastTone,
  'success' | 'warning' | 'danger' | 'info'
> = {
  success: 'success',
  warning: 'warning',
  error: 'danger',
  info: 'info',
}

const toneLabel: Record<ToastTone, string> = {
  success: 'Berhasil',
  warning: 'Perhatian',
  error: 'Gagal',
  info: 'Info',
}
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-3 sm:px-4"
    aria-live="assertive"
    aria-atomic="false"
  >
    <div
      v-for="toast in toastStore.items"
      :key="toast.id"
      role="status"
      class="pointer-events-auto flex w-full max-w-md items-start gap-2.5 rounded-card border border-slate-200 bg-white p-3 shadow-lg"
    >
      <StatusBadge
        :label="toneLabel[toast.tone]"
        :tone="badgeTone[toast.tone]"
        class="mt-0.5 shrink-0"
      />
      <p class="flex-1 pt-0.5 text-sm leading-relaxed text-slate-700">
        {{ toast.message }}
      </p>
      <button
        type="button"
        class="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        aria-label="Tutup notifikasi"
        @click="toastStore.dismiss(toast.id)"
      >
        <svg
          class="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          <path stroke-linecap="round" d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  </div>
</template>
