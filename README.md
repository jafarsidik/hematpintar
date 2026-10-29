# HematPintar

Aplikasi PWA untuk menghitung keputusan belanja dan harga rumah tangga/usaha
kecil. Dibangun dengan Vue 3, Vite, TypeScript strict, Pinia, Vue Router,
Tailwind, Zod, Dexie/IndexedDB, dan Supabase opsional.

Sumber kebenaran produk dan rumus ada di [`docs/PRD.md`](docs/PRD.md).

## Prasyarat

- Node.js 22.12+ atau 24+
- npm 10+
- Playwright browser untuk E2E: `npx playwright install chromium`

## Instalasi

```bash
npm install
cp .env.example .env
```

Isi environment sesuai kebutuhan:

| Variabel | Wajib? | Fungsi |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Opsional | URL project Supabase untuk login, entitlement, cadangan akun, dan analitik |
| `VITE_SUPABASE_ANON_KEY` | Opsional | Kunci browser-safe (anon/publishable). **Jangan pernah memakai service role key di frontend** |
| `VITE_WA_NUMBER` | Untuk tombol pembelian | Nomor WhatsApp penjual, contoh `6281234567890` |
| `VITE_AUTH_EMAIL_DOMAIN` | Opsional | Domain email sintetis Supabase Auth, bawaan `users.hematpintar.local`. Tidak ada email yang dikirim |
| `VITE_REQUIRE_LOGIN` | Opsional | `true` mewajibkan login di semua halaman kecuali `/login`; `false` hanya route bertanda `meta.requiresAuth` |

Tanpa env Supabase, aplikasi tetap berjalan penuh secara lokal/offline dan
`supabase` bernilai `null`. Tanpa `VITE_WA_NUMBER`, halaman Paket & Upgrade
menampilkan tombol nonaktif dan peringatan konfigurasi.

## Akun username/password

- Login memakai username 3-20 karakter (huruf kecil, angka, underscore) dan
  password minimal 8 karakter.
- Supabase Auth tetap membutuhkan bentuk email, jadi aplikasi memakai alamat
  sintetis `username@VITE_AUTH_EMAIL_DOMAIN`. Alamat ini tidak ditampilkan
  sebagai kontak dan tidak dipakai untuk mengirim email. Jangan mengubah
  domain ini setelah ada akun, karena username lama tidak akan menemukan
  alamat Supabase-nya lagi.
- Halaman `/login` memiliki tab Masuk dan Daftar dalam satu halaman, dengan
  tombol tampilkan/sembunyikan password.
- Login gagal selalu menampilkan pesan umum “Username atau password salah”.
  Username yang sudah dipakai menampilkan “Username sudah digunakan”.
- Di Pengaturan tersedia ganti password, keluar, dan catatan bahwa lupa
  password harus ditangani admin. Tidak ada reset password lewat email.
- Plan efektif hanya dibaca dari tabel `entitlements`. Tanpa login atau setelah
  `valid_until` lewat, aplikasi memakai paket Free.
- Route guard mendukung `meta.requiresAuth`. Deployment dapat mengatur
  `VITE_REQUIRE_LOGIN=true` untuk mewajibkan login di semua halaman kecuali
  `/login`. Halaman lokal saat ini tidak ditandai wajib login agar kalkulator
  tetap bisa dipakai tanpa akun. Jangan aktifkan flag ini tanpa konfigurasi
  Supabase, karena semua halaman selain login akan dialihkan ke halaman login
  yang belum tersedia.

## Migrasi database (manual)

Jangan menjalankan migrasi dari aplikasi atau dari agen otomatis. Buka Supabase
SQL Editor dan jalankan berurutan:

1. `supabase/migrations/20261029120000_optional_auth_entitlements.sql`
2. `supabase/migrations/20261029130000_analytics_events.sql`
3. `supabase/migrations/20261029140000_username_auth_profiles.sql`

Untuk project baru, jalankan sesuai urutan nama file. Jika dua migrasi pertama
sudah pernah dijalankan, cukup jalankan
`20261029140000_username_auth_profiles.sql`. Migrasi terbaru membuat
`profiles`, memastikan `entitlements` dan `simulations` memiliki RLS yang
benar, serta mengganti trigger pengguna baru agar membuat profil dan
entitlement `free` sekaligus. Tidak ada migrasi yang dijalankan otomatis saat
build/deploy.

Di **Supabase Auth > Providers > Email**, matikan opsi konfirmasi email
(autoconfirm) agar pendaftaran username/password tidak mengirim email apa pun.
Aplikasi tidak memakai magic link, OTP, atau tautan reset email. Jika pengguna
lupa password, admin meresetnya secara manual.

## Perintah

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Server pengembangan Vite |
| `npm run typecheck` | Cek tipe dengan `vue-tsc --noEmit` |
| `npm run test` | Unit test Vitest |
| `npm run build` | Typecheck lalu build produksi ke `dist/` |
| `npm run preview` | Menyajikan hasil build secara lokal |
| `npm run test:e2e` | Build lalu jalankan Playwright |

## Paket dan batas

Konfigurasi harga, batas, dan fitur hanya ada di `src/config/plans.ts`.
Pemeriksaan fitur ada di `src/lib/plans/access.ts` dan tidak bergantung pada UI.

| Paket | Harga hipotesis | Batas simulasi |
| --- | --- | --- |
| Free | Rp0 | 5 simulasi per modul |
| Plus | Rp39.000 sekali bayar | 50 simulasi per modul |
| Bisnis | Rp99.000 sekali bayar | Tanpa batas |

- Saat batas tercapai, data lama **tidak dihapus**. Hanya pembuatan atau
  duplikasi simulasi baru yang diblokir, disertai ajakan upgrade.
- Fitur Plus/Bisnis dicek dengan `canUse(feature, plan)`. Contoh: ekspor CSV
  dari halaman Riwayat dan perbandingan produk tersimpan.
- Paket efektif hanya dibaca dari tabel `entitlements` setelah login. Parameter
  URL, localStorage, atau state browser tidak dapat membuka fitur premium.
- Status `valid_until` yang kedaluwarsa otomatis turun ke Free.
- Pembelian bersifat manual: pengguna login, memilih paket, lalu membuka pesan
  WhatsApp berisi username akun dan paket. Penjual memverifikasi pembayaran dan
  memperbarui `entitlements` dengan konteks admin/service role di luar frontend.
- Aplikasi tidak memiliki payment gateway dan tidak menampilkan status
  “pembayaran berhasil” palsu.
- Lisensi sekali bayar berlaku untuk versi mayor saat pembelian (1.x), termasuk
  perbaikan bug. Versi mayor berikutnya tidak otomatis termasuk.

## Analitik anonim (opt-in)

Jika pengguna login **dan** menyalakan persetujuan di Pengaturan, aplikasi
mengirim event ke tabel `events`:

- `module_open`
- `simulation_saved`
- `upgrade_click`

Kolom hanya berisi `user_id`, nama event, tipe modul (opsional), dan timestamp.
Tidak ada nominal, nama produk, email, isi simulasi, atau data finansial. RLS
hanya mengizinkan pengguna memasukkan event miliknya sendiri; tidak ada policy
baca/ubah/hapus untuk pengguna. Tidak ada pihak ketiga analitik.

## PWA dan offline

- Manifest valid dengan ikon nyata 192×192 dan 512×512 di `public/icons/`.
- Service worker memakai precache aset aplikasi dan **tidak** memiliki runtime
  caching untuk API Supabase, sehingga respons API tidak pernah di-cache.
- Kalkulator dan data IndexedDB tetap berjalan setelah aset aplikasi tersedia,
  tanpa login dan tanpa internet.
- Login, cadangan akun, entitlement, dan analitik memerlukan koneksi.

## Deploy ke Vercel

1. Hubungkan repository ke Vercel.
2. Framework preset: **Vite**. Build command: `npm run build`. Output: `dist`.
3. Tambahkan environment variable `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`, `VITE_WA_NUMBER`, `VITE_AUTH_EMAIL_DOMAIN`, dan
   `VITE_REQUIRE_LOGIN` di Vercel (Production dan Preview sesuai kebutuhan).
4. Deploy. `vercel.json` sudah mengarahkan semua path SPA ke `/index.html`.
5. Jalankan migrasi SQL secara manual di project Supabase yang dipakai. Tidak
   ada redirect URL email yang perlu didaftarkan untuk login username/password.

## Data lokal dan batasannya

- Data utama (simulasi, produk, pengaturan) tersimpan di IndexedDB perangkat.
- Data lokal dapat hilang jika data browser/penyimpanan situs dihapus, mode
  privat dipakai, atau perangkat diganti. Unduh backup JSON dari Pengaturan
  secara berkala.
- Login bersifat opsional. Cadangan ke akun bersifat manual dari halaman
  Riwayat; tidak ada sinkronisasi otomatis. Tanpa login, semua fitur lokal
  tetap berjalan dan data tidak diunggah.
- Restore memvalidasi seluruh record sebelum menulis. Record lokal yang tidak
  ada di akun tetap dipertahankan; tidak ada penghapusan otomatis.
- Konflik memakai `updated_at` terbaru dan menunggu konfirmasi pengguna.
- PWA tidak menjamin data aman dari penghapusan oleh browser. Backup JSON
  adalah mekanisme pemulihan utama.

## Struktur singkat

```text
src/
├── config/            # harga, batas, fitur paket
├── lib/
│   ├── auth/           # username, validasi, error, service Supabase Auth
│   ├── calc/           # logika keuangan murni
│   ├── plans/          # canUse, batas, entitlement, pesan WhatsApp
│   ├── storage/        # Dexie, schema Zod, repository, CSV, backup
│   └── supabase/       # client opsional dan sinkronisasi
├── stores/             # auth + plan, entitlement facade, simulasi, analitik
├── views/              # dashboard, modul, riwayat, paket, panduan, pengaturan
└── components/
supabase/migrations/    # migrasi SQL manual
```

## Catatan keamanan

- Jangan pernah menaruh service role key di kode frontend, environment Vite,
  atau repository. Hanya anon/publishable key yang boleh dipakai browser.
- Pengguna tidak memiliki policy tulis ke `entitlements`.
- Pengguna hanya dapat membaca `profiles` miliknya sendiri; username tidak
  dapat diubah dari client.
- Semua tabel Supabase wajib RLS.
- Password dan token tidak disimpan manual di `localStorage`. Sesi ditangani
  oleh Supabase JS; tidak ada service role key di frontend.
- Jangan menjalankan perubahan ke database produksi dari agen otomatis.
