<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { fileDateStamp } from '@/lib/format-date'
import {
  createBackup,
  deleteAllData,
  importBackup,
  parseBackup,
  serializeBackup,
} from '@/lib/storage/backup'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { downloadTextFile } from '@/lib/storage/download'
import { errorMessage } from '@/lib/storage/errors'
import type { BackupData } from '@/lib/storage/schemas'
import { useAnalyticsStore } from '@/stores/analytics'
import { useAuthStore } from '@/stores/auth'
import { useSimulationStore } from '@/stores/simulations'
import { useToastStore } from '@/stores/toast'

interface PendingImport {
  fileName: string
  json: string
  data: BackupData
}

const simulationStore = useSimulationStore()
const toastStore = useToastStore()
const authStore = useAuthStore()
const analyticsStore = useAnalyticsStore()

const fileInput = ref<HTMLInputElement | null>(null)
const pendingImport = ref<PendingImport | null>(null)
const importError = ref<string | null>(null)
const deleteOpen = ref(false)
const busy = ref(false)

const importOpen = computed({
  get: () => pendingImport.value !== null,
  set: (open: boolean) => {
    if (!open) pendingImport.value = null
  },
})

const importMessage = computed(() => {
  const pending = pendingImport.value
  if (!pending) return ''
  return `Berkas "${pending.fileName}" berisi ${pending.data.simulations.length} simulasi dan ${pending.data.products.length} produk. Semua data yang ada saat ini akan diganti. Unduh backup data saat ini jika belum.`
})

onMounted(() => {
  void simulationStore.load()
})

async function exportBackup(): Promise<void> {
  busy.value = true
  const result = await createBackup()
  busy.value = false

  if (!result.ok) {
    toastStore.error(errorMessage(result.errors))
    return
  }

  downloadTextFile(
    `hematpintar-backup-${fileDateStamp()}.json`,
    serializeBackup(result.value),
    'application/json;charset=utf-8',
  )
  toastStore.success('Backup JSON seluruh data berhasil diunduh.')
}

function chooseFile(): void {
  fileInput.value?.click()
}

async function onFileSelected(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  importError.value = null

  if (file.size > 10 * 1024 * 1024) {
    importError.value = 'Berkas terlalu besar; ukuran maksimal 10 MB.'
    toastStore.error('Berkas backup terlalu besar (maksimal 10 MB).')
    return
  }

  let text: string
  try {
    text = await file.text()
  } catch {
    importError.value =
      'Berkas tidak dapat dibaca. Periksa izin berkas lalu coba lagi.'
    toastStore.error('Berkas backup tidak dapat dibaca.')
    return
  }

  const parsed = parseBackup(text)
  if (!parsed.ok) {
    const first = parsed.errors[0]?.message ?? 'Isi berkas tidak valid.'
    importError.value =
      parsed.errors.length > 1
        ? `${first} Ditemukan ${parsed.errors.length} masalah pada berkas.`
        : first
    toastStore.error('Backup tidak valid. Data lama tidak diubah.')
    return
  }

  pendingImport.value = {
    fileName: file.name,
    json: text,
    data: parsed.value,
  }
}

async function confirmImport(): Promise<void> {
  const pending = pendingImport.value
  if (!pending) return

  busy.value = true
  const result = await importBackup(pending.json)
  busy.value = false

  if (!result.ok) {
    importError.value = errorMessage(result.errors)
    toastStore.error('Impor gagal. Data lama tidak diubah.')
    return
  }

  pendingImport.value = null
  importError.value = null
  await simulationStore.load()
  toastStore.success(
    `Backup dipulihkan: ${result.value.simulations.length} simulasi dan ${result.value.products.length} produk.`,
  )
}

function onAnalyticsConsentChange(event: Event): void {
  const input = event.target as HTMLInputElement
  analyticsStore.setConsent(input.checked)
}

async function confirmDeleteAll(): Promise<void> {
  busy.value = true
  const result = await deleteAllData()
  busy.value = false

  if (!result.ok) {
    deleteOpen.value = false
    toastStore.error(errorMessage(result.errors))
    return
  }

  deleteOpen.value = false
  await simulationStore.load()
  toastStore.success('Semua data di perangkat ini telah dihapus.')
}
</script>

<template>
  <div class="space-y-6">
    <header>
      <div class="flex flex-wrap items-center gap-2">
        <p class="text-sm font-medium text-primary-700">Pengaturan</p>
        <StatusBadge label="Data lokal" tone="info" />
      </div>
      <h1 class="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
        Pengaturan data
      </h1>
      <p class="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
        Unduh backup, pulihkan data, atau hapus seluruh data yang tersimpan di
        perangkat ini.
      </p>
    </header>

    <p
      v-if="importError"
      class="rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-700"
      role="alert"
    >
      {{ importError }}
    </p>

    <div
      v-if="simulationStore.error"
      class="rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-700"
      role="alert"
    >
      <p>{{ simulationStore.error }}</p>
      <button
        type="button"
        class="btn btn-secondary mt-3"
        @click="simulationStore.load()"
      >
        Coba lagi
      </button>
    </div>

    <section class="card p-5" aria-labelledby="judul-backup">
      <h2 id="judul-backup" class="text-base font-semibold text-slate-900">
        Backup dan pemulihan
      </h2>
      <p class="mt-2 text-sm leading-relaxed text-slate-600">
        Backup JSON berisi seluruh simulasi, produk, dan pengaturan. Simpan
        berkas di tempat aman sebelum menghapus data browser.
      </p>

      <div class="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          class="btn btn-primary"
          :disabled="busy"
          @click="exportBackup"
        >
          {{ busy ? 'Memproses...' : 'Unduh backup JSON' }}
        </button>
        <button
          type="button"
          class="btn btn-secondary"
          :disabled="busy"
          @click="chooseFile"
        >
          Impor backup JSON
        </button>
        <input
          ref="fileInput"
          type="file"
          accept="application/json,.json"
          class="hidden"
          aria-label="Pilih berkas backup JSON"
          @change="onFileSelected"
        />
      </div>

      <p class="mt-3 text-xs leading-relaxed text-slate-500">
        Impor akan memvalidasi seluruh isi berkas terlebih dahulu. Berkas rusak
        ditolak dan data lama tidak diubah.
      </p>
    </section>

    <section class="card p-5" aria-labelledby="judul-analitik">
      <div class="flex flex-wrap items-center gap-2">
        <h2 id="judul-analitik" class="text-base font-semibold text-slate-900">
          Analitik anonim
        </h2>
        <StatusBadge
          :label="analyticsStore.consent ? 'Aktif' : 'Mati'"
          :tone="analyticsStore.consent ? 'success' : 'neutral'"
        />
      </div>
      <p class="mt-2 text-sm leading-relaxed text-slate-600">
        Jika diaktifkan dan Anda login, aplikasi mencatat event sederhana
        <strong class="font-medium text-slate-900">
          buka modul, simpan simulasi, dan klik upgrade
        </strong>
        ke tabel Supabase milik aplikasi. Tidak ada nominal, nama produk, email,
        isi simulasi, atau data finansial yang dikirim. Tanpa login, tidak ada
        event yang dikirim.
      </p>

      <label
        for="analitik-consent"
        class="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3"
      >
        <input
          id="analitik-consent"
          type="checkbox"
          class="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
          :checked="analyticsStore.consent"
          @change="onAnalyticsConsentChange"
        />
        <span class="text-sm leading-relaxed text-slate-700">
          Saya setuju mengirim event analitik anonim saat saya login.
        </span>
      </label>

      <p
        v-if="!isSupabaseConfigured"
        class="mt-3 rounded-lg border border-warning-200 bg-warning-50 p-3 text-sm text-warning-700"
      >
        Supabase belum dikonfigurasi, jadi event tidak akan dikirim. Preferensi
        ini tetap disimpan di perangkat.
      </p>
      <p
        v-else-if="!authStore.isAuthenticated"
        class="mt-3 text-xs leading-relaxed text-slate-500"
      >
        Anda belum login. Event baru akan dikirim setelah login dengan
        persetujuan ini tetap aktif.
      </p>
    </section>

    <section
      class="rounded-card border border-error-200 bg-white p-5 shadow-sm"
      aria-labelledby="judul-hapus"
    >
      <div class="flex flex-wrap items-center gap-2">
        <h2 id="judul-hapus" class="text-base font-semibold text-slate-900">
          Hapus semua data
        </h2>
        <StatusBadge label="Tindakan permanen" tone="danger" />
      </div>
      <p class="mt-2 text-sm leading-relaxed text-slate-600">
        Menghapus semua simulasi dan produk dari perangkat ini. Pengaturan
        dikembalikan ke bawaan. Tindakan ini tidak dapat dibatalkan.
      </p>

      <button
        type="button"
        class="btn btn-danger mt-4"
        :disabled="busy"
        @click="deleteOpen = true"
      >
        Hapus semua data
      </button>
    </section>

    <section
      class="rounded-card border border-warning-200 bg-warning-50 p-5"
      aria-labelledby="judul-catatan"
    >
      <div class="flex flex-wrap items-center gap-2">
        <h2 id="judul-catatan" class="text-base font-semibold text-warning-700">
          Catatan penyimpanan
        </h2>
        <StatusBadge label="Perlu diketahui" tone="warning" />
      </div>
      <p class="mt-2 text-sm leading-relaxed text-warning-700">
        Data utama tersimpan di perangkat ini dan bisa hilang jika data browser
        atau penyimpanan situs dihapus. Jika login, Anda dapat mencadangkan
        simulasi ke akun dari halaman Riwayat. Tidak ada sinkronisasi otomatis;
        unduh backup JSON secara berkala.
      </p>
    </section>

    <ConfirmDialog
      v-model:open="importOpen"
      title="Impor dan ganti semua data?"
      :message="importMessage"
      confirm-label="Impor & ganti data"
      tone="danger"
      :confirm-disabled="busy"
      @confirm="confirmImport"
    >
      <p
        v-if="importError"
        class="mb-3 rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-700"
        role="alert"
      >
        {{ importError }}
      </p>
      <button
        type="button"
        class="btn btn-secondary w-full"
        :disabled="busy"
        @click="exportBackup"
      >
        Unduh backup data saat ini
      </button>
    </ConfirmDialog>

    <ConfirmDialog
      v-model:open="deleteOpen"
      title="Hapus semua data?"
      message="Semua simulasi dan produk akan dihapus permanen dari perangkat ini. Pengaturan dikembalikan ke bawaan. Tindakan ini tidak dapat dibatalkan."
      confirm-label="Hapus semua data"
      tone="danger"
      :confirm-disabled="busy"
      @confirm="confirmDeleteAll"
    >
      <button
        type="button"
        class="btn btn-secondary w-full"
        :disabled="busy"
        @click="exportBackup"
      >
        Unduh backup dulu
      </button>
    </ConfirmDialog>
  </div>
</template>
