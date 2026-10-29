# Finalisasi MVP HematPintar

## Tujuan
Menutup celah monetisasi, batas paket, panduan, PWA, analitik anonim, dan
dokumentasi rilis tanpa mengorbankan penggunaan lokal/offline.

## Urutan kerja
1. Tests-first untuk `canUse`, batas simulasi, dan pesan WhatsApp.
2. Satu sumber konfigurasi paket di `src/config/plans.ts` + helper akses murni.
3. Enforcement batas di simulation store (create/duplicate), dialog upgrade.
4. Halaman Paket & Upgrade dengan pembelian manual WhatsApp dan batas lisensi.
5. Panduan pemakaian modul + asumsi/biaya yang tidak termasuk.
6. Analitik anonim opt-in + migrasi `events`, tanpa data finansial.
7. PWA: ikon nyata 192/512, manifest, service worker tanpa cache API Supabase.
8. E2E: batas Free, halaman harga, premium tanpa entitlement ditolak.
9. README: instalasi, env, migrasi, Vercel, batasan data lokal.
10. Jalankan typecheck, test, test:e2e, build dan laporkan hasil aktual.

## Definition of done
- Angka batas/paket tidak tersebar di komponen.
- Data lama tidak dihapus saat batas tercapai.
- Premium hanya berasal dari `entitlements`.
- Tidak ada payment gateway atau status pembayaran palsu.
- Semua verifikasi lulus dan keterbatasan dicatat.
