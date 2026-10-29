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

export type StatusLabaReseller = 'untung' | 'impas' | 'rugi'

export interface RingkasanBiayaReseller {
  pendapatanBersih: number
  dasarKomisi: number
  biayaPlatform: number
  totalBiayaVariabel: number
  labaPerPesanan: number
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

function hitungDasarKomisi(
  input: BiayaPlatformInput,
  pendapatan: number,
): Result<number> {
  switch (input.dasarKomisi) {
    case 'harga_sebelum_diskon':
      return ok(input.hargaJual)
    case 'harga_setelah_diskon':
      return ok(input.hargaJual - input.diskon)
    case 'pendapatan_bersih':
      return ok(pendapatan)
    default:
      return fail({
        field: 'dasarKomisi',
        code: 'DASAR_KOMPISI_TIDAK_DIKENAL',
        message:
          'Dasar komisi tidak dikenali; pilih harga sebelum diskon, harga setelah diskon, atau pendapatan bersih.',
      })
  }
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

  const dasar = hitungDasarKomisi(input, pendapatan.value)
  if (!dasar.ok) return dasar

  return ok(input.tarifPlatform * dasar.value)
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
 * Ringkasan biaya per pesanan. Diskon dan refund sudah tercermin di
 * pendapatan bersih, lalu seluruh biaya variabel dikurangkan satu kali.
 * `dasarKomisi` ikut dikembalikan agar dasar tarif platform dapat ditampilkan.
 */
export function ringkasanBiayaReseller(
  input: LabaPerPesananInput,
): Result<RingkasanBiayaReseller> {
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

  const laba = labaPerPesanan(input)
  if (!laba.ok) return laba

  const dasar = hitungDasarKomisi(input, pendapatan.value)
  if (!dasar.ok) return dasar

  return ok({
    pendapatanBersih: pendapatan.value,
    dasarKomisi: dasar.value,
    biayaPlatform: platform.value,
    totalBiayaVariabel:
      input.biayaBarang +
      platform.value +
      input.biayaPembayaran +
      input.biayaIklanPerPesanan +
      input.biayaKemasan +
      input.subsidiOngkir +
      input.biayaLain,
    labaPerPesanan: laba.value,
  })
}

export function estimasiLabaVolume(
  labaPerPesanan: number,
  volumePesanan: number,
): Result<number> {
  if (!isFiniteNumber(labaPerPesanan)) {
    return fail({
      field: 'labaPerPesanan',
      code: 'BUKAN_ANGKA',
      message:
        'labaPerPesanan harus berupa angka yang valid; periksa kembali isian Anda.',
    })
  }

  const volumeError = positiveQty('volumePesanan', volumePesanan)
  if (volumeError) return fail(volumeError)

  return ok(labaPerPesanan * volumePesanan)
}

export function statusLabaReseller(
  labaPerPesanan: number,
): Result<StatusLabaReseller> {
  if (!isFiniteNumber(labaPerPesanan)) {
    return fail({
      field: 'labaPerPesanan',
      code: 'BUKAN_ANGKA',
      message:
        'labaPerPesanan harus berupa angka yang valid; periksa kembali isian Anda.',
    })
  }

  if (labaPerPesanan > 0) return ok('untung')
  if (labaPerPesanan < 0) return ok('rugi')
  return ok('impas')
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
