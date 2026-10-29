# [Hemat Rumah Tangga: Link Produk] Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ganti halaman `/rumah-tangga` dengan modul Hemat Rumah Tangga yang ber-login, menyimpan kebutuhan dan link produk ke Supabase (cache Dexie offline), menampilkan harga efektif/per satuan/termurah, dan ekspor CSV.

**Architecture:** Migrasi SQL baru di `supabase/migrations/` untuk `shopping_needs`, `saved_products`, `household_budgets` dengan RLS per-user. Library `src/lib/links/` untuk normalisasi dan deteksi platform marketplace (tanpa fetch/scraping). Penyimpanan modul via Supabase sebagai sumber utama dengan cache Dexie untuk baca offline; penambahan saat offline ditolak. Halaman Vue baru memakai fungsi `src/lib/calc/household.ts` saja untuk rumus keuangan, dan route `/rumah-tangga` diberi `meta.requiresAuth`.

**Tech Stack:** Vue 3, Pinia, Vue Router, Supabase JS, Dexie, Vitest, Playwright, Tailwind.

**Spec:** `docs/PRD.md` bagian 5.2 dan 8.3; `AGENTS.md`; tugas pengguna.

**Global Constraints**
- Semua tabel baru wajib RLS; user hanya akses baris miliknya.
- Jangan jalankan migrasi ke produksi; file migrasi hanya ditulis.
- Jangan pakai service role key di frontend.
- Jangan menulis rumus keuangan di komponen Vue; pakai `src/lib/calc/household.ts`.
- Jangan scraping/fetch ke URL marketplace dari browser atau server.
- `normalizeUrl`: hanya http/https; tolak `javascript:`, `data:`, skema lain; trim spasi; tambahkan `https://` jika lupa.
- `detectPlatform`: dari hostname lewat tabel konfigurasi (Shopee, Tokopedia, TikTok Shop, Lazada, Blibli, Bukalapak, dan domain link pendek mereka); tidak dikenal -> `"Lainnya"`.
- Link ditampilkan sebagai `<a target="_blank" rel="noopener noreferrer">` dengan teks nama produk + platform.
- Offline: penambahan baru ditolak dengan pesan jelas; kegagalan simpan selalu ditampilkan.
- Tanggal cek harga otomatis hari ini dan bisa diubah.
- Peringatan jika harga dicek > 7 hari lalu (pakai `statusKesegaranHarga`).
- Peringatan jika satuan tidak sebanding (pakai `dimensiSatuan`).
- Ringkasan: total terpilih, sisa/kelebihan anggaran, persen terpakai (anggaran 0 -> "tidak tersedia"), penghematan dibanding termahal per kebutuhan dengan catatan asumsi kualitas/jumlah setara.
- Catatan halaman: "Harga diisi manual dan bisa berubah di platform. Cek ulang sebelum membeli. Ongkir bergantung lokasi dan voucher bergantung akun Anda."
- E2E: login -> buat kebutuhan Beras -> tambah 3 produk contoh -> termurah A -> pilih A -> total/sisa benar -> reload data ada -> link `javascript:alert(1)` ditolak.

## Review Focus
- Input URL `javascript:alert(1)` atau `data:` harus ditolak oleh `normalizeUrl` sebelum disimpan.
- Produk dengan satuan massa vs volume tidak boleh dipaksa dibandingkan; tabel harus menunjukkan peringatan satuan tidak sebanding.
- Offline penambahan produk/kebutuhan harus ditolak, tidak pura-pura tersimpan.
- Anggaran 0 harus menampilkan persen "Tidak tersedia", bukan 0% atau error.
- Tanggal cek harga tepat 7 hari -> segar; 7 hari + 1 detik -> lama.

---

### Task 1: Migrasi SQL link produk rumah tangga

**Files:**
- Create: `supabase/migrations/20261029150000_household_product_links.sql`

**Interfaces:**
- Tabel `shopping_needs(id uuid PK, user_id uuid, name text, target_qty numeric, unit text, chosen_product_id uuid null FK, created_at, updated_at)`
- Tabel `saved_products(id uuid PK, user_id uuid, need_id uuid -> shopping_needs ON DELETE CASCADE, title text, platform text, store_name text null, url text NOT NULL CHECK url ~* '^https?://', price bigint CHECK >= 0, pack_size numeric CHECK > 0, pack_unit text, shipping_cost bigint DEFAULT 0, voucher_discount bigint DEFAULT 0, note text null, price_checked_at timestamptz, created_at, updated_at)`
- Tabel `household_budgets(user_id uuid PK, monthly_budget bigint, updated_at)`
- RLS aktif untuk ketiga tabel; user hanya baris sendiri untuk SELECT/INSERT/UPDATE/DELETE.

- [ ] **Step 1: Tulis file migrasi SQL** dengan DDL di atas, indeks, RLS, dan index.
- [ ] **Step 2: Verifikasi file ada dan belum dijalankan** (tidak ada command `npm` yang menjalankannya).
- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20261029150000_household_product_links.sql
git commit -m "feat(db): tambah migrasi link produk Hemat Rumah Tangga"
```

---

### Task 2: Library normalisasi dan deteksi platform link

**Files:**
- Create: `src/lib/links/platforms.ts` — tabel konfigurasi platform dan domain
- Create: `src/lib/links/normalize-url.ts` — `normalizeUrl`, `detectPlatform`, `isValidProductUrl`
- Test: `src/lib/links/normalize-url.test.ts`

**Interfaces:**
- `normalizeUrl(input: string): { url: string } | { error: string }`
- `detectPlatform(url: string): string`
- Platform: Shopee, Tokopedia, TikTok Shop, Lazada, Blibli, Bukalapak + domain link pendek masing-masing.

- [ ] **Step 1: Tulis tes gagal** untuk `normalizeUrl` (http/https diterima, `javascript:`/`data:` ditolak, trim spasi, tambah `https://`) dan `detectPlatform` (hostname dikenal, link pendek, tidak dikenal -> "Lainnya").
- [ ] **Step 2: Jalankan tes, verifikasi gagal.**
- [ ] **Step 3: Implementasi `platforms.ts` dan `normalize-url.ts`.**
- [ ] **Step 4: Jalankan tes dan `npm run typecheck`.**
- [ ] **Step 5: Commit**

---

### Task 3: Penyimpanan kebutuhan/produk/anggaran (Supabase + Dexie cache)

**Files:**
- Create: `src/lib/storage/household-needs.ts` — repository modul rumah tangga
- Modify: `src/lib/storage/db.ts` — tambah tabel Dexie untuk cache `household_needs`, `household_products`, `household_budgets`

**Interfaces:**
- `listNeeds(userId): Promise<Result<Need[]>>`
- `createNeed(userId, input): Promise<Result<Need>>`
- `updateNeed`, `removeNeed`, `chooseProduct(needId, productId)`
- `listProducts(needId)`, `createProduct`, `updateProduct`, `removeProduct`
- `getBudget(userId)`, `setBudget(userId, monthlyBudget)`
- Cache Dexie untuk baca offline; write saat offline ditolak dengan error jelas.

- [ ] **Step 1: Tulis tes unit repository** (mock Supabase, Dexie fake-indexeddb) untuk create/list/hapus dan penolakan write offline.
- [ ] **Step 2: Implementasi repository.**
- [ ] **Step 3: Jalankan tes dan typecheck.**
- [ ] **Step 4: Commit**

---

### Task 4: Pinia store modul rumah tangga

**Files:**
- Create: `src/stores/household.ts`
- Test: `src/stores/household.test.ts`

**Interfaces:**
- `needs`, `productsByNeed`, `budget`, `loading`, `error`
- `fetchNeeds`, `createNeed`, `removeNeed`, `chooseProduct`, `createProduct`, `updateProduct`, `removeProduct`, `setBudget`
- Sinkronisasi cache Dexie setelah berhasil ke Supabase.

- [ ] **Step 1: Tulis tes store (mock repository).**
- [ ] **Step 2: Implementasi store.**
- [ ] **Step 3: Jalankan tes dan typecheck.**
- [ ] **Step 4: Commit**

---

### Task 5: Halaman Hemat Rumah Tangga baru (ber-login)

**Files:**
- Modify: `src/router/index.ts` — route `/rumah-tangga` dapat `meta: { requiresAuth: true }`
- Modify: `src/views/HouseholdView.vue` — halaman baru (anggaran, daftar kebutuhan, form produk, tabel perbandingan, pilih produk, ringkasan, perbarui harga, ekspor CSV, konfirmasi hapus, catatan halaman)

**Interfaces:**
- Komponen tidak menulis rumus; pakai `hargaEfektifProduk`, `hargaPerSatuanProduk`, `rankingProduk`, `selisihHematDariTermurah`, `statusKesegaranHarga`, `dimensiSatuan`.

- [ ] **Step 1: Ubah route agar memerlukan login.**
- [ ] **Step 2: Tulis halaman baru secara bertahap (form, tabel, ringkasan, aksi).**
- [ ] **Step 3: Jalankan `npm run typecheck` dan build.**
- [ ] **Step 4: Commit**

---

### Task 6: Tes unit fungsi link dan integrasi halaman

**Files:**
- Test: `src/lib/links/normalize-url.test.ts` (dari Task 2)
- Test: `e2e/household-links.spec.ts` — login -> buat kebutuhan Beras -> tambah 3 produk -> termurah A -> pilih A -> total/sisa benar -> reload -> link invalid ditolak

**Interfaces:**
- E2E memakai akun uji atau mock Supabase; tidak fetch ke marketplace.

- [ ] **Step 1: Tulis E2E spec baru.**
- [ ] **Step 2: Jalankan `npm run test:e2e`.**
- [ ] **Step 3: Commit**

---

### Task 7: Verifikasi akhir dan pelaporan

**Files:**
- Tidak ada file baru.

- [ ] **Step 1: Jalankan `npm run typecheck`, `npm run test`, `npm run build`.**
- [ ] **Step 2: Laporan hasil aktual dan file migrasi yang harus dijalankan manually.**

---