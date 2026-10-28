import { fail, ok, type Result, type ValidationError } from './result'
import {
  fromErrors,
  isFiniteNumber,
  nonNegativeMoney,
  positiveQty,
  targetMargin as validateTargetMargin,
} from './validation'

export interface PaketItem {
  jumlah: number
  biayaSatuan: number
  hargaNormalSatuan: number
}

export type StatusPaket =
  | 'sesuai_target'
  | 'di_bawah_target'
  | 'impas'
  | 'rugi'

function validasiItems(items: readonly PaketItem[]): ValidationError[] {
  const errors: ValidationError[] = []
  items.forEach((item, index) => {
    const jumlahError = positiveQty(`items[${index}].jumlah`, item.jumlah)
    if (jumlahError) errors.push(jumlahError)

    const biayaError = nonNegativeMoney(
      `items[${index}].biayaSatuan`,
      item.biayaSatuan,
    )
    if (biayaError) errors.push(biayaError)

    const hargaError = nonNegativeMoney(
      `items[${index}].hargaNormalSatuan`,
      item.hargaNormalSatuan,
    )
    if (hargaError) errors.push(hargaError)
  })
  return errors
}

export function hargaNormalPaket(
  items: readonly PaketItem[],
): Result<number> {
  const errors = validasiItems(items)
  if (errors.length > 0) return fail(errors)

  const total = items.reduce(
    (jumlah, item) => jumlah + item.jumlah * item.hargaNormalSatuan,
    0,
  )
  return ok(total)
}

export function biayaPaket(
  items: readonly PaketItem[],
  biayaKemasanTambahan = 0,
): Result<number> {
  const tambahanError = nonNegativeMoney(
    'biayaKemasanTambahan',
    biayaKemasanTambahan,
  )
  const errors = [
    ...validasiItems(items),
    ...(tambahanError ? [tambahanError] : []),
  ]
  if (errors.length > 0) return fail(errors)

  const total = items.reduce(
    (jumlah, item) => jumlah + item.jumlah * item.biayaSatuan,
    0,
  )
  return ok(total + biayaKemasanTambahan)
}

/**
 * D = harga normal - harga paket. Nilai negatif berarti harga paket lebih
 * mahal dari harga normal (bukan diskon).
 */
export function diskonNominal(
  hargaNormal: number,
  hargaPaket: number,
): Result<number> {
  return fromErrors(
    [
      nonNegativeMoney('hargaNormal', hargaNormal),
      nonNegativeMoney('hargaPaket', hargaPaket),
    ],
    () => hargaNormal - hargaPaket,
  )
}

/**
 * D% = (harga normal - harga paket) / harga normal. Dikembalikan sebagai
 * pecahan desimal.
 */
export function diskonPersen(
  hargaNormal: number,
  hargaPaket: number,
): Result<number> {
  const errors = [
    nonNegativeMoney('hargaNormal', hargaNormal),
    nonNegativeMoney('hargaPaket', hargaPaket),
  ].filter((error): error is ValidationError => error !== null)

  if (errors.length > 0) return fail(errors)

  if (hargaNormal === 0) {
    return fail({
      field: 'hargaNormal',
      code: 'HARGA_NORMAL_NOL',
      message:
        'Persentase diskon tidak dapat dihitung karena harga normal nol; isi harga normal lebih dari 0.',
    })
  }

  return ok((hargaNormal - hargaPaket) / hargaNormal)
}

export function labaPaket(
  hargaPaket: number,
  biayaTotalPaket: number,
  biayaVariabelPenjualan = 0,
): Result<number> {
  return fromErrors(
    [
      nonNegativeMoney('hargaPaket', hargaPaket),
      nonNegativeMoney('biayaTotalPaket', biayaTotalPaket),
      nonNegativeMoney('biayaVariabelPenjualan', biayaVariabelPenjualan),
    ],
    () => hargaPaket - biayaTotalPaket - biayaVariabelPenjualan,
  )
}

export function hargaMinimum(
  biayaTotal: number,
  target: number,
): Result<number> {
  return fromErrors(
    [
      nonNegativeMoney('biayaTotal', biayaTotal),
      validateTargetMargin('targetMargin', target),
    ],
    () => Math.ceil(biayaTotal / (1 - target)),
  )
}

export function diskonMaksimum(
  hargaNormal: number,
  hargaMinimumPaket: number,
): Result<number> {
  const errors = [
    nonNegativeMoney('hargaNormal', hargaNormal),
    nonNegativeMoney('hargaMinimum', hargaMinimumPaket),
  ].filter((error): error is ValidationError => error !== null)

  if (errors.length > 0) return fail(errors)

  const diskon = hargaNormal - hargaMinimumPaket
  if (diskon < 0) {
    return fail({
      field: 'hargaNormal',
      code: 'DISKON_MAKSIMUM_TIDAK_TERSEDIA',
      message:
        'Harga normal tidak cukup untuk mencapai target margin; tidak ada diskon maksimum yang aman.',
    })
  }

  return ok(diskon)
}

export function statusPaket(
  laba: number,
  margin: number,
  target: number,
): Result<StatusPaket> {
  if (!isFiniteNumber(laba)) {
    return fail({
      field: 'laba',
      code: 'BUKAN_ANGKA',
      message: 'laba harus berupa angka yang valid; periksa kembali isian Anda.',
    })
  }
  if (!isFiniteNumber(margin)) {
    return fail({
      field: 'margin',
      code: 'BUKAN_ANGKA',
      message:
        'margin harus berupa angka yang valid; periksa kembali isian Anda.',
    })
  }

  const targetError = validateTargetMargin('targetMargin', target)
  if (targetError) return fail(targetError)

  if (laba < 0) return ok('rugi')
  if (laba === 0) return ok('impas')
  if (margin < target) return ok('di_bawah_target')
  return ok('sesuai_target')
}
