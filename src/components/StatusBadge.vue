<script setup lang="ts">
import { computed } from 'vue'

type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const props = withDefaults(
  defineProps<{
    label: string
    tone?: StatusTone
  }>(),
  { tone: 'neutral' },
)

const toneClasses: Record<StatusTone, string> = {
  success: 'border-success-200 bg-success-50 text-success-700',
  warning: 'border-warning-200 bg-warning-50 text-warning-700',
  danger: 'border-error-200 bg-error-50 text-error-700',
  info: 'border-primary-200 bg-primary-50 text-primary-700',
  neutral: 'border-slate-200 bg-slate-100 text-slate-700',
}

const classes = computed(() => toneClasses[props.tone])
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
    :class="classes"
  >
    <svg
      v-if="tone === 'success'"
      class="h-3.5 w-3.5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      aria-hidden="true"
    >
      <path stroke-linecap="round" stroke-linejoin="round" d="m5 13 4 4L19 7" />
    </svg>
    <svg
      v-else-if="tone === 'warning'"
      class="h-3.5 w-3.5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      aria-hidden="true"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
      />
    </svg>
    <svg
      v-else-if="tone === 'danger'"
      class="h-3.5 w-3.5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      aria-hidden="true"
    >
      <path stroke-linecap="round" stroke-linejoin="round" d="M6 6l12 12M18 6 6 18" />
    </svg>
    <svg
      v-else-if="tone === 'info'"
      class="h-3.5 w-3.5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path stroke-linecap="round" d="M12 11v5m0-8h.01" />
    </svg>
    <svg
      v-else
      class="h-3.5 w-3.5 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path stroke-linecap="round" d="M8 12h8" />
    </svg>
    <span>{{ label }}</span>
  </span>
</template>
