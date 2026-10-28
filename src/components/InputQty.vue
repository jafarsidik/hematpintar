<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    label: string
    hint?: string
    error?: string | null
    min?: number
    max?: number
    step?: number
    positive?: boolean
    satuan?: string
    required?: boolean
    disabled?: boolean
    placeholder?: string
  }>(),
  {
    hint: '',
    error: null,
    min: 0,
    step: 1,
    positive: false,
    satuan: '',
    required: false,
    disabled: false,
    placeholder: '0',
  },
)

const model = defineModel<number | null>({ default: null })
const inputId = useId()
const hintId = `${inputId}-hint`
const errorId = `${inputId}-error`
const localError = ref<string | null>(null)
const focused = ref(false)
const raw = ref('')

const shownError = computed(() => props.error ?? localError.value)

const displayValue = computed(() => {
  if (focused.value) return raw.value
  return model.value === null ? '' : String(model.value)
})

const describedBy = computed(() => {
  const ids: string[] = []
  if (props.hint && !shownError.value) ids.push(hintId)
  if (shownError.value) ids.push(errorId)
  return ids.length > 0 ? ids.join(' ') : undefined
})

const numberFormatter = new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 4,
})

function validationError(value: number): string | null {
  if (props.positive && value <= 0) {
    return 'Kuantitas harus lebih besar dari 0.'
  }
  if (value < props.min) {
    return `Nilai minimal ${numberFormatter.format(props.min)}.`
  }
  if (props.max !== undefined && value > props.max) {
    return `Nilai maksimal ${numberFormatter.format(props.max)}.`
  }
  return null
}

watch(model, (value) => {
  if (focused.value) return
  raw.value = value === null ? '' : String(value)
  localError.value = null
})

function onFocus(): void {
  focused.value = true
  raw.value = model.value === null ? '' : String(model.value)
}

function onInput(event: Event): void {
  raw.value = (event.target as HTMLInputElement).value
  localError.value = null

  if (raw.value.trim() === '') {
    model.value = null
    return
  }

  const value = Number(raw.value)
  if (!Number.isFinite(value)) {
    localError.value = 'Kuantitas harus berupa angka.'
    return
  }

  const error = validationError(value)
  if (error) return
  model.value = value
}

function onBlur(): void {
  focused.value = false

  if (raw.value.trim() === '') {
    model.value = null
    localError.value = null
    return
  }

  const value = Number(raw.value)
  if (!Number.isFinite(value)) {
    localError.value = 'Kuantitas harus berupa angka.'
    return
  }

  const error = validationError(value)
  if (error) {
    localError.value = error
    return
  }

  model.value = value
  raw.value = String(value)
  localError.value = null
}
</script>

<template>
  <div>
    <label :for="inputId" class="label-base">
      {{ label }}
      <span v-if="required" class="text-error-600" aria-hidden="true">*</span>
    </label>

    <div class="flex items-stretch">
      <input
        :id="inputId"
        type="number"
        inputmode="decimal"
        class="input-base"
        :class="{ 'rounded-r-none': satuan }"
        :value="displayValue"
        :placeholder="placeholder"
        :min="min"
        :max="max"
        :step="step"
        :required="required"
        :disabled="disabled"
        :aria-invalid="shownError ? 'true' : undefined"
        :aria-describedby="describedBy"
        @focus="onFocus"
        @input="onInput"
        @blur="onBlur"
      />
      <span
        v-if="satuan"
        class="inline-flex items-center rounded-r-lg border border-l-0 border-slate-300 bg-slate-50 px-3 text-sm text-slate-600"
      >
        {{ satuan }}
      </span>
    </div>

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
