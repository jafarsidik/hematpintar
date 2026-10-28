<script setup lang="ts">
import { computed } from 'vue'
import StatusBadge from './StatusBadge.vue'

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger'
type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const props = withDefaults(
  defineProps<{
    title: string
    value?: string
    description?: string
    tone?: Tone
    statusLabel?: string
    statusTone?: BadgeTone
  }>(),
  {
    value: '',
    description: '',
    tone: 'neutral',
    statusLabel: '',
    statusTone: 'neutral',
  },
)

const toneClasses: Record<Tone, string> = {
  neutral: 'border-slate-200 border-t-slate-300',
  primary: 'border-primary-200 border-t-primary-600',
  success: 'border-success-200 border-t-success-600',
  warning: 'border-warning-200 border-t-warning-600',
  danger: 'border-error-200 border-t-error-600',
}

const classes = computed(
  () => `rounded-card border border-t-4 bg-white p-4 shadow-sm ${toneClasses[props.tone]}`,
)
</script>

<template>
  <section :class="classes">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-sm font-medium text-slate-600">{{ title }}</p>
        <p
          v-if="value"
          class="mt-1 break-words text-2xl font-semibold tracking-tight text-slate-900"
        >
          {{ value }}
        </p>
      </div>
      <StatusBadge
        v-if="statusLabel"
        :label="statusLabel"
        :tone="statusTone"
        class="shrink-0"
      />
    </div>

    <p v-if="description" class="mt-2 text-sm text-slate-600">
      {{ description }}
    </p>

    <div v-if="$slots.default" class="mt-3">
      <slot />
    </div>
  </section>
</template>
