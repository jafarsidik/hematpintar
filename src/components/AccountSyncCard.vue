<script setup lang="ts">
import { computed } from 'vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { useCloudSyncStore } from '@/stores/cloudSync'
import { useEntitlementStore } from '@/stores/entitlements'
import { useSimulationStore } from '@/stores/simulations'

const authStore = useAuthStore()
const entitlementStore = useEntitlementStore()
const syncStore = useCloudSyncStore()
const simulationStore = useSimulationStore()

const localCount = computed(() => simulationStore.items.length)

const backedUpCount = computed(() => {
  const userId = authStore.user?.id
  if (!userId) return 0

  return simulationStore.items.filter((record) => {
    if (record.cloudUserId !== userId || !record.syncedAt) return false
    const syncedTime = Date.parse(record.syncedAt)
    const updatedTime = Date.parse(record.updatedAt)
    return (
      Number.isFinite(syncedTime) &&
      Number.isFinite(updatedTime) &&
      syncedTime >= updatedTime
    )
  }).length
})

const notBackedUpCount = computed(() =>
  Math.max(0, localCount.value - backedUpCount.value),
)

const planTone = computed(() =>
  entitlementStore.isPremium ? ('success' as const) : ('neutral' as const),
)

const summaryText = computed(() => {
  const summary = syncStore.summary
  if (!summary) return ''

  const parts: string[] = []
  if (summary.uploaded > 0) {
    parts.push(`${summary.uploaded} simulasi diunggah ke akun.`)
  }
  if (summary.downloaded > 0) {
    parts.push(`${summary.downloaded} simulasi dipulihkan ke perangkat.`)
  }
  if (summary.conflicts > 0) {
    parts.push(
      `${summary.conflicts} versi berbeda memakai data dengan updated_at terbaru.`,
    )
  }
  if (summary.upToDate > 0) {
    parts.push(`${summary.upToDate} simulasi sudah sama.`)
  }
  if (summary.invalid > 0) {
    parts.push(
      `${summary.invalid} data akun tidak valid dan dilewati. Data lokal tidak dihapus.`,
    )
  }

  return parts.length > 0 ? parts.join(' ') : 'Tidak ada perubahan data.'
})

function setConflictOpen(open: boolean): void {
  if (!open) syncStore.cancelPending()
}
</script>

<template>
  <section class="card p-5" aria-labelledby="judul-akun-sync">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div class="flex flex-wrap items-center gap-2">
          <h2 id="judul-akun-sync" class="text-base font-semibold text-slate-900">
            Cadangan ke akun
          </h2>
          <StatusBadge label="Opsional" tone="neutral" />
        </div>
        <p class="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
          Data tetap tersimpan di perangkat ini. Login dan cadangan akun
          bersifat opsional; tidak ada sinkronisasi otomatis.
        </p>
      </div>

      <StatusBadge
        v-if="authStore.isAuthenticated"
        :label="
          entitlementStore.loading
            ? 'Memuat paket...'
            : entitlementStore.planLabel
        "
        :tone="planTone"
      />
    </div>

    <div
      v-if="!isSupabaseConfigured"
      class="mt-4 rounded-lg border border-warning-200 bg-warning-50 p-4 text-sm leading-relaxed text-warning-700"
      role="status"
    >
      Login belum tersedia karena Supabase belum dikonfigurasi. Aplikasi tetap
      berjalan dan seluruh data hanya tersimpan di perangkat ini.
    </div>

    <p
      v-else-if="authStore.loading"
      class="mt-4 text-sm text-slate-600"
      aria-live="polite"
    >
      Memeriksa sesi akun...
    </p>

    <div v-else-if="!authStore.isAuthenticated" class="mt-4">
      <p class="text-sm leading-relaxed text-slate-600">
        Belum masuk. Semua simulasi masih tersimpan di perangkat ini dan belum
        tercadangkan ke akun.
      </p>
      <RouterLink to="/login" class="btn btn-secondary mt-3">
        Masuk ke akun
      </RouterLink>
    </div>

    <div v-else class="mt-4 space-y-4">
      <p class="text-sm text-slate-600">
        Masuk sebagai
        <strong class="font-medium text-slate-900">{{ authStore.username }}</strong>
        dengan paket
        <strong class="font-medium text-slate-900">
          {{ entitlementStore.planLabel }}
        </strong>.
      </p>

      <div class="grid gap-3 sm:grid-cols-3">
        <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p class="text-xs font-medium uppercase tracking-wide text-slate-500">
            Di perangkat
          </p>
          <p class="mt-1 text-lg font-semibold text-slate-900">
            {{ localCount }} simulasi
          </p>
        </div>
        <div class="rounded-lg border border-success-200 bg-success-50 p-3">
          <p class="text-xs font-medium uppercase tracking-wide text-success-700">
            Tercadangkan ke akun ini
          </p>
          <p class="mt-1 text-lg font-semibold text-success-700">
            {{ backedUpCount }} simulasi
          </p>
        </div>
        <div class="rounded-lg border border-warning-200 bg-warning-50 p-3">
          <p class="text-xs font-medium uppercase tracking-wide text-warning-700">
            Belum dicadangkan
          </p>
          <p class="mt-1 text-lg font-semibold text-warning-700">
            {{ notBackedUpCount }} simulasi
          </p>
        </div>
      </div>

      <p
        v-if="entitlementStore.error"
        class="rounded-lg border border-warning-200 bg-warning-50 p-3 text-sm text-warning-700"
        role="status"
      >
        {{ entitlementStore.error }}
      </p>

      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="btn btn-primary"
          :disabled="syncStore.busy"
          @click="syncStore.start('upload')"
        >
          {{ syncStore.busy ? 'Memproses...' : 'Cadangkan ke akun' }}
        </button>
        <button
          type="button"
          class="btn btn-secondary"
          :disabled="syncStore.busy"
          @click="syncStore.start('restore')"
        >
          {{ syncStore.busy ? 'Memproses...' : 'Pulihkan dari akun' }}
        </button>
        <RouterLink to="/login" class="btn btn-ghost">
          Kelola akun
        </RouterLink>
      </div>

      <p
        v-if="syncStore.error"
        class="rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-700"
        role="alert"
      >
        {{ syncStore.error }}
      </p>

      <p
        v-if="summaryText"
        class="rounded-lg border border-primary-200 bg-primary-50 p-3 text-sm text-primary-700"
        aria-live="polite"
      >
        {{ summaryText }}
      </p>

      <p class="text-xs leading-relaxed text-slate-500">
        Status “Tercadangkan ke akun” hanya muncul setelah unggahan berhasil.
        Data lokal yang lebih baru tidak ditimpa tanpa konfirmasi, dan data
        lokal yang tidak ada di akun tidak dihapus.
      </p>
    </div>

    <ConfirmDialog
      :open="syncStore.pending !== null"
      title="Versi data berbeda"
      :message="syncStore.conflictMessage"
      confirm-label="Gunakan versi terbaru"
      :confirm-disabled="syncStore.busy"
      @update:open="setConflictOpen"
      @confirm="syncStore.confirmPending"
      @cancel="syncStore.cancelPending"
    >
      <p class="rounded-lg border border-warning-200 bg-warning-50 p-3 text-sm leading-relaxed text-warning-700">
        Tidak ada data lokal yang dihapus. Konfirmasi hanya menerapkan versi
        dengan <code class="font-mono">updated_at</code> terbaru.
      </p>
    </ConfirmDialog>
  </section>
</template>
