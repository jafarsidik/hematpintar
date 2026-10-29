# HematPintar

Aplikasi HematPintar: Vue 3 + Vite + TypeScript, PWA, navigasi responsif,
komponen UI bersama, penyimpanan lokal Dexie, backup/CSV, mesin kalkulasi murni,
serta login opsional dan cadangan simulasi ke akun Supabase.

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

Setelah env diisi, jalankan migrasi
`supabase/migrations/20261029120000_optional_auth_entitlements.sql` secara
manual di Supabase SQL Editor. Migrasi tidak dijalankan otomatis oleh aplikasi.

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
│   └── supabase/      # client opsional, sinkronisasi simulasi, entitlement
├── router/
├── stores/            # Pinia: auth, entitlements, simulasi, cloud sync, toast
├── views/             # dashboard, riwayat, pengaturan, login, halaman modul
├── App.vue
└── main.ts
supabase/migrations/   # migrasi SQL untuk dijalankan manual di SQL Editor
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
- Data utama selalu tersimpan di perangkat. Login bersifat opsional. Setelah
  login, halaman Riwayat menyediakan tombol “Cadangkan ke akun” dan “Pulihkan
  dari akun”; tidak ada sinkronisasi otomatis.
- Konflik memakai `updated_at` terbaru dan menunggu konfirmasi pengguna. Data
  lokal yang tidak ada di akun tidak dihapus otomatis.

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
