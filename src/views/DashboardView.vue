<script setup lang="ts">
import { onMounted, ref } from 'vue'
import EmptyState from '@/components/EmptyState.vue'
import ModuleCard from '@/components/ModuleCard.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { formatDateTime } from '@/lib/format-date'
import { MODULES, moduleInfo } from '@/lib/modules'
import { useSimulationStore } from '@/stores/simulations'

const simulationStore = useSimulationStore()
const pickerOpen = ref(false)

onMounted(() => {
  void simulationStore.load()
})
</script>

<template>
  <div class="space-y-8">
    <section class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div class="flex flex-wrap items-center gap-2">
          <p class="text-sm font-medium text-primary-700">Dashboard</p>
          <StatusBadge label="Data lokal" tone="info" />
        </div>
        <h1 class="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Selamat datang di HematPintar
        </h1>
        <p class="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          Hitung keputusan belanja dan harga dengan angka yang jelas. Semua data
          tersimpan di perangkat ini.
        </p>
      </div>

      <div class="relative shrink-0">
        <button
          type="button"
          class="btn btn-primary w-full sm:w-auto"
          aria-haspopup="true"
          aria-controls="buat-simulasi-menu"
          :aria-expanded="pickerOpen"
          @click="pickerOpen = !pickerOpen"
          @keydown.esc="pickerOpen = false"
        >
          Buat Simulasi
        </button>

        <div
          v-if="pickerOpen"
          id="buat-simulasi-menu"
          class="card absolute right-0 z-20 mt-2 w-72 p-2"
          @keydown.esc="pickerOpen = false"
        >
          <p class="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Pilih modul
          </p>
          <RouterLink
            v-for="module in MODULES"
            :key="module.type"
            :to="module.path"
            class="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            @click="pickerOpen = false"
          >
            {{ module.label }}
          </RouterLink>
        </div>
      </div>
    </section>

    <section aria-labelledby="judul-modul">
      <h2 id="judul-modul" class="mb-3 text-base font-semibold text-slate-900">
        Empat modul utama
      </h2>
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ModuleCard
          v-for="module in MODULES"
          :key="module.type"
          :module="module"
        />
      </div>
    </section>

    <section class="card p-5" aria-labelledby="judul-terakhir">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 id="judul-terakhir" class="text-base font-semibold text-slate-900">
          Simulasi terakhir
        </h2>
        <RouterLink
          to="/riwayat"
          class="text-sm font-medium text-primary-700 hover:text-primary-800"
        >
          Lihat semua riwayat
        </RouterLink>
      </div>

      <p v-if="simulationStore.loading" class="mt-4 text-sm text-slate-600" aria-live="polite">
        Memuat simulasi dari perangkat...
      </p>

      <div
        v-else-if="simulationStore.error"
        class="mt-4 rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-700"
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

      <EmptyState
        v-else-if="simulationStore.recent.length === 0"
        title="Belum ada simulasi tersimpan"
        description="Simulasi yang Anda simpan dari modul akan muncul di sini."
      >
        <RouterLink to="/rumah-tangga" class="btn btn-primary">
          Buka modul
        </RouterLink>
      </EmptyState>

      <ul v-else class="mt-2 divide-y divide-slate-100">
        <li
          v-for="simulation in simulationStore.recent"
          :key="simulation.id"
          class="flex flex-wrap items-center justify-between gap-2 py-3"
        >
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-slate-900">
              {{ simulation.name }}
            </p>
            <p class="mt-0.5 text-xs text-slate-500">
              {{ moduleInfo(simulation.moduleType).label }} ·
              {{ formatDateTime(simulation.updatedAt) }}
            </p>
          </div>
          <StatusBadge
            :label="moduleInfo(simulation.moduleType).shortLabel"
            tone="neutral"
          />
        </li>
      </ul>
    </section>
  </div>
</template>
