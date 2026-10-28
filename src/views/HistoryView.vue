<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import EmptyState from '@/components/EmptyState.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { fileDateStamp, formatDateTime } from '@/lib/format-date'
import { MODULES, moduleInfo } from '@/lib/modules'
import { downloadCsv } from '@/lib/storage/download'
import { errorMessage } from '@/lib/storage/errors'
import { simulationsToCsv } from '@/lib/storage/csv'
import type { ModuleType, SimulationRecord } from '@/lib/storage/schemas'
import { useSimulationStore } from '@/stores/simulations'
import { useToastStore } from '@/stores/toast'

type FilterValue = 'all' | ModuleType

const simulationStore = useSimulationStore()
const toastStore = useToastStore()
const router = useRouter()

const filter = ref<FilterValue>('all')
const exportModule = ref<ModuleType>('household')

const renameTarget = ref<SimulationRecord | null>(null)
const renameValue = ref('')
const deleteTarget = ref<SimulationRecord | null>(null)

const filtered = computed(() =>
  filter.value === 'all'
    ? simulationStore.items
    : simulationStore.items.filter(
        (simulation) => simulation.moduleType === filter.value,
      ),
)

const renameOpen = computed({
  get: () => renameTarget.value !== null,
  set: (open: boolean) => {
    if (!open) renameTarget.value = null
  },
})

const deleteOpen = computed({
  get: () => deleteTarget.value !== null,
  set: (open: boolean) => {
    if (!open) deleteTarget.value = null
  },
})

const deleteMessage = computed(() =>
  deleteTarget.value
    ? `Simulasi "${deleteTarget.value.name}" akan dihapus permanen dari perangkat ini. Tindakan ini tidak dapat dibatalkan.`
    : '',
)

onMounted(() => {
  void simulationStore.load()
})

function startRename(simulation: SimulationRecord): void {
  renameTarget.value = simulation
  renameValue.value = simulation.name
}

function editSimulation(simulation: SimulationRecord): void {
  if (simulation.moduleType === 'margin') {
    void router.push({
      path: '/margin-rescue',
      query: { simulation: simulation.id },
    })
    return
  }
  startRename(simulation)
}

async function saveRename(): Promise<void> {
  const target = renameTarget.value
  if (!target) return

  const result = await simulationStore.update(target.id, {
    name: renameValue.value,
  })
  if (!result.ok) {
    toastStore.error(errorMessage(result.errors))
    return
  }

  renameTarget.value = null
  toastStore.success('Nama simulasi diperbarui.')
}

async function duplicate(simulation: SimulationRecord): Promise<void> {
  const result = await simulationStore.duplicate(simulation.id)
  if (!result.ok) {
    toastStore.error(errorMessage(result.errors))
    return
  }

  toastStore.success(`"${simulation.name}" berhasil diduplikasi.`)
}

async function confirmDelete(): Promise<void> {
  const target = deleteTarget.value
  if (!target) return

  const result = await simulationStore.remove(target.id)
  if (!result.ok) {
    toastStore.error(errorMessage(result.errors))
    return
  }

  deleteTarget.value = null
  toastStore.success('Simulasi dihapus dari perangkat ini.')
}

function exportCsv(): void {
  const module = exportModule.value
  const records = simulationStore.items.filter(
    (simulation) => simulation.moduleType === module,
  )
  const csv = simulationsToCsv(module, records)
  downloadCsv(
    `hematpintar-${module}-${fileDateStamp()}.csv`,
    csv,
  )

  toastStore.success(
    records.length === 0
      ? `Berkas CSV ${moduleInfo(module).shortLabel} diunduh; belum ada simulasi untuk modul ini.`
      : `CSV ${moduleInfo(module).shortLabel} berisi ${records.length} simulasi.`,
  )
}
</script>

<template>
  <div class="space-y-6">
    <header class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="text-sm font-medium text-primary-700">Riwayat</p>
        <h1 class="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Semua simulasi
        </h1>
        <p class="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          Buka simulasi Margin Rescue untuk mengedit perhitungan, edit nama
          simulasi lain, duplikasi, atau hapus data di perangkat ini. Ekspor CSV
          tersedia per modul.
        </p>
      </div>

      <div class="flex flex-wrap items-end gap-2">
        <div>
          <label for="export-modul" class="label-base">Modul CSV</label>
          <select
            id="export-modul"
            v-model="exportModule"
            class="input-base w-44"
          >
            <option
              v-for="module in MODULES"
              :key="module.type"
              :value="module.type"
            >
              {{ module.shortLabel }}
            </option>
          </select>
        </div>
        <button type="button" class="btn btn-secondary" @click="exportCsv">
          Ekspor CSV
        </button>
      </div>
    </header>

    <div class="flex flex-wrap items-end gap-2">
      <div>
        <label for="filter-riwayat" class="label-base">Filter modul</label>
        <select
          id="filter-riwayat"
          v-model="filter"
          class="input-base w-52"
        >
          <option value="all">Semua modul</option>
          <option
            v-for="module in MODULES"
            :key="module.type"
            :value="module.type"
          >
            {{ module.label }}
          </option>
        </select>
      </div>
      <p class="pb-2 text-sm text-slate-500">
        {{ filtered.length }} simulasi ditampilkan
      </p>
    </div>

    <p
      v-if="simulationStore.loading"
      class="text-sm text-slate-600"
      aria-live="polite"
    >
      Memuat riwayat dari perangkat...
    </p>

    <div
      v-else-if="simulationStore.error"
      class="rounded-lg border border-error-200 bg-error-50 p-4 text-sm text-error-700"
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

    <div v-else-if="filtered.length === 0" class="card">
      <EmptyState
        title="Tidak ada simulasi"
        :description="
          filter === 'all'
            ? 'Simulasi yang Anda simpan akan muncul di sini.'
            : 'Belum ada simulasi untuk modul yang dipilih.'
        "
      >
        <RouterLink to="/" class="btn btn-secondary">
          Kembali ke dashboard
        </RouterLink>
      </EmptyState>
    </div>

    <ul v-else class="space-y-3">
      <li
        v-for="simulation in filtered"
        :key="simulation.id"
        class="card p-4"
      >
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="break-words text-base font-semibold text-slate-900">
                {{ simulation.name }}
              </h2>
              <StatusBadge
                :label="moduleInfo(simulation.moduleType).shortLabel"
                tone="neutral"
              />
            </div>
            <p class="mt-1 text-xs text-slate-500">
              {{ moduleInfo(simulation.moduleType).label }} · Diperbarui
              {{ formatDateTime(simulation.updatedAt) }}
            </p>
            <p class="mt-0.5 text-xs text-slate-400">
              Dibuat {{ formatDateTime(simulation.createdAt) }} · Skema versi
              {{ simulation.schemaVersion }}
            </p>
          </div>

          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="btn btn-secondary"
              @click="editSimulation(simulation)"
            >
              {{ simulation.moduleType === 'margin' ? 'Edit' : 'Edit nama' }}
            </button>
            <button
              type="button"
              class="btn btn-secondary"
              @click="duplicate(simulation)"
            >
              Duplikat
            </button>
            <button
              type="button"
              class="btn btn-ghost text-error-700 hover:bg-error-50"
              @click="deleteTarget = simulation"
            >
              Hapus
            </button>
          </div>
        </div>
      </li>
    </ul>

    <ConfirmDialog
      v-model:open="renameOpen"
      title="Edit nama simulasi"
      confirm-label="Simpan"
      :confirm-disabled="renameValue.trim().length === 0"
      @confirm="saveRename"
    >
      <label for="rename-simulasi" class="label-base">Nama simulasi</label>
      <input
        id="rename-simulasi"
        v-model="renameValue"
        type="text"
        class="input-base"
        maxlength="120"
        @keydown.enter.prevent="saveRename"
      />
      <p class="mt-1.5 text-xs text-slate-500">
        Nama membantu Anda menemukan simulasi di riwayat.
      </p>
    </ConfirmDialog>

    <ConfirmDialog
      v-model:open="deleteOpen"
      title="Hapus simulasi?"
      :message="deleteMessage"
      confirm-label="Hapus simulasi"
      tone="danger"
      @confirm="confirmDelete"
    />
  </div>
</template>
