import { fromErrors, isFiniteNumber, nonNegativeMoney, positiveQty } from './validation'
import type { Result, ValidationError } from './result'

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
