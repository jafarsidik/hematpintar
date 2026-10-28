<script setup lang="ts">
import { MODULES } from '@/lib/modules'
</script>

<template>
  <div class="space-y-6">
    <header>
      <p class="text-sm font-medium text-primary-700">Panduan</p>
      <h1 class="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
        Cara memakai HematPintar
      </h1>
      <p class="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
        HematPintar membantu Anda menghitung keputusan belanja dan harga dengan
        angka yang jelas. Panduan ini menjelaskan modul, istilah penting, dan
        cara menjaga data.
      </p>
    </header>

    <section class="card p-5" aria-labelledby="judul-modul-panduan">
      <h2 id="judul-modul-panduan" class="text-base font-semibold text-slate-900">
        Empat modul
      </h2>
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        <article
          v-for="module in MODULES"
          :key="module.type"
          class="rounded-lg border border-slate-200 p-4"
        >
          <h3 class="text-sm font-semibold text-slate-900">{{ module.label }}</h3>
          <p class="mt-1 text-sm leading-relaxed text-slate-600">
            {{ module.description }}
          </p>
          <RouterLink
            :to="module.path"
            class="mt-3 inline-block text-sm font-medium text-primary-700 hover:text-primary-800"
          >
            Buka {{ module.shortLabel }}
          </RouterLink>
        </article>
      </div>
    </section>

    <section class="card p-5" aria-labelledby="judul-istilah">
      <h2 id="judul-istilah" class="text-base font-semibold text-slate-900">
        Margin dan markup tidak sama
      </h2>
      <div class="mt-3 space-y-3 text-sm leading-relaxed text-slate-600">
        <p>
          <strong class="text-slate-900">Margin</strong> membandingkan laba
          dengan harga jual: (harga jual − HPP) ÷ harga jual. Margin 30% berarti
          Rp30 dari setiap Rp100 harga jual adalah laba.
        </p>
        <p>
          <strong class="text-slate-900">Markup</strong> membandingkan laba
          dengan HPP: (harga jual − HPP) ÷ HPP. Markup 30% berarti harga jual
          adalah HPP ditambah 30% dari HPP.
        </p>
        <p>
          Gunakan margin saat menetapkan target laba dari harga jual. Jangan
          menukar rumus margin dan markup karena hasil harganya berbeda.
        </p>
      </div>
    </section>

    <section class="card p-5" aria-labelledby="judul-pembulatan">
      <h2 id="judul-pembulatan" class="text-base font-semibold text-slate-900">
        Pembulatan angka
      </h2>
      <div class="mt-3 space-y-3 text-sm leading-relaxed text-slate-600">
        <p>
          Perhitungan memakai nilai penuh tanpa pembulatan di tengah jalan.
          Harga jual dari target margin, harga minimum, dan break-even
          dibulatkan ke atas ke Rupiah terdekat agar target tidak terlampaui.
        </p>
        <p>
          Persentase dibulatkan hanya saat ditampilkan. Nilai uang disimpan
          sebagai bilangan bulat Rupiah.
        </p>
      </div>
    </section>

    <section
      class="rounded-card border border-warning-200 bg-warning-50 p-5"
      aria-labelledby="judul-data-panduan"
    >
      <h2 id="judul-data-panduan" class="text-base font-semibold text-warning-700">
        Data dan backup
      </h2>
      <div class="mt-3 space-y-3 text-sm leading-relaxed text-warning-700">
        <p>
          Simulasi dan produk disimpan di perangkat ini melalui penyimpanan
          browser. Data bisa hilang jika data browser atau penyimpanan situs
          dihapus.
        </p>
        <p>
          Unduh backup JSON dari halaman Pengaturan secara berkala. Impor backup
          akan mengganti seluruh data saat ini setelah berkas divalidasi.
        </p>
        <RouterLink
          to="/settings"
          class="inline-block font-medium text-warning-700 underline underline-offset-2 hover:text-warning-600"
        >
          Buka Pengaturan untuk backup
        </RouterLink>
      </div>
    </section>

    <section class="card p-5" aria-labelledby="judul-tahap">
      <h2 id="judul-tahap" class="text-base font-semibold text-slate-900">
        Tahap pengembangan saat ini
      </h2>
      <p class="mt-2 text-sm leading-relaxed text-slate-600">
        Fondasi aplikasi, navigasi, komponen input, penyimpanan lokal, riwayat,
        dan backup sudah tersedia. Form perhitungan tiap modul akan ditambahkan
        pada tahap berikutnya; halaman modul saat ini menjelaskan fungsi dan
        menautkan ke riwayat.
      </p>
    </section>
  </div>
</template>
