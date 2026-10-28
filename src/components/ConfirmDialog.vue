<script setup lang="ts">
import { onMounted, ref, useId, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    message?: string
    confirmLabel?: string
    cancelLabel?: string
    tone?: 'primary' | 'danger'
    confirmDisabled?: boolean
  }>(),
  {
    message: '',
    confirmLabel: 'Lanjutkan',
    cancelLabel: 'Batal',
    tone: 'primary',
    confirmDisabled: false,
  },
)

const emit = defineEmits<{
  'update:open': [open: boolean]
  confirm: []
  cancel: []
}>()

const dialogElement = ref<HTMLDialogElement | null>(null)
const titleId = useId()

function syncOpen(open: boolean): void {
  const element = dialogElement.value
  if (!element) return
  if (open && !element.open) {
    element.showModal()
  } else if (!open && element.open) {
    element.close()
  }
}

function requestCancel(): void {
  emit('update:open', false)
  emit('cancel')
  dialogElement.value?.close()
}

function onBackdropClick(event: MouseEvent): void {
  if (event.target === dialogElement.value) requestCancel()
}

watch(() => props.open, syncOpen, { flush: 'post' })
onMounted(() => syncOpen(props.open))
</script>

<template>
  <dialog
    ref="dialogElement"
    :aria-labelledby="titleId"
    class="m-auto w-[calc(100%-2rem)] max-w-md rounded-card border border-slate-200 bg-white p-0 text-slate-900 shadow-xl"
    @cancel.prevent="requestCancel"
    @click="onBackdropClick"
  >
    <div class="p-5 sm:p-6">
      <h2 :id="titleId" class="text-lg font-semibold text-slate-900">
        {{ title }}
      </h2>
      <p v-if="message" class="mt-2 text-sm leading-relaxed text-slate-600">
        {{ message }}
      </p>

      <div v-if="$slots.default" class="mt-4">
        <slot />
      </div>

      <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          class="btn btn-secondary"
          @click="requestCancel"
        >
          {{ cancelLabel }}
        </button>
        <button
          type="button"
          class="btn"
          :class="tone === 'danger' ? 'btn-danger' : 'btn-primary'"
          :disabled="confirmDisabled"
          @click="emit('confirm')"
        >
          {{ confirmLabel }}
        </button>
      </div>
    </div>
  </dialog>
</template>
