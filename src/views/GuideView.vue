<script setup lang="ts">
import { simulationLimitLabel } from '@/lib/plans/access'
import { MODULES } from '@/lib/modules'

const moduleSteps: Record<
  (typeof MODULES)[number]['type'],
  readonly string[]
> = {
  household: [
    'Isi anggaran lalu tambahkan barang belanja: nama, jumlah, satuan, dan harga.',
    'Tambahkan daftar baseline dan alternatif bila ingin membandingkan pilihan.',
    'Periksa total belanja, sisa anggaran, dan status anggaran.',
    'Simpan simulasi. Data tetap tersimpan di perangkat ini.',
  ],
  margin: [
    'Masukkan hasil batch produksi dan rincian bahan beserta biayanya.',
    'Isi biaya kemasan, tenaga kerja langsung, dan alokasi overhead.',
    'Masukkan harga jual atau target margin yang ingin dicapai.',
    'Periksa HPP per unit, harga minimum, margin, markup, dan break-even.',
  ],
  reseller: [
    'Masukkan harga jual, diskon penjual, dan cadangan refund.',
    'Isi biaya barang, tarif platform, biaya pembayaran, kemasan, ongkir, iklan, dan biaya lain.',
    'Pilih dasar komisi platform yang benar.',
    'Periksa laba per pesanan, margin, dan estimasi laba volume.',
  ],
  bundle: [
    'Masukkan komponen paket, kuantitas, biaya, dan harga normal masing-masing.',
    'Isi biaya kemasan tambahan serta biaya penjualan variabel tambahan.',
    'Masukkan harga paket dan target margin.',
    'Periksa laba dan margin paket sebelum menyimpan simulasi.',
  ],
}

const assumptions = [
  'Pajak seperti PPN, PPh, dan pungutan lain tidak dihitung otomatis.',
  'Bunga pinjaman, biaya modal, inflasi, dan biaya peluang tidak termasuk.',
  'Gaji pemilik, biaya tetap di luar input, serta biaya tak terduga tidak termasuk kecuali Anda memasukkannya.',
  'Tarif platform, ongkir, dan ketentuan biaya dapat berubah; selalu cocokkan dengan tagihan sebenarnya.',
  'Hasil adalah estimasi keputusan, bukan laporan akuntansi, audit, atau nasihat pajak/keuangan.',
]

const moduleAssumptions: Record<
  (typeof MODULES)[number]['type'],
  readonly string[]
> = {
  household: [
    'Harga barang dianggap sesuai input; perubahan harga, stok, kualitas, dan biaya antar/jasa tidak dihitung.',
    'Pola konsumsi dianggap tetap, padahal kebutuhan rumah tangga bisa berubah.',
  ],
  margin: [
    'Hasil batch dan kualitas bahan dianggap konsisten.',
    'Permintaan pasar, persaingan, susut, dan waktu henti alat tidak diperhitungkan.',
    'Alokasi overhead bergantung pada angka yang Anda masukkan sendiri.',
  ],
  reseller: [
    'Pencairan dana, arus kas, dan biaya penyimpanan tidak dihitung.',
    'Retur di luar cadangan refund, kerusakan, dan kehilangan barang tidak termasuk.',
    'Biaya iklan dihitung per pesanan sesuai input, bukan total kampanye.',
  ],
  bundle: [
    'Perubahan permintaan, kanibalisasi produk, dan reaksi pesaing tidak dihitung.',
    'Risiko stok, kedaluwarsa, dan barang tidak terjual tidak termasuk.',
    'Biaya platform dan pajak hanya dihitung jika Anda memasukkannya ke input.',
  ],
}

const PLAN_LIMIT_NOTE =
  `Paket Free membatasi ${simulationLimitLabel('free')}. Saat batas tercapai, ` +
  'simulasi lama tidak dihapus; hanya pembuatan atau duplikasi simulasi baru ' +
  'yang diblokir. Batas paket efektif dibaca dari akun, bukan dari URL atau ' +
  'localStorage.'
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
        angka yang jelas. Panduan ini menjelaskan langkah tiap modul, istilah
        penting, asumsi, dan cara menjaga data.
      </p>
    </header>

    <section class="card p-5" aria-labelledby="judul-modul-panduan">
      <h2 id="judul-modul-panduan" class="text-base font-semibold text-slate-900">
        Cara memakai tiap modul
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
          <ol class="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-slate-600">
            <li v-for="step in moduleSteps[module.type]" :key="step">
              {{ step }}
            </li>
          </ol>
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
      aria-labelledby="judul-asumsi"
    >
      <h2 id="judul-asumsi" class="text-base font-semibold text-warning-700">
        Asumsi dan biaya yang tidak termasuk
      </h2>
      <ul class="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-warning-700">
        <li v-for="item in assumptions" :key="item">{{ item }}</li>
      </ul>
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        <div
          v-for="module in MODULES"
          :key="module.type"
          class="rounded-lg border border-warning-200 bg-white/70 p-4"
        >
          <h3 class="text-sm font-semibold text-warning-700">
            {{ module.shortLabel }}
          </h3>
          <ul class="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-warning-700">
            <li v-for="item in moduleAssumptions[module.type]" :key="item">
              {{ item }}
            </li>
          </ul>
        </div>
      </div>
    </section>

    <section
      class="rounded-card border border-slate-200 bg-white p-5 shadow-sm"
      aria-labelledby="judul-paket-panduan"
    >
      <h2 id="judul-paket-panduan" class="text-base font-semibold text-slate-900">
        Paket, batas, dan privasi
      </h2>
      <p class="mt-2 text-sm leading-relaxed text-slate-600">
        {{ PLAN_LIMIT_NOTE }}
      </p>
      <p class="mt-2 text-sm leading-relaxed text-slate-600">
        Analitik anonim bersifat opsional. Event hanya dikirim jika Anda login
        dan menyalakannya di Pengaturan. Event tidak memuat nominal, nama
        produk, email, atau isi simulasi.
      </p>
      <div class="mt-3 flex flex-wrap gap-2">
        <RouterLink to="/pricing" class="btn btn-secondary">
          Lihat Paket &amp; Upgrade
        </RouterLink>
        <RouterLink to="/settings" class="btn btn-secondary">
          Atur analitik
        </RouterLink>
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
  </div>
</template>
