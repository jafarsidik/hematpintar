<script setup lang="ts">
import type { ModuleInfo } from '@/lib/modules'

defineProps<{
  module: ModuleInfo
}>()
</script>

<template>
  <div class="space-y-6">
    <header>
      <p class="text-sm font-medium text-primary-700">Modul</p>
      <h1 class="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
        {{ module.label }}
      </h1>
      <p class="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
        {{ module.description }}
      </p>
    </header>

    <section class="card p-5" aria-labelledby="status-modul">
      <h2 id="status-modul" class="text-base font-semibold text-slate-900">
        Form modul sedang disiapkan
      </h2>
      <p class="mt-2 text-sm leading-relaxed text-slate-600">
        Fondasi aplikasi, penyimpanan lokal, dan navigasi sudah tersedia.
        Form perhitungan modul ini akan dibangun pada tahap berikutnya.
      </p>
      <div class="mt-4 flex flex-wrap gap-2">
        <RouterLink to="/riwayat" class="btn btn-primary">
          Lihat riwayat simulasi
        </RouterLink>
        <RouterLink to="/" class="btn btn-secondary">
          Kembali ke dashboard
        </RouterLink>
      </div>
    </section>
  </div>
</template>
