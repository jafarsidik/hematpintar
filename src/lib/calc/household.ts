import { fromErrors, isFiniteNumber, nonNegativeMoney, positiveQty } from './validation'
import { fail, ok, type Result, type ValidationError } from './result'
import { convertUnit, dimensiSatuan, type Satuan } from './unit-conversion'

export interface BelanjaItem {
  jumlah: number
  hargaSatuan: number
}

export function totalBelanja(
  items: readonly BelanjaItem[],
): Result<number> {
  const errors: (ValidationError | null)[] = []
  let total = 0

  items.forEach((item, index) => {
    errors.push(positiveQty(`items[${index}].jumlah`, item.jumlah))
    errors.push(
      nonNegativeMoney(`items[${index}].hargaSatuan`, item.hargaSatuan),
    )

    if (isFiniteNumber(item.jumlah) && isFiniteNumber(item.hargaSatuan)) {
      total += item.jumlah * item.hargaSatuan
    }
  })

  return fromErrors(errors, () => total)
}

export function sisaAnggaran(budget: number, total: number): Result<number> {
  return fromErrors(
    [nonNegativeMoney('budget', budget), nonNegativeMoney('total', total)],
    () => budget - total,
  )
}

/**
 * Mengembalikan proporsi anggaran terpakai (0,75 = 75%), atau null bila
 * anggaran nol sehingga persentase tidak tersedia.
 */
export function persenAnggaranTerpakai(
  budget: number,
  total: number,
): Result<number | null> {
  return fromErrors(
    [nonNegativeMoney('budget', budget), nonNegativeMoney('total', total)],
    () => (budget === 0 ? null : total / budget),
  )
}

export function hargaPerSatuanStandar(
  hargaKemasan: number,
  isiKemasan: number,
): Result<number> {
  return fromErrors(
    [
      nonNegativeMoney('hargaKemasan', hargaKemasan),
      positiveQty('isiKemasan', isiKemasan),
    ],
    () => hargaKemasan / isiKemasan,
  )
}

export type SatuanStandar = 'kg' | 'l' | 'pcs'

export interface HargaSatuanStandarDetail {
  /** Harga per satuan standar (kg, l, atau pcs). */
  harga: number
  /** Satuan standar yang dipakai untuk menampilkan harga. */
  satuan: SatuanStandar
  /** Isi kemasan setelah dikonversi ke satuan standar. */
  isiStandar: number
}

/**
 * Memetakan satuan input ke satuan standar pembanding: massa ke kg,
 * volume ke l, dan jumlah ke pcs. Gram/mililiter tidak pernah dipetakan
 * ke kg/l bersama satuan dimensi lain.
 */
export function satuanStandar(satuan: Satuan): SatuanStandar {
  if (satuan === 'g' || satuan === 'kg') return 'kg'
  if (satuan === 'ml' || satuan === 'l') return 'l'
  return 'pcs'
}

/**
 * Menghitung harga per satuan standar beserta isi kemasan yang sudah
 * dinormalisasi. Contoh: Rp18.000 untuk 750 g menjadi Rp24.000/kg.
 */
export function hargaPerSatuanStandarDetail(
  hargaKemasan: number,
  isiKemasan: number,
  satuan: Satuan,
): Result<HargaSatuanStandarDetail> {
  return fromErrors(
    [
      nonNegativeMoney('hargaKemasan', hargaKemasan),
      positiveQty('isiKemasan', isiKemasan),
    ],
    () => {
      const isiStandar =
        satuan === 'g' || satuan === 'ml'
          ? isiKemasan / 1_000
          : isiKemasan

      return {
        harga: hargaKemasan / isiStandar,
        satuan: satuanStandar(satuan),
        isiStandar,
      }
    },
  )
}

export type StatusAnggaran =
  | 'dalam_anggaran'
  | 'mendekati_batas'
  | 'melebihi_anggaran'

/** Ambang batas "mendekati batas" adalah 90% anggaran terpakai. */
export const BATAS_MENDEKATI_ANGGARAN = 0.9

/**
 * Menentukan status belanja terhadap anggaran. Status "melebihi" selalu
 * menang ketika total lebih besar dari anggaran, termasuk saat anggaran 0.
 */
export function statusAnggaran(
  budget: number,
  total: number,
): Result<StatusAnggaran> {
  return fromErrors(
    [nonNegativeMoney('budget', budget), nonNegativeMoney('total', total)],
    () => {
      if (total > budget) return 'melebihi_anggaran'
      if (budget === 0) return 'dalam_anggaran'
      if (total / budget >= BATAS_MENDEKATI_ANGGARAN) {
        return 'mendekati_batas'
      }
      return 'dalam_anggaran'
    },
  )
}

export function penghematan(
  baseline: number,
  alternatif: number,
): Result<number> {
  return fromErrors(
    [
      nonNegativeMoney('baseline', baseline),
      nonNegativeMoney('alternatif', alternatif),
    ],
    () => baseline - alternatif,
  )
}

export interface HargaEfektifInput {
  harga: number
  ongkir?: number
  voucher?: number
}

/**
 * Harga efektif total satu produk: harga + ongkir - voucher.
 * Ongkir dan voucher yang tidak diisi dianggap nol. Voucher tidak boleh
 * melebihi harga ditambah ongkir.
 */
export function hargaEfektifProduk(
  produk: HargaEfektifInput,
): Result<number> {
  const ongkir = produk.ongkir ?? 0
  const voucher = produk.voucher ?? 0
  const errors: (ValidationError | null)[] = [
    nonNegativeMoney('harga', produk.harga),
    nonNegativeMoney('ongkir', ongkir),
    nonNegativeMoney('voucher', voucher),
  ]

  const adaError = errors.some((error) => error !== null)
  if (!adaError) {
    const subtotal = produk.harga + ongkir
    if (!isFiniteNumber(subtotal)) {
      errors.push({
        field: 'harga',
        code: 'BUKAN_ANGKA',
        message:
          'harga ditambah ongkir harus berupa angka yang valid; periksa kembali isian Anda.',
      })
    } else if (voucher > subtotal) {
      errors.push({
        field: 'voucher',
        code: 'VOUCHER_MELEBIHI_TOTAL',
        message: 'voucher tidak boleh melebihi harga ditambah ongkir.',
      })
    }
  }

  return fromErrors(errors, () => produk.harga + ongkir - voucher)
}

export interface HargaPerSatuanProdukInput {
  hargaEfektif: number
  isi: number
  satuan: Satuan
}

/**
 * Harga efektif per satuan standar: massa per kg, volume per liter,
 * jumlah per pcs. Isi harus lebih besar dari nol.
 */
export function hargaPerSatuanProduk(
  produk: HargaPerSatuanProdukInput,
): Result<number> {
  const errors = [
    nonNegativeMoney('hargaEfektif', produk.hargaEfektif),
    positiveQty('isi', produk.isi),
  ].filter((error): error is ValidationError => error !== null)

  if (errors.length > 0) return fail(errors)

  const isiStandar = convertUnit(
    produk.isi,
    produk.satuan,
    satuanStandar(produk.satuan),
  )
  if (!isiStandar.ok) return fail(isiStandar.errors)

  const hargaPerSatuan = produk.hargaEfektif / isiStandar.value
  if (!isFiniteNumber(hargaPerSatuan)) {
    return fail({
      field: 'hargaPerSatuan',
      code: 'BUKAN_ANGKA',
      message:
        'harga per satuan harus berupa angka yang valid; periksa kembali isian Anda.',
    })
  }

  return ok(hargaPerSatuan)
}

export interface ProdukHargaDasar {
  harga: number
  ongkir?: number
  voucher?: number
  isi: number
  satuan: Satuan
}

export type ProdukRanking<T extends ProdukHargaDasar> = T & {
  hargaEfektif: number
  hargaPerSatuan: number
  satuanStandar: SatuanStandar
  /** True bila ada produk lain dengan harga per satuan yang sama. */
  seri: boolean
}

/**
 * Mengurutkan produk dari harga per satuan termurah. Semua produk wajib
 * memakai dimensi satuan yang sama; massa, volume, dan jumlah tidak
 * dipaksakan untuk dibandingkan. Produk dengan harga per satuan sama
 * mempertahankan urutan masukan dan ditandai sebagai seri.
 */
export function rankingProduk<T extends ProdukHargaDasar>(
  daftar: readonly T[],
): Result<ProdukRanking<T>[]> {
  const pertama = daftar[0]
  if (pertama) {
    const dimensi = dimensiSatuan(pertama.satuan)
    const adaDimensiLain = daftar.some(
      (produk) => dimensiSatuan(produk.satuan) !== dimensi,
    )
    if (adaDimensiLain) {
      return fail({
        field: 'satuan',
        code: 'SATUAN_TIDAK_SEBANDING',
        message: 'satuan tidak bisa dibandingkan',
      })
    }
  }

  const errors: ValidationError[] = []
  const dihitung: ProdukRanking<T>[] = []

  daftar.forEach((produk, indeks) => {
    const efektif = hargaEfektifProduk(produk)
    if (!efektif.ok) {
      for (const error of efektif.errors) {
        errors.push({
          ...error,
          field: `daftar[${indeks}].${error.field}`,
        })
      }
      return
    }

    const perSatuan = hargaPerSatuanProduk({
      hargaEfektif: efektif.value,
      isi: produk.isi,
      satuan: produk.satuan,
    })
    if (!perSatuan.ok) {
      for (const error of perSatuan.errors) {
        errors.push({
          ...error,
          field: `daftar[${indeks}].${error.field}`,
        })
      }
      return
    }

    dihitung.push({
      ...produk,
      hargaEfektif: efektif.value,
      hargaPerSatuan: perSatuan.value,
      satuanStandar: satuanStandar(produk.satuan),
      seri: false,
    })
  })

  if (errors.length > 0) return fail(errors)

  const berurutan = dihitung
    .map((produk, indeks) => ({ produk, indeks }))
    .sort(
      (a, b) =>
        a.produk.hargaPerSatuan - b.produk.hargaPerSatuan ||
        a.indeks - b.indeks,
    )
    .map((item) => item.produk)

  let mulai = 0
  while (mulai < berurutan.length) {
    const acuan = berurutan[mulai]
    if (!acuan) break

    let akhir = mulai + 1
    while (
      akhir < berurutan.length &&
      berurutan[akhir]?.hargaPerSatuan === acuan.hargaPerSatuan
    ) {
      akhir += 1
    }

    if (akhir - mulai > 1) {
      for (let indeks = mulai; indeks < akhir; indeks += 1) {
        const produk = berurutan[indeks]
        if (produk) {
          berurutan[indeks] = { ...produk, seri: true }
        }
      }
    }

    mulai = akhir
  }

  return ok(berurutan)
}

/**
 * Selisih harga efektif total yang tidak bertanda. Contoh: Beras A
 * Rp75.000 dan Beras B Rp80.000 menghasilkan Rp5.000.
 */
export function selisihHematDariTermurah(
  produk: HargaEfektifInput,
  termurah: HargaEfektifInput,
): Result<number> {
  const efektifProduk = hargaEfektifProduk(produk)
  if (!efektifProduk.ok) {
    return fail(
      efektifProduk.errors.map((error) => ({
        ...error,
        field: `produk.${error.field}`,
      })),
    )
  }

  const efektifTermurah = hargaEfektifProduk(termurah)
  if (!efektifTermurah.ok) {
    return fail(
      efektifTermurah.errors.map((error) => ({
        ...error,
        field: `termurah.${error.field}`,
      })),
    )
  }

  return ok(Math.abs(efektifProduk.value - efektifTermurah.value))
}

export type StatusKesegaranHarga = 'segar' | 'lama'

const SATU_HARI_MS = 24 * 60 * 60 * 1_000

/**
 * Menentukan kesegaran harga. Harga dianggap segar bila selisih waktu
 * tidak melebihi batas hari (default 7 hari). Tanggal tidak valid
 * dianggap lama.
 */
export function statusKesegaranHarga(
  tanggalDicek: Date | string,
  sekarang: Date | string,
  batasHari = 7,
): StatusKesegaranHarga {
  const dicek =
    tanggalDicek instanceof Date
      ? tanggalDicek.getTime()
      : Date.parse(tanggalDicek)
  const acuan =
    sekarang instanceof Date ? sekarang.getTime() : Date.parse(sekarang)

  if (
    !isFiniteNumber(dicek) ||
    !isFiniteNumber(acuan) ||
    !isFiniteNumber(batasHari)
  ) {
    return 'lama'
  }

  const batas = Math.max(0, batasHari) * SATU_HARI_MS
  if (!isFiniteNumber(batas)) return 'lama'

  return acuan - dicek <= batas ? 'segar' : 'lama'
}
