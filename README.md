# HematPintar

Scaffold proyek HematPintar: Vue 3 + Vite + TypeScript, PWA, dan fondasi
penyimpanan lokal. **Belum ada fitur atau logika keuangan** pada tahap ini.

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
├── components/        # komponen UI bersama (masih kosong)
├── lib/
│   ├── calc/          # SATU-SATUNYA tempat logika keuangan nanti
│   ├── storage/       # abstraksi Dexie/IndexedDB (masih kosong)
│   ├── supabase/      # client Supabase yang aman saat env kosong
│   └── format.ts      # formatRupiah sementara (bukan kalkulasi)
├── router/
├── stores/            # Pinia (masih kosong)
├── views/             # placeholder judul tiap halaman
├── App.vue
└── main.ts
supabase/migrations/   # migrasi SQL (masih kosong)
```

## Catatan

- PWA memakai `registerType: "autoUpdate"`. Service worker tidak memiliki
  aturan runtime caching, sehingga trafik API Supabase tidak pernah di-cache.
- `vercel.json` mengarahkan semua path ke `/index.html` untuk SPA.
- Ikon PWA di `public/icons/` masih placeholder.
