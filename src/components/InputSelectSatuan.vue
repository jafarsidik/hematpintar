<script setup lang="ts">
import { computed, useId } from 'vue'
import type { Satuan } from '@/lib/calc/unit-conversion'

const props = withDefaults(
  defineProps<{
    label: string
    hint?: string
    error?: string | null
    required?: boolean
    disabled?: boolean
  }>(),
  {
    hint: '',
    error: null,
    required: false,
    disabled: false,
  },
)

const model = defineModel<Satuan>({ default: 'kg' })
const inputId = useId()
const hintId = `${inputId}-hint`
const errorId = `${inputId}-error`

const options: readonly { value: Satuan; label: string }[] = [
  { value: 'g', label: 'gram (g)' },
  { value: 'kg', label: 'kilogram (kg)' },
  { value: 'ml', label: 'mililiter (ml)' },
  { value: 'l', label: 'liter (l)' },
  { value: 'pcs', label: 'buah / pcs' },
]

const shownError = computed(() => props.error)

const describedBy = computed(() => {
  const ids: string[] = []
  if (props.hint && !shownError.value) ids.push(hintId)
  if (shownError.value) ids.push(errorId)
  return ids.length > 0 ? ids.join(' ') : undefined
})
</script>

<template>
  <div>
    <label :for="inputId" class="label-base">
      {{ label }}
      <span v-if="required" class="text-error-600" aria-hidden="true">*</span>
    </label>

    <select
      :id="inputId"
      v-model="model"
      class="input-base"
      :required="required"
      :disabled="disabled"
      :aria-invalid="shownError ? 'true' : undefined"
      :aria-describedby="describedBy"
    >
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>

    <p
      v-if="hint && !shownError"
      :id="hintId"
      class="mt-1.5 text-xs text-slate-500"
    >
      {{ hint }}
    </p>
    <p
      v-if="shownError"
      :id="errorId"
      class="mt-1.5 text-sm text-error-600"
      role="alert"
    >
      {{ shownError }}
    </p>
  </div>
</template>
