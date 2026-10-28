import { fail, ok, type Result, type ValidationError } from './result'
import {
  fromErrors,
  isFiniteNumber,
  nonNegativeMoney,
  positiveQty,
  targetMargin as validateTargetMargin,
} from './validation'

export interface Bahan {
  jumlah: number
  biayaPerSatuan: number
}

export function biayaBahanBatch(bahan: readonly Bahan[]): Result<number> {
  const errors: (ValidationError | null)[] = []
  let total = 0

  bahan.forEach((item, index) => {
    errors.push(positiveQty(`bahan[${index}].jumlah`, item.jumlah))
    errors.push(
      nonNegativeMoney(`bahan[${index}].biayaPerSatuan`, item.biayaPerSatuan),
    )

    if (isFiniteNumber(item.jumlah) && isFiniteNumber(item.biayaPerSatuan)) {
      total += item.jumlah * item.biayaPerSatuan
    }
  })

  return fromErrors(errors, () => total)
}

export function hppPerUnit(
  totalBiayaBatch: number,
  unitLayakJual: number,
): Result<number> {
  return fromErrors(
    [
      nonNegativeMoney('totalBiayaBatch', totalBiayaBatch),
      positiveQty('unitLayakJual', unitLayakJual),
    ],
    () => totalBiayaBatch / unitLayakJual,
  )
}

export function hargaJualDariMargin(
  hpp: number,
  target: number,
): Result<number> {
  return fromErrors(
    [
      nonNegativeMoney('hpp', hpp),
      validateTargetMargin('targetMargin', target),
    ],
    () => Math.ceil(hpp / (1 - target)),
  )
}

/**
 * Margin = (harga jual - HPP) / harga jual. Dikembalikan sebagai pecahan
 * desimal (0,3 = 30%), bukan poin persen.
 */
function positiveValueError(
  field: string,
  value: number,
): ValidationError | null {
  const negativeError = nonNegativeMoney(field, value)
  if (negativeError) return negativeError
  if (value === 0) {
    return {
      field,
      code: 'NILAI_TIDAK_POSITIF',
      message: `${field} harus lebih besar dari 0.`,
    }
  }
  return null
}

export function marginAktual(
  hargaJual: number,
  hpp: number,
): Result<number> {
  return fromErrors(
    [
      positiveValueError('hargaJual', hargaJual),
      nonNegativeMoney('hpp', hpp),
    ],
    () => (hargaJual - hpp) / hargaJual,
  )
}

/**
 * Markup = (harga jual - HPP) / HPP. Berbeda dari margin.
 */
export function markup(hargaJual: number, hpp: number): Result<number> {
  return fromErrors(
    [
      nonNegativeMoney('hargaJual', hargaJual),
      positiveValueError('hpp', hpp),
    ],
    () => (hargaJual - hpp) / hpp,
  )
}

export function labaKontribusi(
  hargaJual: number,
  biayaVariabel: number,
): Result<number> {
  return fromErrors(
    [
      nonNegativeMoney('hargaJual', hargaJual),
      nonNegativeMoney('biayaVariabel', biayaVariabel),
    ],
    () => hargaJual - biayaVariabel,
  )
}

export function breakEvenUnit(
  biayaTetap: number,
  hargaJual: number,
  biayaVariabel: number,
): Result<number> {
  const errors = [
    nonNegativeMoney('biayaTetap', biayaTetap),
    nonNegativeMoney('hargaJual', hargaJual),
    nonNegativeMoney('biayaVariabel', biayaVariabel),
  ].filter((error): error is ValidationError => error !== null)

  if (errors.length > 0) return fail(errors)

  const kontribusi = hargaJual - biayaVariabel
  if (kontribusi <= 0) {
    return fail({
      field: 'hargaJual',
      code: 'BREAK_EVEN_TIDAK_TERCAPAI',
      message:
        'Break-even tidak dapat dicapai karena harga jual tidak melebihi biaya variabel per unit. Naikkan harga jual atau turunkan biaya variabel.',
    })
  }

  return ok(Math.ceil(biayaTetap / kontribusi))
}

/**
 * C_baru = C_bahan x (1 + r) + C_lain. Persentase perubahan hanya
 * diterapkan pada biaya bahan.
 */
export function simulasiPerubahanBahan(
  biayaBahan: number,
  perubahanPersen: number,
  biayaLain: number,
): Result<number> {
  const errors = [
    nonNegativeMoney('biayaBahan', biayaBahan),
    nonNegativeMoney('biayaLain', biayaLain),
  ].filter((error): error is ValidationError => error !== null)

  if (!isFiniteNumber(perubahanPersen)) {
    errors.push({
      field: 'perubahanPersen',
      code: 'BUKAN_ANGKA',
      message:
        'perubahanPersen harus berupa angka yang valid; periksa kembali isian Anda.',
    })
  } else if (perubahanPersen < -1) {
    errors.push({
      field: 'perubahanPersen',
      code: 'PERUBAHAN_TIDAK_VALID',
      message:
        'Perubahan biaya bahan tidak boleh di bawah -100%; gunakan nilai seperti -0,1 untuk penurunan 10%.',
    })
  }

  if (errors.length > 0) return fail(errors)

  return ok(biayaBahan * (1 + perubahanPersen) + biayaLain)
}
