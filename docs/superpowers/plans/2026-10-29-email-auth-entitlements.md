# [Email + Password Auth] Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ganti sistem auth berbasis username menjadi email + password (Supabase Auth), tanpa magic link dan tanpa OTP, dengan tabel entitlements yang menyimpan email dan plan, serta halaman login/daftar dan pengaturan.

**Architecture:** Migrasi SQL baru (idempotent) untuk entitlements + simulations + trigger yang menyalin email dari auth.users. Library auth ditulis ulang untuk email (validasi Zod, signUp/signIn/signOut/changePassword/resetPasswordForEmail, pemetaan error bahasa Indonesia). Pinia store baca plan dari entitlements setelah login, tanpa login = free, valid_until kedaluwarsa = free. Route guard pakai meta.requiresAuth dan VITE_REQUIRE_LOGIN. Halaman Login/Daftar satu halaman dengan tab; Pengaturan ganti password dan keluar; lupa password digated oleh VITE_ENABLE_PASSWORD_RESET.

**Tech Stack:** Vue 3, Pinia, Vue Router, Supabase JS, Zod, Vitest, Playwright.

**Spec:** `docs/PRD.md` bagian 7.3 dan 10; `AGENTS.md`; tugas pengguna.

## Global Constraints
- Semua tabel baru wajib RLS. Jangan pernah pakai service role key di frontend.
- Jangan buat policy yang membolehkan user menulis entitlements (entitlements: select-own saja, tidak ada insert/update/delete policy).
- Migrasi hanya ditulis di supabase/migrations/, tidak dijalankan dari app/agent.
- Kalkulator dasar tetap jalan tanpa login dan tanpa internet.
- Client Supabase tidak crash jika env kosong.
- Sebelum selesai: `npm run typecheck`, `npm run test`, `npm run build` lulus, dan laporkan hasil aktual.
- Login gagal selalu tampilkan "Email atau password salah". Email sudah terdaftar -> pesan yang jelas. Batas pengiriman email tercapai -> "Terlalu banyak percobaan, coba lagi beberapa menit lagi."
- Lupa password (resetPasswordForEmail + halaman set password baru) hanya tampil jika VITE_ENABLE_PASSWORD_RESET=true; jika false tampilkan "Lupa password? Hubungi admin."
- VITE_AUTH_EMAIL_DOMAIN default users.hematpintar.local dan stabil setelah akun ada.

## Review Focus
- Input email tidak valid atau password < 8 karakter ditolak sebelum memanggil Supabase.
- Login gagal (salah kredensial) selalu "Email atau password salah", tidak membedakan user ada atau tidak.
- Pendaftaran email duplikat menghasilkan pesan yang jelas (bukan generic login).
- rate limit / terlalu banyak percobaan menghasilkan pesan spesifik.
- Tanpa login plan = 'free'; plan dengan valid_until yang lewat = 'free'.
- Route guard kedua mode (VITE_REQUIRE_LOGIN true/false) dan redirect kembali ke halaman asal setelah login.
- Tampilan lupa password mengikuti flag VITE_ENABLE_PASSWORD_RESET.

---

### Task 1: Migrasi SQL entitlements + simulations berbasis email

**Status: DONE**
- File: `supabase/migrations/20261029160000_email_auth_entitlements.sql`
- DDL idempotent untuk entitlements (dengan email), simulations, trigger baru, RLS, hapus artifacts username lama.

---

### Task 2: Library auth berbasis email (validasi, service, error)

**Status: DONE**
- `src/lib/auth/validation.ts` — emailSchema, passwordSchema, signUpSchema (email+password+confirmPassword)
- `src/lib/auth/service.ts` — signUp(email, password), signIn(email, password), signOut, changePassword, resetPasswordForEmail
- `src/lib/auth/errors.ts` — pesan Indonesia, login gagal selalu "Email atau password salah", email duplikat, rate limit
- Deleted: `src/lib/auth/username.ts`, `src/lib/auth/username.test.ts`
- Modified: `src/lib/auth/index.ts`
- Tests: validation.test.ts, service.test.ts, errors.test.ts (all pass)

---

### Task 3: Pinia auth store berbasis email

**Status: DONE**
- `src/stores/auth.ts` — hapus computed username, pakai email; signIn/signUp/signOut/changePassword terima email; tambah resetPasswordForEmail; signUp tanpa sesi -> error "Cek email Anda untuk konfirmasi."
- `src/stores/auth.test.ts` — updated, all pass

---

### Task 4: Halaman Login/Daftar dan Pengaturan

**Status: DONE**
- `src/views/LoginView.vue` — field email (bukan username), tab login/daftar/lupa password, tombol tampilkan/sembunyikan password, lupa password digated VITE_ENABLE_PASSWORD_RESET
- `src/views/SettingsView.vue` — tampilkan email, ganti password, keluar, catatan lupa password hubungi admin
- `src/views/PricingView.vue` — gunakan email alih-username
- `src/components/AccountSyncCard.vue` — gunakan email alih-username

---

### Task 5: Route guard dan env lupa password

**Status: DONE**
- `src/router/guard.ts` — meta.requiresAuth dan VITE_REQUIRE_LOGIN, redirect setelah login (already correct)
- `.env.example` — added VITE_ENABLE_PASSWORD_RESET

---

### Task 6: Tes unit lengkap dan verifikasi akhir

**Status: DONE**
- `npm run typecheck` — lulus
- `npm run test` — **26 file, 441 tes lulus**
- `npm run build` — lulus, PWA precache 30 entries / 790.95 KiB

---