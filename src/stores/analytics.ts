import { defineStore } from 'pinia'
import { ref } from 'vue'
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client'
import type { ModuleType } from '@/lib/storage/schemas'
import { useAuthStore } from '@/stores/auth'

export type AnalyticsEventName =
  | 'module_open'
  | 'simulation_saved'
  | 'upgrade_click'

const CONSENT_KEY = 'hematpintar.analytics-consent'

function readConsent(): boolean {
  if (typeof localStorage === 'undefined') return false
  try {
    return localStorage.getItem(CONSENT_KEY) === 'true'
  } catch {
    return false
  }
}

/**
 * Analitik lokal-ke-Supabase tanpa pihak ketiga dan tanpa data finansial.
 * Event hanya dikirim bila pengguna login DAN memberikan persetujuan.
 */
export const useAnalyticsStore = defineStore('analytics', () => {
  const authStore = useAuthStore()
  const consent = ref(readConsent())

  function setConsent(value: boolean): void {
    consent.value = value
    if (typeof localStorage === 'undefined') return

    try {
      localStorage.setItem(CONSENT_KEY, String(value))
    } catch {
      // Preferensi analitik tidak boleh mengganggu penggunaan aplikasi.
    }
  }

  async function track(
    eventName: AnalyticsEventName,
    moduleType: ModuleType | null = null,
  ): Promise<void> {
    if (!consent.value || !supabase || !isSupabaseConfigured) return

    // Jangan memblokir UI: pemanggil memakai `void track(...)`.
    await authStore.initialize()
    const user = authStore.user
    if (!user) return

    try {
      await supabase.from('events').insert({
        user_id: user.id,
        event_name: eventName,
        module_type: moduleType,
      })
    } catch {
      // Kegagalan analitik tidak boleh muncul sebagai error produk.
    }
  }

  return {
    consent,
    setConsent,
    track,
  }
})
