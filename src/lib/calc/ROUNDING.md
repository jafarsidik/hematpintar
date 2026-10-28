# Kebijakan Pembulatan

Berlaku untuk seluruh fungsi di `src/lib/calc/`.

## Representasi

- **Uang** disimpan sebagai integer Rupiah pada input. Nilai antara tidak
  dibulatkan, sehingga hasil pembagian (misalnya HPP per unit atau harga per
  gram) dapat berupa pecahan.
- **Persentase dan rasio** direpresentasikan sebagai pecahan desimal:
  `0,3` berarti 30%, `0,1` berarti 10%. Ini berlaku untuk target margin,
  tarif platform, perubahan biaya bahan, serta nilai kembalian margin,
  markup, dan diskon persen. Pembulatan ke bentuk persen hanya terjadi di
  fungsi format.
- Uang yang ditampilkan dibulatkan hanya oleh `formatRupiah` (0 desimal).

## Pembulatan ke atas

Hanya fungsi berikut yang membulatkan hasil akhirnya dengan `Math.ceil` ke
Rupiah atau unit penuh:

| Fungsi | Alasan |
| --- | --- |
| `hargaJualDariMargin` | Harga jual tidak boleh kurang dari yang dibutuhkan target margin |
| `hargaMinimum` (paket) | Harga minimum paket tidak boleh di bawah target margin |
| `breakEvenUnit` | Jumlah unit harus bilangan bulat dan tidak boleh kurang dari hasil hitung |

Tidak ada fungsi lain yang membulatkan nilai antara maupun hasil akhir.

## Batas dan error

- Pembagi nol, `NaN`, `Infinity`, dan negatif yang tidak sah dikembalikan
  sebagai `Result` gagal berisi `ValidationError`; fungsi tidak melempar
  exception.
- `persenAnggaranTerpakai` mengembalikan `null` (bukan error) bila anggaran
  nol, karena persentase memang tidak tersedia.
- `breakEvenUnit` mengembalikan error `BREAK_EVEN_TIDAK_TERCAPAI` bila
  `hargaJual - biayaVariabel <= 0`.
- `diskonMaksimum` mengembalikan error `DISKON_MAKSIMUM_TIDAK_TERSEDIA` bila
  hasilnya negatif, bukan angka positif palsu.
- `parseRupiahInput` hanya menerima Rupiah bulat tanpa koma desimal. Format
  ambigu seperti `1,5`, `1.500,00`, atau `1 500` ditolak.

## Margin vs markup

- Margin = `(hargaJual - HPP) / hargaJual`
- Markup = `(hargaJual - HPP) / HPP`

Keduanya tidak boleh dipertukarkan. `marginAktual` dan `markup` memakai
rumus yang berbeda dan diuji terpisah.
