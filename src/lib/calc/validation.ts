import { fail, ok, type Result, type ValidationError } from './result'

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function nonNegativeMoney(
  field: string,
  value: unknown,
): ValidationError | null {
  if (!isFiniteNumber(value)) {
    return {
      field,
      code: 'BUKAN_ANGKA',
      message: `${field} harus berupa angka yang valid; periksa kembali isian Anda.`,
    }
  }
  if (value < 0) {
    return {
      field,
      code: 'NOMINAL_NEGATIF',
      message: `${field} tidak boleh negatif; masukkan angka 0 atau lebih.`,
    }
  }
  return null
}

export function positiveNumber(
  field: string,
  value: unknown,
): ValidationError | null {
  if (!isFiniteNumber(value)) {
    return {
      field,
      code: 'BUKAN_ANGKA',
      message: `${field} harus berupa angka yang valid; periksa kembali isian Anda.`,
    }
  }
  if (value <= 0) {
    return {
      field,
      code: 'NILAI_TIDAK_POSITIF',
      message: `${field} harus lebih besar dari 0.`,
    }
  }
  return null
}

export function positiveQty(
  field: string,
  value: unknown,
): ValidationError | null {
  if (!isFiniteNumber(value)) {
    return {
      field,
      code: 'BUKAN_ANGKA',
      message: `${field} harus berupa angka yang valid; periksa kembali isian Anda.`,
    }
  }
  if (value <= 0) {
    return {
      field,
      code: 'KUANTITAS_TIDAK_POSITIF',
      message: `${field} harus lebih besar dari 0.`,
    }
  }
  return null
}

export interface PercentRangeOptions {
  min?: number
  max?: number
  eksklusifMaks?: boolean
}

export function percentRange(
  field: string,
  value: unknown,
  options: PercentRangeOptions = {},
): ValidationError | null {
  if (!isFiniteNumber(value)) {
    return {
      field,
      code: 'BUKAN_ANGKA',
      message: `${field} harus berupa angka yang valid; periksa kembali isian Anda.`,
    }
  }

  const min = options.min ?? 0
  const max = options.max ?? 1
  const diAtasBatas = options.eksklusifMaks ? value >= max : value > max

  if (value < min || diAtasBatas) {
    const batasAtas = options.eksklusifMaks
      ? `kurang dari ${max * 100}%`
      : `paling besar ${max * 100}%`
    return {
      field,
      code: 'PERSEN_DI_LUAR_RENTANG',
      message: `${field} harus ${min * 100}% atau lebih dan ${batasAtas}.`,
    }
  }

  return null
}

export function targetMargin(
  field: string,
  value: unknown,
): ValidationError | null {
  if (!isFiniteNumber(value)) {
    return {
      field,
      code: 'BUKAN_ANGKA',
      message: `${field} harus berupa angka yang valid; periksa kembali isian Anda.`,
    }
  }
  if (value < 0 || value >= 1) {
    return {
      field,
      code: 'MARGIN_TARGET_TIDAK_VALID',
      message: `${field} harus 0% atau lebih dan kurang dari 100%; masukkan 0,3 untuk 30%.`,
    }
  }
  return null
}

export function nonEmptyText(
  field: string,
  value: unknown,
): ValidationError | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return {
      field,
      code: 'WAJIB_DIISI',
      message: `${field} wajib diisi.`,
    }
  }
  return null
}

export function fromErrors<T>(
  errors: readonly (ValidationError | null)[],
  compute: () => T,
): Result<T> {
  const list = errors.filter(
    (error): error is ValidationError => error !== null,
  )
  return list.length > 0 ? fail(list) : ok(compute())
}
