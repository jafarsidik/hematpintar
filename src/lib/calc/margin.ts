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

/**
 * Menjumlahkan biaya selain bahan: kemasan, tenaga kerja langsung, dan
 * overhead produksi yang dialokasikan.
 */
export function totalBiayaLain(
  biayaKemasan: number,
  biayaTenagaKerja: number,
  overheadTeralokasi: number,
): Result<number> {
  return fromErrors(
    [
      nonNegativeMoney('biayaKemasan', biayaKemasan),
      nonNegativeMoney('biayaTenagaKerja', biayaTenagaKerja),
      nonNegativeMoney('overheadTeralokasi', overheadTeralokasi),
    ],
    () => biayaKemasan + biayaTenagaKerja + overheadTeralokasi,
  )
}

/**
 * Total biaya batch = biaya bahan + kemasan + tenaga kerja langsung +
 * overhead produksi teralokasi.
 */
export function totalBiayaBatch(
  bahan: readonly Bahan[],
  biayaKemasan: number,
  biayaTenagaKerja: number,
  overheadTeralokasi: number,
): Result<number> {
  const bahanResult = biayaBahanBatch(bahan)
  const lainResult = totalBiayaLain(
    biayaKemasan,
    biayaTenagaKerja,
    overheadTeralokasi,
  )

  const errors: ValidationError[] = [
    ...(bahanResult.ok ? [] : bahanResult.errors),
    ...(lainResult.ok ? [] : lainResult.errors),
  ]

  return fromErrors(errors, () => {
    const bahanValue = bahanResult.ok ? bahanResult.value : 0
    const lainValue = lainResult.ok ? lainResult.value : 0
    return bahanValue + lainValue
  })
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

export interface HasilSimulasiBahan {
  totalBiayaBatch: number
  hppPerUnit: number
  hargaJualMinimum: number
}

/**
 * Simulasi lengkap perubahan harga bahan: total batch baru, HPP baru, dan
 * harga jual minimum baru pada target margin yang sama.
 */
export function simulasiBahanLengkap(input: {
  biayaBahan: number
  perubahanPersen: number
  biayaLain: number
  unitLayakJual: number
  targetMargin: number
}): Result<HasilSimulasiBahan> {
  const total = simulasiPerubahanBahan(
    input.biayaBahan,
    input.perubahanPersen,
    input.biayaLain,
  )
  if (!total.ok) return fail(total.errors)

  const hpp = hppPerUnit(total.value, input.unitLayakJual)
  if (!hpp.ok) return fail(hpp.errors)

  const hargaMinimum = hargaJualDariMargin(hpp.value, input.targetMargin)
  if (!hargaMinimum.ok) return fail(hargaMinimum.errors)

  return ok({
    totalBiayaBatch: total.value,
    hppPerUnit: hpp.value,
    hargaJualMinimum: hargaMinimum.value,
  })
}

export type StatusMargin = 'sehat' | 'di_bawah_target' | 'rugi'

export interface PenilaianMargin {
  status: StatusMargin
  selisihHargaMinimum: number
}

/**
 * Menilai harga jual terhadap HPP dan harga minimum target margin.
 * - rugi: harga jual di bawah HPP
 * - di_bawah_target: harga jual di bawah harga minimum
 * - sehat: harga jual memenuhi target margin
 */
export function evaluasiMargin(
  hargaJual: number,
  hpp: number,
  hargaMinimum: number,
): Result<PenilaianMargin> {
  return fromErrors(
    [
      positiveValueError('hargaJual', hargaJual),
      nonNegativeMoney('hpp', hpp),
      nonNegativeMoney('hargaMinimum', hargaMinimum),
    ],
    () => {
      const status: StatusMargin =
        hargaJual < hpp
          ? 'rugi'
          : hargaJual < hargaMinimum
            ? 'di_bawah_target'
            : 'sehat'

      return {
        status,
        selisihHargaMinimum: Math.max(0, hargaMinimum - hargaJual),
      }
    },
  )
}

