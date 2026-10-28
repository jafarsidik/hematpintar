import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ToastTone = 'success' | 'warning' | 'error' | 'info'

export interface ToastItem {
  id: string
  tone: ToastTone
  message: string
}

export const useToastStore = defineStore('toasts', () => {
  const items = ref<ToastItem[]>([])
  const timers = new Map<string, ReturnType<typeof setTimeout>>()

  function dismiss(id: string): void {
    const timer = timers.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.delete(id)
    }
    items.value = items.value.filter((item) => item.id !== id)
  }

  function push(
    tone: ToastTone,
    message: string,
    durationMs = 5000,
  ): string {
    const id = crypto.randomUUID()
    items.value.push({ id, tone, message })

    if (durationMs > 0) {
      timers.set(
        id,
        setTimeout(() => dismiss(id), durationMs),
      )
    }
    return id
  }

  function success(message: string): string {
    return push('success', message)
  }

  function error(message: string): string {
    return push('error', message, 8000)
  }

  function warning(message: string): string {
    return push('warning', message)
  }

  function info(message: string): string {
    return push('info', message)
  }

  return { items, push, dismiss, success, error, warning, info }
})
