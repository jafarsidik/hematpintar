# HematPintar

Baca docs/PRD.md sebagai sumber kebenaran produk dan rumus (bagian 5).

## Stack
Vue 3 (Composition API, <script setup>), Vite, TypeScript strict, Pinia,
Vue Router, Tailwind, Zod, Dexie, Supabase JS, Vitest, Playwright.

## Aturan wajib
- Logika keuangan HANYA di src/lib/calc/. Tidak boleh di komponen Vue,
  store, atau kode Supabase. Fungsi murni, tanpa efek samping.
- Uang = integer Rupiah. Margin (laba/harga jual) dan markup (laba/HPP)
  tidak boleh tertukar. Tolak pembagi nol, NaN, Infinity.
- Jangan ubah rumus tanpa instruksi eksplisit.
- Supabase: semua tabel wajib RLS. Jangan pernah memakai service role key
  di frontend. Jangan buat policy yang membolehkan user menulis entitlements.
- Kalkulator dasar harus jalan tanpa login dan tanpa internet.
- Jangan jalankan perubahan ke database produksi; tulis migrasi di
  supabase/migrations/ saja.
- Sebelum menyatakan selesai: jalankan `npm run typecheck`, `npm run test`,
  `npm run build`, dan laporkan hasil aktual.
- Satu tugas per sesi. Rencanakan dulu untuk tugas besar.
