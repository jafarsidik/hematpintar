<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import StatusBadge from '@/components/StatusBadge.vue'
import { safeRedirectPath } from '@/router/guard'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { useEntitlementStore } from '@/stores/entitlements'

type AuthMode = 'login' | 'register' | 'reset'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const entitlementStore = useEntitlementStore()

const mode = ref<AuthMode>('login')
const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const resetPassword = ref('')
const showPassword = ref(false)
const localError = ref<string | null>(null)
const successMessage = ref<string | null>(null)

const enablePasswordReset = computed(
  () =>
    (import.meta.env.VITE_ENABLE_PASSWORD_RESET ?? '').toLowerCase() === 'true',
)

const isRegister = computed(() => mode.value === 'register')
const isReset = computed(() => mode.value === 'reset')
const passwordInputType = computed(() =>
  showPassword.value ? 'text' : 'password',
)
const planTone = computed(() =>
  entitlementStore.isPremium ? ('success' as const) : ('neutral' as const),
)
const formError = computed(() => localError.value ?? authStore.error)
const canSubmit = computed(() => {
  if (authStore.submitting) return false
  if (isReset.value) {
    return resetPassword.value.trim() !== '' && password.value.length >= 8
  }
  if (username.value.trim() === '' || password.value === '') return false
  if (isRegister.value && confirmPassword.value === '') return false
  return true
})

function clearMessages(): void {
  authStore.clearError()
  localError.value = null
  successMessage.value = null
}

function switchMode(nextMode: AuthMode): void {
  if (mode.value === nextMode) return
  mode.value = nextMode
  password.value = ''
  confirmPassword.value = ''
  resetPassword.value = ''
  showPassword.value = false
  clearMessages()
}

async function submit(): Promise<void> {
  if (!canSubmit.value) return

  clearMessages()

  if (isReset.value) {
    const success = await authStore.resetPasswordForEmail(username.value)
    if (success) {
      mode.value = 'login'
      successMessage.value =
        'Jika email terdaftar, kami telah mengirimkan instruksi reset password.'
    }
    return
  }

  if (isRegister.value && password.value !== confirmPassword.value) {
    localError.value = 'Konfirmasi password baru tidak cocok.'
    return
  }

  if (mode.value === 'login') {
    const success = await authStore.signIn(username.value, password.value)
    if (success) {
      await router.replace(safeRedirectPath(route.query.redirect))
    }
    return
  }

  const success = await authStore.signUp(username.value, password.value)
  if (!success) return

  if (authStore.isAuthenticated) {
    await router.replace(safeRedirectPath(route.query.redirect))
    return
  }

  mode.value = 'login'
  password.value = ''
  confirmPassword.value = ''
  showPassword.value = false
  successMessage.value =
    'Akun berhasil dibuat. Silakan masuk dengan email dan password.'
}

async function logout(): Promise<void> {
  clearMessages()
  if (await authStore.signOut()) {
    successMessage.value = 'Anda sudah keluar dari akun.'
  }
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
        Masuk atau daftar
      </h1>
      <p class="mt-2 text-sm leading-relaxed text-slate-600">
        Login memakai email dan password. Tidak ada OTP, atau tautan masuk.
        Kalkulator tetap berjalan tanpa akun dan tanpa internet.
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
      <RouterLink to="/" class="btn btn-secondary mt-4">
        Ke dashboard
      </RouterLink>
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

      <p
        v-if="successMessage"
        class="mt-4 rounded-lg border border-success-200 bg-success-50 p-3 text-sm text-success-700"
        role="status"
      >
        {{ successMessage }}
      </p>

      <div class="mt-4 flex flex-wrap gap-2">
        <RouterLink to="/" class="btn btn-primary">Ke dashboard</RouterLink>
        <RouterLink to="/settings" class="btn btn-secondary">
          Ganti password
        </RouterLink>
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

    <section v-else class="card p-5" aria-labelledby="judul-form-akun">
      <h2 id="judul-form-akun" class="text-base font-semibold text-slate-900">
        {{ isRegister ? 'Buat akun' : isReset ? 'Lupa password' : 'Masuk ke akun' }}
      </h2>

      <div
        class="mt-4 flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1"
        role="tablist"
        aria-label="Pilih masuk atau daftar"
      >
        <button
          type="button"
          role="tab"
          :aria-selected="mode === 'login'"
          class="rounded-md px-3 py-2 text-sm font-medium transition"
          :class="
            mode === 'login'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          "
          @click="switchMode('login')"
        >
          Masuk
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="mode === 'register'"
          class="rounded-md px-3 py-2 text-sm font-medium transition"
          :class="
            mode === 'register'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          "
          @click="switchMode('register')"
        >
          Daftar
        </button>
        <button
          v-if="enablePasswordReset"
          type="button"
          role="tab"
          :aria-selected="mode === 'reset'"
          class="rounded-md px-3 py-2 text-sm font-medium transition"
          :class="
            mode === 'reset'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          "
          @click="switchMode('reset')"
        >
          Lupa password
        </button>
      </div>

      <p class="mt-4 text-sm leading-relaxed text-slate-600">
        <template v-if="isRegister">
          Buat akun untuk mencadangkan simulasi dan membaca status paket.
        </template>
        <template v-else>
          Masukkan email dan password yang kamu daftarkan.
        </template>
      </p>

      <form class="mt-4 space-y-4" @submit.prevent="submit">
        <div>
          <label for="auth-email" class="label-base">
            Email
            <span class="text-error-600" aria-hidden="true">*</span>
          </label>
          <input
            id="auth-email"
            v-model="username"
            type="email"
            class="input-base"
            autocomplete="email"
            autocapitalize="none"
            spellcheck="false"
            placeholder="contoh: budi@contoh.com"
            required
            :disabled="authStore.submitting"
            :aria-invalid="formError ? 'true' : undefined"
            @input="clearMessages"
          />
          <p class="mt-1 text-xs text-slate-500">
            Alamat email yang digunakan saat daftar.
          </p>
        </div>

        <div>
          <label for="auth-password" class="label-base">
            Password
            <span class="text-error-600" aria-hidden="true">*</span>
          </label>
          <div class="relative">
            <input
              id="auth-password"
              v-model="password"
              :type="passwordInputType"
              class="input-base pr-24"
              :autocomplete="isRegister ? 'new-password' : 'current-password'"
              placeholder="Minimal 8 karakter"
              required
              :disabled="authStore.submitting"
              :aria-invalid="formError ? 'true' : undefined"
              @input="clearMessages"
            />
            <button
              type="button"
              class="absolute inset-y-0 right-0 rounded-r-lg px-3 text-xs font-semibold text-primary-700 hover:bg-primary-50"
              :aria-pressed="showPassword"
              :aria-label="
                showPassword ? 'Sembunyikan password' : 'Tampilkan password'
              "
              @click="showPassword = !showPassword"
            >
              {{ showPassword ? 'Sembunyikan' : 'Tampilkan' }}
            </button>
          </div>
        </div>

        <div v-if="isRegister">
          <label for="auth-confirm-password" class="label-base">
            Ulangi password
            <span class="text-error-600" aria-hidden="true">*</span>
          </label>
          <input
            id="auth-confirm-password"
            v-model="confirmPassword"
            :type="passwordInputType"
            class="input-base"
            autocomplete="new-password"
            placeholder="Ulangi password"
            required
            :disabled="authStore.submitting"
            :aria-invalid="formError ? 'true' : undefined"
            @input="clearMessages"
          />
        </div>

        <p
          v-if="formError"
          class="rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-700"
          role="alert"
        >
          {{ formError }}
        </p>

        <p
          v-if="successMessage"
          class="rounded-lg border border-success-200 bg-success-50 p-3 text-sm text-success-700"
          role="status"
        >
          {{ successMessage }}
        </p>

        <button
          type="submit"
          class="btn btn-primary w-full"
          :disabled="!canSubmit"
        >
          <template v-if="authStore.submitting">
            {{ isRegister ? 'Mendaftar...' : isReset ? 'Mengirim...' : 'Masuk...' }}
          </template>
          <template v-else>
            {{ isRegister ? 'Daftar' : isReset ? 'Atur ulang password' : 'Masuk' }}
          </template>
        </button>
      </form>

      <form
        v-if="isReset"
        class="mt-4 space-y-4"
        @submit.prevent="submit"
      >
        <div>
          <label for="auth-reset-email" class="label-base">
            Email
            <span class="text-error-600" aria-hidden="true">*</span>
          </label>
          <input
            id="auth-reset-email"
            v-model="username"
            type="email"
            class="input-base"
            autocomplete="email"
            placeholder="contoh: budi@contoh.com"
            required
            :disabled="authStore.submitting"
            :aria-invalid="formError ? 'true' : undefined"
            @input="clearMessages"
          />
        </div>

        <p
          v-if="formError"
          class="rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-700"
          role="alert"
        >
          {{ formError }}
        </p>

        <p
          v-if="successMessage"
          class="rounded-lg border border-success-200 bg-success-50 p-3 text-sm text-success-700"
          role="status"
        >
          {{ successMessage }}
        </p>

        <button
          type="submit"
          class="btn btn-primary w-full"
          :disabled="!canSubmit"
        >
          <template v-if="authStore.submitting">
            Mengirim...
          </template>
          <template v-else>
            Atur ulang password
          </template>
        </button>

        <button
          type="button"
          class="btn btn-ghost w-full mt-2"
          @click="switchMode('login')"
        >
          Kembali ke masuk
        </button>
      </form>

      <p class="mt-4 text-xs leading-relaxed text-slate-500">
        Tidak ada OTP, atau tautan login. Jika lupa password,
        <span v-if="enablePasswordReset" class="text-primary-700 cursor-pointer" @click="mode = 'reset'">
          atur ulang password
        </span>
        <span v-else>hubungi admin untuk reset.</span>
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
        Paket efektif dibaca dari tabel <code>entitlements</code> setelah login.
        Tanpa login, aplikasi memakai paket Free. Paket berbayar yang sudah
        melewati masa berlaku otomatis dianggap Free.
      </p>
    </section>
  </div>
</template>
