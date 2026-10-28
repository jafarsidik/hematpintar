# HematPintar

Fondasi aplikasi HematPintar: Vue 3 + Vite + TypeScript, PWA, navigasi
responsif, komponen UI bersama, penyimpanan lokal Dexie, backup/CSV, dan mesin
kalkulasi murni. **Form perhitungan tiap modul belum dibangun.**

Sumber kebenaran produk dan rumus ada di [`docs/PRD.md`](docs/PRD.md).

## Prasyarat

- Node.js 22.12+ atau 24+
- npm 10+

## Instalasi

```bash
npm install
```

Supabase bersifat opsional. Salin contoh env bila ingin mengaktifkannya:

```bash
cp .env.example .env
```

Isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`. Jika kosong, aplikasi
tetap berjalan dan `src/lib/supabase/client.ts` mengekspor `supabase = null`.
Jangan pernah menaruh service role key di frontend.

## Perintah

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Server pengembangan Vite |
| `npm run typecheck` | Cek tipe dengan `vue-tsc --noEmit` |
| `npm run test` | Unit test Vitest (`vitest run`) |
| `npm run build` | Typecheck lalu build produksi ke `dist/` |
| `npm run preview` | Menyajikan hasil build secara lokal |
| `npm run test:e2e` | Playwright (perlu `npx playwright install` lebih dulu) |

## Struktur

```text
src/
├── components/        # input, kartu hasil, status, dialog, toast, empty state
├── lib/
│   ├── calc/          # SATU-SATUNYA tempat logika keuangan (fungsi murni)
│   ├── storage/       # Dexie/IndexedDB, schema Zod, repository, CSV, backup
│   └── supabase/      # client Supabase yang aman saat env kosong
├── router/
├── stores/            # Pinia: simulasi dan toast
├── views/             # dashboard, riwayat, pengaturan, panduan, halaman modul
├── App.vue
└── main.ts
supabase/migrations/   # migrasi SQL (masih kosong)
```

## Penyimpanan lokal

- Database Dexie `hematpintar` memiliki tabel `settings`, `simulations`, dan
  `products`.
- Setiap simulasi memakai UUID, `schemaVersion`, dan payload yang divalidasi
  Zod sebelum ditulis.
- Repository menyediakan create, getById, list per modul, update, duplicate,
  dan remove. Kegagalan IndexedDB dikembalikan sebagai error, bukan sukses.
- CSV diekspor per modul. Backup JSON berisi seluruh tabel dan divalidasi penuh
  sebelum impor; berkas rusak tidak mengubah data lama.
- Data hanya tersimpan di perangkat. Tidak ada sinkronisasi cloud pada tahap
  ini.

## Mesin kalkulasi

`src/lib/calc/` berisi fungsi murni tanpa Vue, Supabase, Dexie, atau efek
samping. Setiap fungsi mengembalikan `Result<T>`:

```ts
{ ok: true, value: T } | { ok: false, errors: ValidationError[] }
```

Modul: `household`, `margin`, `reseller`, `bundle`, `unit-conversion`,
`currency-format`, `validation`. Persentase direpresentasikan sebagai
pecahan desimal (`0,3` = 30%). Kebijakan pembulatan dan batas error ada di
[`src/lib/calc/ROUNDING.md`](src/lib/calc/ROUNDING.md).

## Catatan

- PWA memakai `registerType: "autoUpdate"`. Service worker tidak memiliki
  aturan runtime caching, sehingga trafik API Supabase tidak pernah di-cache.
- `vercel.json` mengarahkan semua path ke `/index.html` untuk SPA.
- Ikon PWA di `public/icons/` masih placeholder.
