import { fail, ok, type Result, type ValidationError } from './result'
import {
  isFiniteNumber,
  nonEmptyText,
  nonNegativeMoney,
  percentRange,
  positiveQty,
} from './validation'

export type DasarKomisi =
  | 'harga_sebelum_diskon'
  | 'harga_setelah_diskon'
  | 'pendapatan_bersih'

export interface BiayaPlatformInput {
  hargaJual: number
  diskon: number
  refund: number
  tarifPlatform: number
  dasarKomisi: DasarKomisi
}

export interface LabaPerPesananInput extends BiayaPlatformInput {
  biayaBarang: number
  biayaIklanPerPesanan: number
  biayaKemasan: number
  subsidiOngkir: number
  biayaPembayaran: number
  biayaLain: number
}

export interface ProdukPerbandingan {
  nama: string
  labaPerUnit: number
  volume: number
}

export interface ProdukPerbandinganHasil extends ProdukPerbandingan {
  labaTotal: number
}

export function pendapatanBersih(
  hargaJual: number,
  diskon: number,
  refund: number,
): Result<number> {
  const errors = [
    nonNegativeMoney('hargaJual', hargaJual),
    nonNegativeMoney('diskon', diskon),
    nonNegativeMoney('refund', refund),
  ].filter((error): error is ValidationError => error !== null)

  if (errors.length > 0) return fail(errors)

  if (diskon + refund > hargaJual) {
    return fail({
      field: 'diskon',
      code: 'PENDAPATAN_NEGATIF',
      message:
        'Diskon dan refund melebihi harga jual; kurangi diskon atau refund agar pendapatan bersih tidak negatif.',
    })
  }

  return ok(hargaJual - diskon - refund)
}

export function biayaPlatform(input: BiayaPlatformInput): Result<number> {
  const tarifError = percentRange('tarifPlatform', input.tarifPlatform)
  if (tarifError) return fail(tarifError)

  const pendapatan = pendapatanBersih(
    input.hargaJual,
    input.diskon,
    input.refund,
  )
  if (!pendapatan.ok) return pendapatan

  switch (input.dasarKomisi) {
    case 'harga_sebelum_diskon':
      return ok(input.tarifPlatform * input.hargaJual)
    case 'harga_setelah_diskon':
      return ok(input.tarifPlatform * (input.hargaJual - input.diskon))
    case 'pendapatan_bersih':
      return ok(input.tarifPlatform * pendapatan.value)
    default:
      return fail({
        field: 'dasarKomisi',
        code: 'DASAR_KOMPISI_TIDAK_DIKENAL',
        message:
          'Dasar komisi tidak dikenali; pilih harga sebelum diskon, harga setelah diskon, atau pendapatan bersih.',
      })
  }
}

export function biayaIklanPerPesanan(
  totalBiayaIklan: number,
  jumlahPesanan: number,
): Result<number> {
  const errors = [
    nonNegativeMoney('totalBiayaIklan', totalBiayaIklan),
    positiveQty('jumlahPesanan', jumlahPesanan),
  ].filter((error): error is ValidationError => error !== null)

  if (errors.length > 0) return fail(errors)

  return ok(totalBiayaIklan / jumlahPesanan)
}

/**
 * Diskon dan refund hanya dikurangkan sekali lewat pendapatan bersih.
 * Biaya platform dihitung dari dasar komisi yang dipilih, lalu biaya
 * pembayaran, iklan per pesanan, kemasan, subsidi ongkir, dan biaya lain
 * dikurangkan satu kali.
 */
export function labaPerPesanan(input: LabaPerPesananInput): Result<number> {
  const errors = [
    nonNegativeMoney('biayaBarang', input.biayaBarang),
    nonNegativeMoney('biayaIklanPerPesanan', input.biayaIklanPerPesanan),
    nonNegativeMoney('biayaKemasan', input.biayaKemasan),
    nonNegativeMoney('subsidiOngkir', input.subsidiOngkir),
    nonNegativeMoney('biayaPembayaran', input.biayaPembayaran),
    nonNegativeMoney('biayaLain', input.biayaLain),
  ].filter((error): error is ValidationError => error !== null)

  if (errors.length > 0) return fail(errors)

  const pendapatan = pendapatanBersih(
    input.hargaJual,
    input.diskon,
    input.refund,
  )
  if (!pendapatan.ok) return pendapatan

  const platform = biayaPlatform({
    hargaJual: input.hargaJual,
    diskon: input.diskon,
    refund: input.refund,
    tarifPlatform: input.tarifPlatform,
    dasarKomisi: input.dasarKomisi,
  })
  if (!platform.ok) return platform

  return ok(
    pendapatan.value -
      input.biayaBarang -
      platform.value -
      input.biayaPembayaran -
      input.biayaIklanPerPesanan -
      input.biayaKemasan -
      input.subsidiOngkir -
      input.biayaLain,
  )
}

/**
 * Margin = laba / pendapatan bersih. Tidak tersedia bila pendapatan <= 0.
 * Dikembalikan sebagai pecahan desimal.
 */
export function marginReseller(
  laba: number,
  pendapatan: number,
): Result<number> {
  if (!isFiniteNumber(laba)) {
    return fail({
      field: 'laba',
      code: 'BUKAN_ANGKA',
      message: 'laba harus berupa angka yang valid; periksa kembali isian Anda.',
    })
  }
  if (!isFiniteNumber(pendapatan)) {
    return fail({
      field: 'pendapatan',
      code: 'BUKAN_ANGKA',
      message:
        'pendapatan harus berupa angka yang valid; periksa kembali isian Anda.',
    })
  }
  if (pendapatan <= 0) {
    return fail({
      field: 'pendapatan',
      code: 'MARGIN_TIDAK_TERSEDIA',
      message:
        'Margin tidak dapat dihitung karena pendapatan bersih 0 atau negatif. Periksa diskon dan refund.',
    })
  }

  return ok(laba / pendapatan)
}

export function perbandinganProduk(
  produk: readonly ProdukPerbandingan[],
): Result<ProdukPerbandinganHasil[]> {
  const errors: ValidationError[] = []

  const hasil = produk.map((item, index) => {
    const namaError = nonEmptyText(`produk[${index}].nama`, item.nama)
    if (namaError) errors.push(namaError)

    if (!isFiniteNumber(item.labaPerUnit)) {
      errors.push({
        field: `produk[${index}].labaPerUnit`,
        code: 'BUKAN_ANGKA',
        message: `produk[${index}].labaPerUnit harus berupa angka yang valid; periksa kembali isian Anda.`,
      })
    }

    const volumeError = nonNegativeMoney(
      `produk[${index}].volume`,
      item.volume,
    )
    if (volumeError) errors.push(volumeError)

    return { ...item, labaTotal: item.labaPerUnit * item.volume }
  })

  return errors.length > 0 ? fail(errors) : ok(hasil)
}
