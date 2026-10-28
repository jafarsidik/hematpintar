# HematPintar
## Product Requirements Document (PRD) & Master Implementation Specification

**Versi:** 1.0  
**Status:** Ready for MVP Development  
**Platform:** Responsive Web Application + Progressive Web App (PWA)  
**Target pasar:** Indonesia  
**Model bisnis:** Freemium + pembelian fitur premium  
**Target pengembangan:** 2–3 minggu untuk MVP, dengan asumsi pengerjaan intensif dibantu AI  
**Target modal:** Rp500.000–Rp5.000.000  
**Prioritas:** Produk fungsional, kalkulasi akurat, biaya operasional rendah, dan siap divalidasi melalui penjualan.

---

# BAGIAN I — PRODUCT REQUIREMENTS DOCUMENT

## 1. Product Vision

HematPintar adalah aplikasi pengambilan keputusan finansial praktis untuk membantu masyarakat Indonesia mengelola pengeluaran rumah tangga, menghitung keuntungan usaha, mengevaluasi profitabilitas reseller, dan menyusun paket promosi yang tetap menguntungkan.

HematPintar tidak dibangun sebagai aplikasi akuntansi umum, ERP, atau aplikasi pencatatan transaksi yang kompleks.

Fokus utamanya adalah membantu pengguna menjawab pertanyaan:

- Apakah saya masih mampu membeli kebutuhan ini dengan anggaran yang tersedia?
- Produk mana yang memberikan keuntungan terbaik?
- Apakah harga jual saya masih menguntungkan setelah semua biaya dihitung?
- Apakah promosi yang akan saya jalankan menyebabkan kerugian?
- Berapa banyak produk yang perlu saya jual untuk mencapai target keuntungan?
- Bagaimana saya bisa menghemat pengeluaran tanpa mengorbankan kebutuhan penting?

### 1.1 Prinsip produk

1. **Value before complexity:** setiap fitur harus membantu pengguna membuat keputusan yang lebih baik.
2. **Affordable by design:** fitur dasar harus tetap berguna tanpa pembayaran.
3. **Calculation before AI:** semua hasil keuangan berasal dari rumus deterministik yang bisa diverifikasi.
4. **Local-first:** kalkulator dasar bekerja tanpa akun dan tanpa ketergantungan server.
5. **Indonesia-first:** gunakan Rupiah, format angka Indonesia, satuan lokal, serta contoh bisnis yang relevan.
6. **Privacy-conscious:** data finansial pengguna tidak dikirim ke server tanpa kebutuhan dan persetujuan yang jelas.
7. **One product, four markets:** satu aplikasi dengan empat modul yang dapat dipasarkan kepada segmen berbeda.

## 2. Target Pengguna

### 2.1 Hemat Rumah Tangga

Pengguna:
- Keluarga dengan anggaran bulanan terbatas.
- Individu yang mengelola pengeluaran pribadi.
- Pasangan yang mengatur belanja rumah tangga.
- Pengguna yang ingin membandingkan harga barang dan menyusun anggaran belanja.

Masalah:
- Sulit memperkirakan total belanja sebelum berangkat.
- Harga kemasan berbeda membuat perbandingan tidak mudah.
- Anggaran bulanan sering habis sebelum waktunya.
- Sulit mengetahui penghematan aktual dari perubahan pilihan belanja.

### 2.2 Margin Rescue

Pengguna:
- Warung makan.
- Kedai minuman.
- Penjual makanan rumahan.
- UMKM yang menjual produk dengan biaya bahan dan kemasan.
- Usaha kecil yang menentukan harga jual secara manual.

Masalah:
- Harga jual ditentukan hanya berdasarkan harga pesaing.
- Biaya bahan, kemasan, tenaga kerja, dan biaya operasional tidak dihitung secara lengkap.
- Diskon dapat mengurangi laba tanpa disadari.
- Pemilik usaha sulit mengetahui produk yang paling menguntungkan.

### 2.3 Profit Kit Reseller

Pengguna:
- Reseller marketplace.
- Penjual melalui media sosial dan WhatsApp.
- Dropshipper.
- Penjual produk dengan biaya komisi, iklan, dan subsidi ongkir.
- Pedagang online skala kecil.

Masalah:
- Omzet terlihat tinggi, tetapi keuntungan bersih rendah.
- Biaya platform, iklan, retur, dan kemasan tidak selalu diperhitungkan.
- Sulit membandingkan profitabilitas antarproduk.
- Sulit menentukan harga minimum untuk mengikuti promo.

### 2.4 Generator Paket Hemat

Pengguna:
- UMKM makanan dan minuman.
- Toko produk konsumen.
- Reseller.
- Pemilik usaha yang menggunakan bundling.
- Penjual yang ingin membuat paket ekonomis.

Masalah:
- Paket promo dibuat tanpa menghitung biaya total.
- Diskon terlalu besar.
- Paket murah menghasilkan penjualan tetapi mengurangi keuntungan.
- Pemilik usaha tidak mengetahui jumlah penjualan yang diperlukan untuk mencapai target laba.

## 3. Product Scope

### 3.1 Fitur MVP — wajib tersedia

**Fondasi aplikasi**
- Dashboard utama.
- Navigasi empat modul.
- Format Rupiah dan angka Indonesia.
- Input angka dengan validasi.
- Kalkulasi langsung tanpa tombol hitung tambahan jika memungkinkan.
- Penyimpanan data lokal.
- Riwayat simulasi tersimpan.
- Edit, duplikasi, dan hapus simulasi.
- Ekspor data CSV.
- PWA manifest dan service worker.
- Empty state, loading state, error state, dan konfirmasi tindakan.
- Halaman bantuan dan informasi metode perhitungan.

**Modul Hemat Rumah Tangga**
- Perencana anggaran belanja.
- Daftar barang dan kebutuhan.
- Perbandingan harga satuan.
- Simulasi pengeluaran terhadap batas anggaran.
- Rekomendasi penghematan berbasis perhitungan.
- Simpan dan bandingkan simulasi.

**Modul Margin Rescue**
- Kalkulator biaya pokok produk.
- Komponen bahan dan kemasan.
- Biaya tenaga kerja dan biaya produksi lainnya.
- Kalkulator harga jual berdasarkan target margin.
- Simulasi perubahan harga bahan.
- Perhitungan laba kontribusi dan break-even.

**Modul Profit Kit Reseller**
- Kalkulator profit per produk atau pesanan.
- Harga modal dan biaya pengiriman yang ditanggung penjual.
- Komisi platform, biaya pembayaran, dan iklan.
- Diskon, retur, kemasan, dan subsidi ongkir.
- Margin keuntungan.
- Perbandingan skenario harga dan biaya.

**Modul Generator Paket Hemat**
- Pemilihan beberapa produk untuk bundling.
- Kalkulasi biaya total paket.
- Harga normal dibandingkan harga paket.
- Simulasi diskon.
- Harga minimum berdasarkan target margin.
- Estimasi laba dan margin per paket.
- Rekomendasi berbasis rumus, bukan klaim AI.

### 3.2 Fitur yang ditunda

Tidak termasuk MVP:
- Integrasi langsung ke marketplace.
- Sinkronisasi harga barang secara otomatis.
- Integrasi bank atau e-wallet.
- Pencatatan akuntansi double-entry.
- Payroll.
- Manajemen stok multi-gudang.
- AI agent berbayar.
- Prediksi harga pasar.
- Aplikasi Android native.
- Multi-user collaboration.
- Backend SaaS kompleks.
- Pembukuan pajak resmi.
- Integrasi pembayaran otomatis sebelum proses penjualan tervalidasi.

Fitur tambahan hanya dibangun berdasarkan bukti kebutuhan pelanggan.

## 4. Arsitektur Produk dan Navigasi

### 4.1 Struktur navigasi

```text
HematPintar
├── Dashboard
├── Hemat Rumah Tangga
│   ├── Anggaran Belanja
│   ├── Daftar Kebutuhan
│   ├── Perbandingan Harga
│   └── Riwayat Simulasi
├── Margin Rescue
│   ├── Kalkulator HPP
│   ├── Harga Jual
│   ├── Simulasi Biaya
│   └── Break-Even
├── Profit Kit Reseller
│   ├── Kalkulator Profit
│   ├── Biaya Penjualan
│   ├── Simulasi Harga
│   └── Perbandingan Produk
├── Generator Paket Hemat
│   ├── Buat Paket
│   ├── Kalkulasi Harga
│   ├── Simulasi Diskon
│   └── Analisis Paket
├── Riwayat
├── Paket & Upgrade
├── Panduan
└── Pengaturan
```

### 4.2 Dashboard

Dashboard tidak harus berisi grafik kompleks.

Komponen:
- Greeting sederhana.
- Empat kartu modul.
- Tombol tindakan utama: Buat Simulasi.
- Simulasi terakhir.
- Ringkasan hasil yang relevan.
- Status fitur gratis atau premium.
- CTA upgrade yang tidak mengganggu penggunaan.

Data pada dashboard hanya berasal dari simulasi pengguna sendiri.

### 4.3 User journey

**Journey A — pengguna rumah tangga**

1. Membuka halaman utama.
2. Memilih Hemat Rumah Tangga.
3. Memasukkan anggaran belanja.
4. Menambahkan kebutuhan dan harga barang.
5. Melihat total belanja serta sisa anggaran.
6. Membandingkan alternatif produk berdasarkan harga satuan.
7. Menyimpan simulasi atau mengekspor daftar belanja.

**Journey B — pemilik usaha makanan**

1. Membuka Margin Rescue.
2. Membuat produk baru.
3. Memasukkan bahan, kuantitas, dan harga pembelian.
4. Memasukkan biaya kemasan dan biaya produksi lainnya.
5. Menentukan target margin.
6. Melihat HPP, harga jual minimum, dan laba per unit.
7. Menjalankan simulasi perubahan biaya.
8. Menyimpan hasil atau mengekspor laporan.

**Journey C — reseller**

1. Membuka Profit Kit Reseller.
2. Memasukkan harga jual dan modal produk.
3. Mengisi biaya platform, iklan, kemasan, dan subsidi pengiriman.
4. Memasukkan diskon atau retur yang diperkirakan.
5. Melihat laba per pesanan dan margin.
6. Membandingkan beberapa skenario harga.
7. Menentukan harga jual yang layak.

**Journey D — pembuat paket promo**

1. Membuka Generator Paket Hemat.
2. Memilih atau memasukkan produk.
3. Memasukkan biaya dan harga jual masing-masing produk.
4. Menentukan harga paket atau target margin.
5. Membandingkan harga normal dengan harga paket.
6. Melihat estimasi laba dan diskon maksimum.
7. Menyimpan simulasi paket.

## 5. Spesifikasi Modul dan Rumus

Seluruh kalkulasi harus diimplementasikan dalam fungsi domain yang terpisah dari UI.

Gunakan nilai uang dengan representasi presisi yang sesuai, misalnya integer Rupiah atau pustaka decimal. Hindari ketergantungan pada pembulatan floating-point untuk perhitungan uang.

### 5.1 Format umum

- Mata uang: IDR.
- Format tampilan: `Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })`.
- Simpan harga sebagai integer Rupiah jika tidak memerlukan pecahan.
- Simpan kuantitas dan persentase dengan presisi yang memadai.
- Bulatkan hanya pada tahap yang ditentukan.
- Jangan menggunakan angka tampilan yang sudah diformat sebagai sumber perhitungan.
- Tampilkan asumsi yang digunakan dalam setiap hasil.
- Tolak input non-finite, negatif jika tidak diperbolehkan, dan pembagi nol.

### 5.2 Modul Hemat Rumah Tangga

**A. Total belanja**

\[
T = \sum_{i=1}^{n} q_i p_i
\]

Dengan:
- \(q_i\): jumlah barang.
- \(p_i\): harga per unit.
- \(T\): total belanja.

Jika harga sudah berupa total per paket, jangan mengalikannya kembali dengan jumlah unit kecuali harga satuannya memang dimasukkan.

**B. Sisa anggaran**

\[
S = B - T
\]

Dengan:
- \(B\): batas anggaran.
- \(S\): sisa anggaran.

Jika \(S < 0\), tampilkan jumlah kelebihan anggaran sebagai nilai absolut dari \(S\).

**C. Harga per satuan standar**

\[
U = \frac{P}{Q}
\]

Dengan:
- \(P\): harga kemasan.
- \(Q\): berat, volume, atau jumlah isi dalam satuan standar.

Contoh: harga Rp18.000 untuk 750 gram berarti Rp24 per gram atau Rp24.000 per kilogram.

Konversi hanya boleh dilakukan antarunit yang kompatibel. Gram dan mililiter tidak boleh dibandingkan secara langsung tanpa informasi densitas.

**D. Penghematan aktual**

\[
H = T_{\text{baseline}} - T_{\text{alternatif}}
\]

Jika hasil positif, alternatif lebih murah. Jika negatif, alternatif lebih mahal.

Aplikasi tidak boleh menyatakan penghematan sebagai fakta jika kualitas, kuantitas, atau kebutuhan yang dibandingkan berbeda.

**E. Batas belanja**

Tampilkan:
- Total anggaran.
- Total kebutuhan.
- Sisa atau kelebihan.
- Persentase anggaran yang digunakan.

\[
U_{\%} = \frac{T}{B}\times100\%
\]

Jika \(B=0\), persentase tidak boleh dihitung.

### 5.3 Modul Margin Rescue

**A. Total biaya bahan per batch**

\[
C_b = \sum_{i=1}^{n} q_i c_i
\]

Dengan:
- \(q_i\): jumlah bahan yang digunakan.
- \(c_i\): biaya bahan per satuan.

Biaya bahan harus disesuaikan dengan jumlah yang benar-benar digunakan, bukan selalu jumlah yang dibeli.

**B. HPP per unit**

\[
HPP = \frac{C_{\text{batch}}}{N}
\]

Dengan:
- \(C_{\text{batch}}\): total biaya batch.
- \(N\): jumlah unit layak jual yang dihasilkan.

Total biaya batch dapat mencakup bahan, kemasan, tenaga kerja langsung, dan overhead produksi yang dialokasikan.

Jika jumlah unit layak jual nol, tampilkan validasi dan jangan membagi.

**C. Harga jual berdasarkan target margin**

\[
P = \frac{HPP}{1-m}
\]

Dengan:
- \(P\): harga jual.
- \(m\): target margin dalam desimal.

Target margin 30% berarti \(m=0{,}30\).

Validasi \(0 \leq m < 1\). Jika margin target 100% atau lebih, harga tidak dapat dihitung menggunakan rumus ini.

**D. Margin aktual**

\[
M = \frac{P-HPP}{P}\times100\%
\]

Rumus ini berbeda dengan markup.

**E. Markup**

\[
K = \frac{P-HPP}{HPP}\times100\%
\]

Jangan menampilkan margin dan markup sebagai istilah yang sama.

**F. Laba kontribusi per unit**

\[
L_k = P - V
\]

Dengan \(V\) sebagai total biaya variabel per unit, termasuk komponen biaya penjualan variabel jika relevan.

**G. Break-even unit**

\[
BE = \left\lceil \frac{F}{P-V}\right\rceil
\]

Dengan:
- \(F\): biaya tetap dalam periode yang dipilih.
- \(P\): pendapatan bersih per unit sebelum biaya variabel.
- \(V\): biaya variabel per unit.

Jika \(P-V \leq 0\), tampilkan bahwa break-even tidak dapat dicapai dalam asumsi tersebut.

**H. Simulasi perubahan biaya**

Jika harga bahan berubah sebesar \(r\):

\[
C_{\text{baru}}=C_{\text{bahan}}\times(1+r)+C_{\text{lain}}
\]

Jangan menerapkan persentase perubahan bahan terhadap semua biaya jika hanya biaya bahan yang berubah.

### 5.4 Modul Profit Kit Reseller

**A. Pendapatan bersih per pesanan**

\[
R = P_s - D - R_f
\]

Dengan:
- \(P_s\): harga jual sebelum diskon.
- \(D\): diskon yang ditanggung penjual.
- \(R_f\): refund atau pengembalian dana yang dialokasikan ke pesanan.

Jangan mengurangi refund dua kali jika sudah tercermin dalam pendapatan bersih yang diinput.

**B. Biaya platform**

Jika biaya platform berbasis persentase dari dasar tertentu:

\[
C_p = r_p \times A_p
\]

Dengan:
- \(r_p\): tarif platform.
- \(A_p\): dasar perhitungan komisi sesuai ketentuan platform.

Dasar komisi harus dapat dikonfigurasi. Jangan mengasumsikan semua platform menggunakan dasar komisi yang sama.

**C. Laba per pesanan**

\[
L = R - C_g - C_p - C_a - C_k - C_o
\]

Dengan:
- \(C_g\): biaya barang.
- \(C_p\): biaya platform dan pembayaran.
- \(C_a\): biaya iklan yang dialokasikan.
- \(C_k\): biaya kemasan.
- \(C_o\): biaya lain yang ditanggung penjual.

Biaya pengiriman hanya dikurangkan jika menjadi tanggungan penjual dan belum masuk ke komponen biaya lain.

**D. Margin keuntungan reseller**

\[
M = \frac{L}{R}\times100\%
\]

Jika \(R \leq 0\), margin tidak dapat dihitung dan harus ditampilkan sebagai tidak tersedia.

**E. Biaya iklan per pesanan**

\[
C_a = \frac{\text{Total biaya iklan}}{\text{Jumlah pesanan yang diatribusikan}}
\]

Jika jumlah pesanan nol, jangan membagi.

**F. Perbandingan produk**

Tampilkan:
- Laba nominal per unit.
- Margin per unit.
- Estimasi laba berdasarkan volume.
- Total biaya variabel.
- Asumsi jumlah pesanan.

Jangan menentukan produk terbaik hanya berdasarkan margin jika volume, risiko retur, dan kebutuhan modal berbeda.

### 5.5 Modul Generator Paket Hemat

**A. Harga normal paket**

\[
P_n = \sum_{i=1}^{n} P_i
\]

Dengan \(P_i\) sebagai harga jual normal tiap komponen sesuai kuantitas yang dipilih.

**B. Total biaya paket**

\[
C_b = \sum_{i=1}^{n} q_i C_i + C_{\text{paket}}
\]

Dengan:
- \(q_i\): jumlah masing-masing produk.
- \(C_i\): biaya per unit produk.
- \(C_{\text{paket}}\): biaya kemasan tambahan atau biaya khusus paket.

**C. Diskon nominal**

\[
D = P_n-P_p
\]

Dengan \(P_p\) sebagai harga jual paket.

**D. Persentase diskon**

\[
D_{\%} = \frac{P_n-P_p}{P_n}\times100\%
\]

Jika \(P_n=0\), persentase diskon tidak dapat dihitung.

**E. Laba paket**

\[
L_p = P_p-C_b-C_v
\]

Dengan \(C_v\) sebagai biaya penjualan variabel yang relevan dan belum dimasukkan ke \(C_b\).

**F. Harga minimum berdasarkan target margin**

\[
P_{\min} = \frac{C_b+C_v}{1-m}
\]

Rumus ini berlaku jika seluruh biaya dalam pembilang merupakan biaya yang perlu ditutup oleh harga paket dan \(m<1\).

**G. Diskon maksimum**

\[
D_{\max}=P_n-P_{\min}
\]

Jika hasil negatif, harga normal tidak cukup untuk mencapai target margin yang ditentukan. Jangan menampilkan diskon maksimum positif secara keliru.

**H. Validasi kelayakan paket**

Paket harus menampilkan status:
- Menguntungkan sesuai target.
- Menguntungkan tetapi di bawah target.
- Impas.
- Merugi.

Status harus didasarkan pada laba dan target margin yang benar-benar dihitung.

## 6. Validasi Input dan Error Handling

Semua modul harus menerapkan validasi yang konsisten.

- Nilai uang tidak boleh negatif kecuali suatu jenis transaksi secara eksplisit mendukung nilai negatif.
- Kuantitas harus lebih besar dari nol untuk perhitungan harga satuan.
- Persentase harus berada pada rentang yang valid.
- Pembagi nol harus ditangani.
- Field wajib harus diperiksa sebelum kalkulasi.
- Nilai terlalu besar harus ditolak jika melampaui batas aman.
- Angka dengan format lokal harus dikonversi secara eksplisit ke nilai numerik.
- Input kosong tidak boleh otomatis dianggap sebagai nilai valid jika field wajib.
- Perubahan input harus memperbarui hasil tanpa menghasilkan `NaN`, `Infinity`, atau hasil yang tidak terdefinisi.
- Penghapusan simulasi harus meminta konfirmasi.
- Kegagalan penyimpanan harus ditampilkan kepada pengguna.
- Pengguna harus dapat mengunduh data sebelum menghapus seluruh penyimpanan lokal.

Gunakan pesan validasi dalam bahasa Indonesia yang menjelaskan tindakan perbaikan, bukan hanya kode error.

## 7. Skema Data

MVP menggunakan penyimpanan lokal melalui IndexedDB. Gunakan Dexie.js atau abstraksi IndexedDB setara untuk menghindari pengelolaan transaksi manual yang berlebihan.

### 7.1 Entitas umum

**Simulation**
- `id`: UUID.
- `moduleType`: household, margin, reseller, bundle.
- `name`: nama simulasi.
- `payload`: data spesifik modul dengan schema validation.
- `createdAt`: waktu pembuatan.
- `updatedAt`: waktu perubahan.
- `schemaVersion`: versi struktur data.

**Settings**
- `id`.
- `currency`: IDR.
- `locale`: id-ID.
- `theme`: system, light, dark.
- `onboardingCompleted`: boolean.

**Product**
- `id`: UUID.
- `name`.
- `unit`.
- `costPerUnit`.
- `sellingPrice`.
- `category`.
- `createdAt`.
- `updatedAt`.

### 7.2 Model spesifik modul

**HouseholdSimulation**
- `budget`.
- `items[]`: nama, kuantitas, satuan, harga.
- `baselineItems[]`.
- `alternativeItems[]`.
- `notes`.

**MarginSimulation**
- `productName`.
- `batchYield`.
- `ingredients[]`: nama, kuantitas, harga per satuan.
- `packagingCost`.
- `directLaborCost`.
- `allocatedOverhead`.
- `sellingPrice`.
- `targetMargin`.

**ResellerSimulation**
- `productName`.
- `sellingPrice`.
- `discount`.
- `refundAllowance`.
- `unitCost`.
- `platformFeeRate`.
- `platformFeeBase`.
- `paymentFee`.
- `packagingCost`.
- `sellerShippingSubsidy`.
- `adCostPerOrder`.
- `otherCosts`.
- `orderVolume`.

**BundleSimulation**
- `bundleName`.
- `items[]`: product ID atau data produk snapshot, kuantitas, biaya, harga normal.
- `extraPackagingCost`.
- `extraVariableSellingCost`.
- `bundlePrice`.
- `targetMargin`.

Simpan snapshot biaya dan harga pada simulasi supaya perubahan data produk tidak mengubah hasil simulasi lama tanpa sepengetahuan pengguna.

### 7.3 Versi berikutnya: backend

Jika validasi pasar berhasil, tambahkan:
- Autentikasi.
- Database cloud.
- Sinkronisasi lintas perangkat.
- Entitas user dan entitlement premium.
- Riwayat pembelian.
- Server-side verification untuk status premium.
- Kebijakan isolasi data antar-user.

Jangan menambahkan backend hanya demi membuat aplikasi terlihat seperti SaaS.

## 8. Desain UI/UX

### 8.1 Prinsip visual

- Modern, ringan, dan mudah digunakan di ponsel.
- Bahasa Indonesia yang sederhana.
- Hindari kesan aplikasi akuntansi korporat yang rumit.
- Fokus pada hasil angka, keputusan, dan tindakan berikutnya.
- Warna tidak boleh menjadi satu-satunya pembeda status.
- Gunakan aksesibilitas keyboard, kontras teks yang memadai, dan label input yang jelas.

### 8.2 Rekomendasi desain

- Background: putih atau abu-abu sangat muda.
- Teks: charcoal atau navy.
- Primary: teal atau hijau tua.
- Success: hijau.
- Warning: amber.
- Error: merah.
- Card radius: 12–16 px.
- Layout mobile-first.
- Bottom navigation untuk tampilan ponsel bila sesuai.
- Sidebar untuk desktop.
- Hasil kalkulasi penting ditampilkan dalam kartu ringkas.

### 8.3 Struktur halaman kalkulator

Setiap halaman kalkulator menggunakan pola yang konsisten:

1. Judul dan penjelasan singkat.
2. Form input.
3. Hasil utama.
4. Detail perhitungan.
5. Indikator status.
6. Rekomendasi tindakan berbasis aturan.
7. Simpan, duplikasi, ekspor, atau reset.
8. Penjelasan asumsi.

Jangan menyembunyikan rumus penting di balik rekomendasi yang tidak bisa dijelaskan.

## 9. PWA dan Kualitas Teknis

- Web app harus responsif pada viewport ponsel dan desktop.
- PWA manifest valid.
- Service worker harus memiliki strategi caching yang aman.
- Kalkulator dasar dapat berjalan offline setelah aset aplikasi tersedia.
- Data simulasi disimpan di IndexedDB.
- Aplikasi harus menjelaskan bahwa data lokal dapat hilang jika browser atau penyimpanan situs dihapus.
- Ekspor dan impor data lokal disediakan sebagai mekanisme backup.
- Jangan menyimpan kredensial pembayaran atau data sensitif yang tidak diperlukan.
- Tidak ada ketergantungan wajib terhadap API AI eksternal untuk kalkulasi.
- Perhitungan inti harus dapat diuji secara otomatis.
- Gunakan TypeScript strict mode dan validasi schema runtime, misalnya Zod.

Jangan mengklaim data sudah tersinkronisasi ke cloud apabila seluruh data masih berada di perangkat pengguna.

## 10. Model Freemium dan Monetisasi

### 10.1 Free

Tujuan: memungkinkan calon pelanggan merasakan manfaat produk sebelum membeli.

Contoh batas awal:
- Seluruh modul dapat dicoba.
- Kalkulasi dasar tersedia.
- Maksimal lima simulasi tersimpan per modul.
- Ekspor terbatas.
- Tidak membutuhkan akun untuk penggunaan dasar.

Batas tersebut harus dikonfigurasi secara konsisten dan tidak boleh menghilangkan data pengguna saat batas tercapai.

### 10.2 Plus — hipotesis harga Rp39.000 sekali bayar

- Batas simulasi lebih tinggi atau tidak terbatas untuk penggunaan pribadi yang wajar.
- Riwayat simulasi.
- Ekspor laporan.
- Perbandingan skenario.
- Akses fitur lanjutan sesuai paket yang dipublikasikan.

### 10.3 Bisnis — hipotesis harga Rp99.000 sekali bayar

- Fitur lanjutan untuk produk dan simulasi usaha.
- Laporan keuntungan.
- Ekspor data bisnis.
- Simulasi paket promosi.
- Template laporan yang lebih lengkap.

Harga dan batas lisensi perlu diuji dengan calon pembeli. Lisensi sekali bayar harus menyatakan apakah pembelian berlaku untuk versi tertentu atau mencakup pembaruan di masa depan.

### 10.4 Pembayaran

Untuk MVP:
- Sediakan halaman paket dan instruksi pembelian.
- Verifikasi transaksi secara manual untuk penjualan awal jika volume masih rendah.
- Berikan bukti transaksi dan ketentuan lisensi.
- Jangan membuka fitur premium hanya berdasarkan parameter URL yang bisa dimanipulasi.
- Pisahkan mekanisme entitlement dari UI.

Setelah permintaan terbukti, integrasikan payment gateway yang sesuai dengan kebutuhan dan biaya transaksi di Indonesia.

### 10.5 Validasi monetisasi

Ukur:
- Jumlah pengunjung.
- Jumlah pengguna yang mencoba kalkulator.
- Persentase pengguna yang menyimpan simulasi.
- Klik upgrade.
- Pertanyaan calon pembeli.
- Pembelian yang benar-benar terverifikasi.
- Penggunaan ulang.
- Modul yang paling sering digunakan.

Jangan menganggap banyak pengunjung atau banyak klik sebagai bukti bahwa model bisnis sudah berhasil.

## 11. Go-to-Market

Keempat modul dipasarkan sekaligus, tetapi setiap modul memiliki pesan pemasaran dan halaman penawaran yang spesifik.

**Rumah tangga**
Pesan: rencanakan belanja dan bandingkan harga sebelum uang dikeluarkan.

Kanal:
- Video pendek demonstrasi.
- Komunitas keluarga dan pengelolaan rumah tangga.
- Konten edukasi anggaran.

**Margin Rescue**
Pesan: hitung HPP dan harga jual sebelum memberikan diskon.

Kanal:
- Komunitas UMKM.
- Grup pemilik warung dan kedai.
- Video kalkulasi harga jual.
- Demo langsung.

**Profit Kit Reseller**
Pesan: hitung keuntungan setelah seluruh biaya penjualan.

Kanal:
- Komunitas reseller.
- Konten simulasi biaya platform.
- Demo perhitungan profit per pesanan.

**Generator Paket Hemat**
Pesan: buat promo yang menarik tanpa kehilangan kendali atas margin.

Kanal:
- Komunitas penjual produk.
- Konten perbandingan paket.
- Contoh kasus bundling.

### 11.1 Target validasi awal

- Wawancarai setidaknya lima calon pengguna dari masing-masing segmen.
- Publikasikan demo untuk keempat modul.
- Dapatkan pengguna yang mencoba sendiri.
- Cari bukti pembelian nyata.
- Bandingkan tingkat penggunaan dan kesediaan membayar tiap segmen.

Target ini adalah rencana eksperimen, bukan proyeksi penjualan yang dijamin.

## 12. Acceptance Criteria

### A. Fondasi aplikasi

- [ ] Semua halaman utama dapat dibuka tanpa error.
- [ ] Navigasi bekerja di desktop dan mobile.
- [ ] Format Rupiah konsisten.
- [ ] Input tervalidasi.
- [ ] Empty state dan error state tersedia.
- [ ] Data lokal bertahan setelah refresh.
- [ ] Pengguna dapat mengekspor backup.
- [ ] PWA manifest valid.
- [ ] Kalkulator inti bekerja tanpa internet setelah aplikasi dan aset terkait tersedia.

### B. Hemat Rumah Tangga

- [ ] Total belanja benar.
- [ ] Sisa anggaran benar.
- [ ] Harga satuan benar.
- [ ] Perbandingan alternatif benar.
- [ ] Pembagi nol ditangani.
- [ ] Konversi unit yang tidak kompatibel ditolak.

### C. Margin Rescue

- [ ] Total biaya batch benar.
- [ ] HPP per unit benar.
- [ ] Harga jual target margin benar.
- [ ] Margin dan markup dibedakan.
- [ ] Break-even benar.
- [ ] Margin target yang tidak valid ditolak.
- [ ] Perubahan biaya hanya memengaruhi komponen yang sesuai.

### D. Profit Kit Reseller

- [ ] Biaya platform mengikuti dasar perhitungan yang dipilih.
- [ ] Biaya iklan per pesanan benar.
- [ ] Laba per pesanan benar.
- [ ] Margin tidak dihitung ketika pendapatan nol atau negatif.
- [ ] Biaya tidak terhitung dua kali.
- [ ] Perbandingan skenario konsisten.

### E. Generator Paket Hemat

- [ ] Harga normal paket benar.
- [ ] Biaya paket benar.
- [ ] Diskon nominal dan persentase benar.
- [ ] Harga minimum berdasarkan margin benar.
- [ ] Status laba, impas, atau rugi benar.
- [ ] Paket yang merugi tidak diberi label menguntungkan.

### F. Keamanan dan reliabilitas

- [ ] Tidak ada secret API di frontend.
- [ ] Data impor divalidasi.
- [ ] Kegagalan penyimpanan tidak ditampilkan sebagai keberhasilan.
- [ ] Penghapusan data memerlukan konfirmasi.
- [ ] Fungsi kalkulasi diuji secara unit.
- [ ] Perubahan struktur data mempunyai mekanisme versioning.
- [ ] Tidak ada error kritis pada console di alur utama.

### G. Peluncuran

- [ ] Pengguna baru dapat mencoba tanpa akun.
- [ ] Semua modul memiliki contoh penggunaan.
- [ ] Halaman harga menjelaskan batas lisensi.
- [ ] Alur pembelian dapat diuji.
- [ ] Fitur premium tidak bisa dibuka hanya dengan mengubah URL.
- [ ] Pengguna dapat memahami hasil tanpa bantuan pengembang.

---

# BAGIAN II — MASTER PROMPT IMPLEMENTASI UNTUK AI CODING AGENT

Gunakan prompt berikut pada AI coding agent di dalam repository proyek.

## MASTER PROMPT — BUILD HEMATPINTAR

### Role

You are a senior full-stack engineer, product designer, QA engineer, and pragmatic technical architect.

Your task is to build HematPintar, a production-minded, Indonesian-first financial decision support web application.

Do not build a generic accounting dashboard. Build a usable product that helps households and small businesses make better financial decisions through transparent, deterministic calculations.

### 1. Product requirements

Implement four fully functional modules:

1. Hemat Rumah Tangga.
2. Margin Rescue.
3. Profit Kit Reseller.
4. Generator Paket Hemat.

All modules must share the same design system, currency utilities, input validation, storage layer, simulation history patterns, and export infrastructure.

The application must be usable without registration for basic calculations.

Do not substitute static mockups for working features.

### 2. Technical constraints

Preferred stack:
- Next.js with App Router.
- TypeScript with strict mode.
- Tailwind CSS.
- Accessible reusable UI components.
- Zod or an equivalent runtime schema validator.
- IndexedDB using Dexie.js or an equivalent reliable abstraction.
- PWA manifest and service worker.
- Vitest or an equivalent unit testing framework.
- Playwright or an equivalent browser testing framework when practical.

If the repository already contains a working stack, inspect it first and reuse it unless there is a concrete reason to migrate.

Do not overwrite an existing project blindly.

Do not introduce a backend, paid AI API, or unnecessary external services for the MVP.

### 3. Required development workflow

**Phase 0 — Repository audit**

Before changing files:
- Inspect the existing repository structure.
- Read package.json, scripts, dependencies, configuration, and existing application routes.
- Identify the current framework, UI conventions, and reusable components.
- Check existing tests and build commands.
- Identify any existing implementation that can be reused.
- Produce a concise implementation plan based on the actual repository.

Do not assume the repository is empty.

**Phase 1 — Application foundation**

Implement:
- Shared layout and navigation.
- Responsive desktop and mobile shell.
- Dashboard.
- Design tokens.
- Currency and number formatting utilities.
- Form controls and validation patterns.
- IndexedDB storage abstraction.
- Simulation repository.
- CSV export and validated backup import.
- Error, loading, empty, and success states.

Use a single source of truth for domain calculations and data schemas.

**Phase 2 — Calculation engine**

Create pure, independently testable functions for all calculations.

Do not place financial business logic directly inside React components.

Required utility groups:

- `household-calculations`
- `margin-calculations`
- `reseller-calculations`
- `bundle-calculations`
- `currency-format`
- `unit-conversion`
- `validation`
- `export`

Every calculation must return a well-defined result or a structured validation error.

Prevent:
- Division by zero.
- NaN and Infinity.
- Invalid percentages.
- Incompatible unit conversions.
- Double-counting costs.
- Silent rounding errors.
- Incorrect interpretation of margin versus markup.

Use integer Rupiah or a suitable decimal representation for monetary calculations.

Document the rounding policy.

**Phase 3 — Implement four modules**

#### Module A: Hemat Rumah Tangga

Implement:
- Budget input.
- Shopping list CRUD.
- Quantity and price input.
- Total spending.
- Remaining budget and overspending.
- Unit price comparison.
- Baseline versus alternative shopping scenarios.
- Savings calculation.
- Save, edit, duplicate, delete, and export.

Display the assumptions behind each comparison.

Do not compare incompatible units without a valid conversion.

#### Module B: Margin Rescue

Implement:
- Product creation.
- Recipe or ingredient cost breakdown.
- Batch yield.
- Packaging costs.
- Direct labor and allocated overhead.
- HPP per unit.
- Target-margin selling price.
- Actual margin and markup.
- Contribution profit.
- Break-even units.
- Material cost sensitivity scenarios.

Do not confuse product gross margin with net profit after all business expenses.

Clearly identify excluded costs.

#### Module C: Profit Kit Reseller

Implement:
- Product cost.
- Selling price.
- Seller-funded discounts.
- Platform fees with configurable fee bases.
- Payment fees.
- Advertising cost allocation.
- Packaging.
- Seller-funded shipping subsidy.
- Refund allowance.
- Other costs.
- Profit per order.
- Profit margin.
- Volume-based scenarios.
- Product comparison.

Do not hardcode marketplace fee schedules that can change.

Do not count shipping, discounts, refunds, or commissions twice.

#### Module D: Generator Paket Hemat

Implement:
- Bundle creation.
- Product selection or manual product entry.
- Quantity per product.
- Normal selling price.
- Total bundle cost.
- Additional packaging and variable selling costs.
- Bundle selling price.
- Discount amount and percentage.
- Minimum price at target margin.
- Maximum allowable discount.
- Profit and margin status.
- Scenario comparison.

If a bundle is below target margin, clearly distinguish it from a loss-making bundle.

Never label an unprofitable bundle as profitable.

### 4. UI requirements

Create a coherent and polished consumer/business utility interface.

Visual direction:
- Clean and modern.
- Mobile-first.
- Indonesian-friendly.
- White or very light neutral background.
- Dark readable text.
- Teal or dark green primary accent.
- Consistent cards and spacing.
- Responsive forms.
- Clear financial result cards.
- Accessible labels and keyboard navigation.

Each module must contain:
1. Clear title.
2. Short explanation.
3. Input form.
4. Immediate or explicit calculation.
5. Main result.
6. Calculation breakdown.
7. Status or warning.
8. Save and export actions.
9. Reset confirmation.
10. Helpful empty state.

Avoid:
- Excessive gradients.
- Decorative charts without meaningful data.
- Fake KPIs.
- Fake activity feeds.
- Nonfunctional buttons.
- Placeholder links.
- Fake payment success.
- Unexplained AI-generated recommendations.

### 5. Data architecture

Use typed schemas and versioned local storage.

Implement entities for:
- Settings.
- Simulations.
- Products.
- Module-specific simulation payloads.

Every simulation must have:
- Stable UUID.
- Module type.
- Name.
- Creation timestamp.
- Update timestamp.
- Schema version.
- Validated payload.

Use snapshot values in historical simulations so that changing a product's price does not silently rewrite previous calculations.

Support validated export and import.

If data migration is needed, implement explicit migration functions.

Never claim cloud synchronization if data remains local.

### 6. Freemium architecture

Implement feature entitlements separately from UI presentation.

Initial plan:
- Free: basic calculations, limited saved simulations.
- Plus: expanded history, exports, advanced scenarios.
- Business: advanced business calculations and reporting.

Use configurable limits.

Premium restrictions must not destroy user data.

Do not implement a fake payment gateway.

For the MVP, create:
- Pricing page.
- Plan comparison.
- Upgrade call-to-action.
- A development-only entitlement mechanism for testing.
- A clear production integration boundary.

If premium entitlements are eventually stored in a browser, document the limitation. Do not claim that client-only flags provide secure payment verification.

### 7. Testing requirements

Write unit tests for the calculation engine.

Minimum scenarios:
- Zero and negative inputs.
- Zero budget.
- Empty shopping list.
- Incompatible unit conversions.
- Target margin of 0%.
- Invalid target margin of 100% or more.
- Selling price below cost.
- Zero contribution margin.
- Zero order volume.
- Platform fee percentage with different fee bases.
- Discounts exceeding normal price.
- Bundle price below total cost.
- Imported invalid JSON.
- Duplicate simulations.
- Persistence after refresh.

Use known expected values to verify all financial calculations.

Add end-to-end tests for:
- Navigation.
- Creating a simulation.
- Editing and saving.
- Reloading persisted data.
- Exporting data.
- Handling invalid input.
- Mobile layout.
- PWA installation prerequisites.

Do not mark tests as passed unless they were actually executed.

### 8. Performance and security

- Avoid unnecessary dependencies.
- Keep client bundles small.
- Lazy-load nonessential module components when appropriate.
- Use semantic HTML and accessible controls.
- Validate all imported data.
- Handle IndexedDB failures.
- Do not expose secret keys.
- Do not send financial data to third parties by default.
- Keep all core calculations available without an AI service.
- Ensure cached application assets do not create misleading stale state.
- Document local-data backup and recovery limitations.

### 9. Definition of done

The implementation is complete only when:
- All four modules work.
- Financial calculations are covered by tests.
- The UI is responsive.
- Simulations persist correctly.
- Export and import work.
- Validation and error states are implemented.
- PWA configuration is valid.
- No critical errors remain in primary flows.
- Production build succeeds.
- The application can be deployed using documented instructions.

### 10. Final execution instructions

Work in small, verifiable phases.

After each phase:
1. Run the relevant tests.
2. Run type checking.
3. Run linting if configured.
4. Run the production build when appropriate.
5. Fix failures before proceeding.
6. Report actual results, not assumed results.

Do not stop after producing a plan or mockup.

Implement the working application in the existing repository.

If a critical decision is ambiguous, inspect the codebase and choose the simplest safe implementation consistent with the PRD. Ask only when the ambiguity materially changes product behavior or data integrity.

At completion, provide:
- Implemented feature list.
- Actual file and route changes.
- Database/storage design.
- Test results.
- Build result.
- Known limitations.
- Local development instructions.
- Deployment instructions.
- A prioritized list of remaining work.

**Final objective:** deliver a functional HematPintar MVP that can be demonstrated to Indonesian users and used to validate willingness to pay, without requiring a large initial infrastructure budget.
