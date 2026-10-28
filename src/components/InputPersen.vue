<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    label: string
    hint?: string
    error?: string | null
    min?: number
    max?: number
    required?: boolean
    disabled?: boolean
    placeholder?: string
  }>(),
  {
    hint: '',
    error: null,
    min: 0,
    max: 100,
    required: false,
    disabled: false,
    placeholder: '0',
  },
)

const model = defineModel<number | null>({ default: null })
const inputId = useId()
const hintId = `${inputId}-hint`
const errorId = `${inputId}-error`

const focused = ref(false)
const raw = ref('')
const localError = ref<string | null>(null)

const pointsFormatter = new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 2,
})

const displayValue = computed(() => {
  if (focused.value || localError.value) return raw.value
  return model.value === null
    ? ''
    : pointsFormatter.format(model.value * 100)
})

const shownError = computed(() => props.error ?? localError.value)

const rangeMessage = computed(
  () =>
    `Persentase harus antara ${pointsFormatter.format(props.min)} dan ${pointsFormatter.format(props.max)}.`,
)

const describedBy = computed(() => {
  const ids: string[] = []
  if (props.hint && !shownError.value) ids.push(hintId)
  if (shownError.value) ids.push(errorId)
  return ids.length > 0 ? ids.join(' ') : undefined
})

watch(model, (value) => {
  if (focused.value) return
  raw.value =
    value === null ? '' : pointsFormatter.format(value * 100)
  localError.value = null
})

function onFocus(): void {
  focused.value = true
  raw.value =
    model.value === null
      ? ''
      : pointsFormatter.format(model.value * 100)
}

function parsePoints(value: string): number | null {
  const normalized = value.trim().replace(',', '.')
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return null
  const points = Number(normalized)
  return Number.isFinite(points) ? points : null
}

function onInput(event: Event): void {
  raw.value = (event.target as HTMLInputElement).value
  localError.value = null

  if (raw.value.trim() === '') {
    model.value = null
    return
  }

  const points = parsePoints(raw.value)
  if (points === null) return
  if (points < props.min || points > props.max) return
  model.value = points / 100
}

function onBlur(): void {
  focused.value = false

  if (raw.value.trim() === '') {
    model.value = null
    localError.value = null
    return
  }

  const points = parsePoints(raw.value)
  if (points === null) {
    localError.value =
      'Persentase tidak valid; gunakan angka seperti 30 atau 12,5.'
    return
  }

  if (points < props.min || points > props.max) {
    localError.value = rangeMessage.value
    return
  }

  model.value = points / 100
  raw.value = pointsFormatter.format(points)
  localError.value = null
}
</script>

<template>
  <div>
    <label :for="inputId" class="label-base">
      {{ label }}
      <span v-if="required" class="text-error-600" aria-hidden="true">*</span>
    </label>

    <div class="relative">
      <input
        :id="inputId"
        type="text"
        inputmode="decimal"
        autocomplete="off"
        class="input-base pr-9"
        :value="displayValue"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :aria-invalid="shownError ? 'true' : undefined"
        :aria-describedby="describedBy"
        @focus="onFocus"
        @input="onInput"
        @blur="onBlur"
      />
      <span
        class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-slate-500"
        aria-hidden="true"
      >
        %
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
