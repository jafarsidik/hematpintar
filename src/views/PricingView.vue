<script setup lang="ts">
import StatusBadge from '@/components/StatusBadge.vue'

const plans = [
  {
    name: 'Gratis',
    price: 'Rp0',
    note: 'Untuk mencoba seluruh modul',
    features: [
      'Kalkulasi dasar di semua modul',
      'Simpan simulasi di perangkat',
      'Ekspor CSV per modul',
      'Backup JSON manual',
    ],
  },
  {
    name: 'Plus',
    price: 'Rp39.000',
    note: 'Rencana lisensi sekali bayar',
    features: [
      'Batas simulasi lebih tinggi',
      'Riwayat dan perbandingan skenario',
      'Ekspor laporan',
    ],
  },
  {
    name: 'Bisnis',
    price: 'Rp99.000',
    note: 'Rencana lisensi sekali bayar',
    features: [
      'Fitur simulasi usaha',
      'Laporan keuntungan',
      'Template laporan lebih lengkap',
    ],
  },
]
</script>

<template>
  <div class="space-y-6">
    <header>
      <div class="flex flex-wrap items-center gap-2">
        <p class="text-sm font-medium text-primary-700">Paket &amp; Upgrade</p>
        <StatusBadge label="Belum aktif" tone="warning" />
      </div>
      <h1 class="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
        Rencana paket HematPintar
      </h1>
      <p class="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
        Halaman ini menjelaskan rencana paket. Pembelian dan aktivasi paket
        belum tersedia pada tahap ini, sehingga tidak ada tombol pembelian yang
        dapat digunakan.
      </p>
    </header>

    <div class="grid gap-4 md:grid-cols-3">
      <section
        v-for="plan in plans"
        :key="plan.name"
        class="card flex h-full flex-col p-5"
        :aria-labelledby="`paket-${plan.name}`"
      >
        <h2 :id="`paket-${plan.name}`" class="text-base font-semibold text-slate-900">
          {{ plan.name }}
        </h2>
        <p class="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          {{ plan.price }}
        </p>
        <p class="mt-1 text-xs text-slate-500">{{ plan.note }}</p>

        <ul class="mt-4 flex-1 space-y-2">
          <li
            v-for="feature in plan.features"
            :key="feature"
            class="flex gap-2 text-sm text-slate-600"
          >
            <svg
              class="mt-0.5 h-4 w-4 shrink-0 text-success-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="m5 13 4 4L19 7" />
            </svg>
            <span>{{ feature }}</span>
          </li>
        </ul>
      </section>
    </div>

    <section class="card p-5" aria-labelledby="judul-paket-catatan">
      <h2 id="judul-paket-catatan" class="text-base font-semibold text-slate-900">
        Catatan harga
      </h2>
      <p class="mt-2 text-sm leading-relaxed text-slate-600">
        Harga di atas masih berupa rencana dan dapat berubah. Aplikasi belum
        memproses pembayaran atau menyimpan data pembayaran. Gunakan
        <RouterLink
          to="/settings"
          class="font-medium text-primary-700 underline underline-offset-2 hover:text-primary-800"
        >
          Pengaturan
        </RouterLink>
        untuk mengelola data lokal dan backup.
      </p>
    </section>
  </div>
</template>
