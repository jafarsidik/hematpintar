<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import { parseRupiahInput } from '@/lib/calc/currency-format'

const props = withDefaults(
  defineProps<{
    label: string
    hint?: string
    error?: string | null
    required?: boolean
    disabled?: boolean
    placeholder?: string
  }>(),
  {
    hint: '',
    error: null,
    required: false,
    disabled: false,
    placeholder: '0',
  },
)

const model = defineModel<number | null>({ default: null })
const inputId = useId()
const hintId = `${inputId}-hint`
const errorId = `${inputId}-error`

const numberFormatter = new Intl.NumberFormat('id-ID')

const focused = ref(false)
const raw = ref('')
const localError = ref<string | null>(null)

const displayValue = computed(() => {
  if (focused.value || localError.value) return raw.value
  return model.value === null ? '' : numberFormatter.format(model.value)
})

const shownError = computed(() => props.error ?? localError.value)

const describedBy = computed(() => {
  const ids = []
  if (props.hint && !shownError.value) ids.push(hintId)
  if (shownError.value) ids.push(errorId)
  return ids.length > 0 ? ids.join(' ') : undefined
})

watch(model, (value) => {
  if (focused.value) return
  raw.value = value === null ? '' : numberFormatter.format(value)
  localError.value = null
})

function onFocus(): void {
  focused.value = true
  raw.value =
    model.value === null ? '' : numberFormatter.format(model.value)
}

function onInput(event: Event): void {
  raw.value = (event.target as HTMLInputElement).value
  localError.value = null

  if (raw.value.trim() === '') {
    model.value = null
    return
  }

  const parsed = parseRupiahInput(raw.value)
  if (parsed.ok) model.value = parsed.value
}

function onBlur(): void {
  focused.value = false

  if (raw.value.trim() === '') {
    model.value = null
    localError.value = null
    return
  }

  const parsed = parseRupiahInput(raw.value)
  if (!parsed.ok) {
    localError.value =
      parsed.errors[0]?.message ?? 'Nominal tidak valid; periksa kembali.'
    return
  }

  model.value = parsed.value
  raw.value = numberFormatter.format(parsed.value)
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
      <span
        class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-slate-500"
        aria-hidden="true"
      >
        Rp
      </span>
      <input
        :id="inputId"
        type="text"
        inputmode="numeric"
        autocomplete="off"
        class="input-base pl-9"
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
