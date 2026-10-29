<script setup lang="ts">
import { computed, ref } from 'vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { useEntitlementStore } from '@/stores/entitlements'

const authStore = useAuthStore()
const entitlementStore = useEntitlementStore()

const email = ref('')
const sent = ref(false)
const sentTo = ref('')

const canSubmit = computed(
  () => email.value.trim().length > 0 && !authStore.submitting,
)

const planTone = computed(() =>
  entitlementStore.isPremium ? ('success' as const) : ('neutral' as const),
)

function onEmailInput(): void {
  authStore.clearError()
  sent.value = false
}

async function submit(): Promise<void> {
  if (authStore.submitting) return
  sent.value = false
  const target = email.value.trim()
  const success = await authStore.login(target)
  if (success) {
    sent.value = true
    sentTo.value = target
  }
}

async function logout(): Promise<void> {
  sent.value = false
  await authStore.logout()
}
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <header>
      <div class="flex flex-wrap items-center gap-2">
        <p class="text-sm font-medium text-primary-700">Akun opsional</p>
        <StatusBadge label="Tanpa login tetap bisa" tone="info" />
      </div>
      <h1 class="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
        Masuk ke akun HematPintar
      </h1>
      <p class="mt-2 text-sm leading-relaxed text-slate-600">
        Login dipakai untuk membaca status paket dan mencadangkan simulasi ke
        akun. Kalkulator tetap berjalan tanpa akun dan tanpa internet.
      </p>
    </header>

    <div
      v-if="!isSupabaseConfigured"
      class="rounded-card border border-warning-200 bg-warning-50 p-5 text-sm leading-relaxed text-warning-700"
      role="status"
    >
      <p class="font-medium">Login belum tersedia.</p>
      <p class="mt-1">
        Konfigurasi Supabase belum diisi. Aplikasi tetap bisa dipakai dan semua
        data tersimpan di perangkat ini.
      </p>
    </div>

    <p
      v-else-if="authStore.loading"
      class="card p-5 text-sm text-slate-600"
      aria-live="polite"
    >
      Memeriksa sesi akun...
    </p>

    <section
      v-else-if="authStore.isAuthenticated"
      class="card p-5"
      aria-labelledby="judul-akun-masuk"
    >
      <div class="flex flex-wrap items-center gap-2">
        <h2 id="judul-akun-masuk" class="text-base font-semibold text-slate-900">
          Akun aktif
        </h2>
        <StatusBadge
          :label="
            entitlementStore.loading
              ? 'Memuat paket...'
              : entitlementStore.planLabel
          "
          :tone="planTone"
        />
      </div>

      <p class="mt-3 text-sm text-slate-600">
        Masuk sebagai
        <strong class="font-medium text-slate-900">{{ authStore.email }}</strong>.
      </p>
      <p class="mt-1 text-sm text-slate-600">
        Paket efektif saat ini:
        <strong class="font-medium text-slate-900">
          {{ entitlementStore.planLabel }}
        </strong>.
      </p>

      <p
        v-if="entitlementStore.error"
        class="mt-3 rounded-lg border border-warning-200 bg-warning-50 p-3 text-sm text-warning-700"
        role="status"
      >
        {{ entitlementStore.error }}
      </p>

      <div class="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
        Login tidak mengunggah simulasi secara otomatis. Buka
        <RouterLink to="/riwayat" class="font-medium text-primary-700 underline">
          Riwayat
        </RouterLink>
        lalu gunakan “Cadangkan ke akun” atau “Pulihkan dari akun”.
      </div>

      <div class="mt-4 flex flex-wrap gap-2">
        <RouterLink to="/" class="btn btn-primary">Ke dashboard</RouterLink>
        <RouterLink to="/riwayat" class="btn btn-secondary">Riwayat</RouterLink>
        <button
          type="button"
          class="btn btn-ghost"
          :disabled="authStore.submitting"
          @click="logout"
        >
          {{ authStore.submitting ? 'Keluar...' : 'Keluar' }}
        </button>
      </div>
    </section>

    <section v-else class="card p-5" aria-labelledby="judul-magic-link">
      <div class="flex flex-wrap items-center gap-2">
        <h2 id="judul-magic-link" class="text-base font-semibold text-slate-900">
          Masuk dengan tautan email
        </h2>
        <StatusBadge label="Magic link" tone="neutral" />
      </div>
      <p class="mt-1 text-sm leading-relaxed text-slate-600">
        Masukkan email. Kami akan mengirim tautan untuk masuk tanpa password.
      </p>

      <form class="mt-4 space-y-4" @submit.prevent="submit">
        <div>
          <label for="login-email" class="label-base">
            Alamat email
            <span class="text-error-600" aria-hidden="true">*</span>
          </label>
          <input
            id="login-email"
            v-model="email"
            type="email"
            class="input-base"
            autocomplete="email"
            inputmode="email"
            placeholder="nama@email.com"
            required
            :aria-invalid="authStore.error ? 'true' : undefined"
            @input="onEmailInput"
          />
        </div>

        <p
          v-if="authStore.error"
          class="rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-700"
          role="alert"
        >
          {{ authStore.error }}
        </p>

        <p
          v-if="sent"
          class="rounded-lg border border-success-200 bg-success-50 p-3 text-sm text-success-700"
          role="status"
        >
          Tautan login sudah dikirim ke {{ sentTo }}. Periksa inbox dan folder
          spam, lalu buka tautan tersebut di perangkat ini.
        </p>

        <button
          type="submit"
          class="btn btn-primary"
          :disabled="!canSubmit"
        >
          {{ authStore.submitting ? 'Mengirim...' : 'Kirim tautan login' }}
        </button>
      </form>

      <p class="mt-4 text-xs leading-relaxed text-slate-500">
        Login hanya diperlukan untuk fitur akun. Data simulasi tidak diunggah
        otomatis dan tetap tersimpan di perangkat ini sampai Anda menekan
        “Cadangkan ke akun”.
      </p>
    </section>

    <section
      class="rounded-card border border-slate-200 bg-white p-5 text-sm leading-relaxed text-slate-600 shadow-sm"
      aria-labelledby="judul-status-paket"
    >
      <h2 id="judul-status-paket" class="font-semibold text-slate-900">
        Status paket
      </h2>
      <p class="mt-1">
        Paket efektif dibaca dari akun setelah login. Tanpa login, aplikasi
        memakai paket Free. Paket berbayar yang sudah melewati masa berlaku
        otomatis dianggap Free.
      </p>
    </section>
  </div>
</template>
