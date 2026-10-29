import { fromErrors, isFiniteNumber, nonNegativeMoney, positiveQty } from './validation'
import type { Result, ValidationError } from './result'
import type { Satuan } from './unit-conversion'

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
