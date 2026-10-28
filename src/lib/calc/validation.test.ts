import { describe, expect, it } from 'vitest'
import {
  fromErrors,
  isFiniteNumber,
  nonNegativeMoney,
  nonEmptyText,
  percentRange,
  positiveNumber,
  positiveQty,
  targetMargin,
} from './validation'

describe('isFiniteNumber', () => {
  it('menerima angka finite', () => {
    expect(isFiniteNumber(0)).toBe(true)
    expect(isFiniteNumber(-1.5)).toBe(true)
  })

  it('menolak NaN, Infinity, dan non-number', () => {
    expect(isFiniteNumber(Number.NaN)).toBe(false)
    expect(isFiniteNumber(Number.POSITIVE_INFINITY)).toBe(false)
    expect(isFiniteNumber('10')).toBe(false)
    expect(isFiniteNumber(undefined)).toBe(false)
  })
})

describe('nonNegativeMoney', () => {
  it('menerima nol dan angka positif', () => {
    expect(nonNegativeMoney('harga', 0)).toBeNull()
    expect(nonNegativeMoney('harga', 15_000)).toBeNull()
  })

  it('menolak angka negatif', () => {
    expect(nonNegativeMoney('harga', -1)?.code).toBe('NOMINAL_NEGATIF')
  })

  it('menolak NaN dan Infinity', () => {
    expect(nonNegativeMoney('harga', Number.NaN)?.code).toBe('BUKAN_ANGKA')
    expect(nonNegativeMoney('harga', Number.POSITIVE_INFINITY)?.code).toBe(
      'BUKAN_ANGKA',
    )
  })
})

describe('positiveNumber', () => {
  it('menerima angka lebih besar dari nol', () => {
    expect(positiveNumber('hargaJual', 0.01)).toBeNull()
  })

  it('menolak nol dan negatif', () => {
    expect(positiveNumber('hargaJual', 0)?.code).toBe('NILAI_TIDAK_POSITIF')
    expect(positiveNumber('hargaJual', -2)?.code).toBe('NILAI_TIDAK_POSITIF')
  })

  it('menolak NaN', () => {
    expect(positiveNumber('hargaJual', Number.NaN)?.code).toBe('BUKAN_ANGKA')
  })
})

describe('positiveQty', () => {
  it('menerima kuantitas positif', () => {
    expect(positiveQty('jumlah', 1)).toBeNull()
    expect(positiveQty('jumlah', 0.5)).toBeNull()
  })

  it('menolak nol', () => {
    expect(positiveQty('jumlah', 0)?.code).toBe('KUANTITAS_TIDAK_POSITIF')
  })

  it('menolak Infinity', () => {
    expect(positiveQty('jumlah', Number.POSITIVE_INFINITY)?.code).toBe(
      'BUKAN_ANGKA',
    )
  })
})

describe('percentRange', () => {
  it('menerima batas inklusif secara default', () => {
    expect(percentRange('tarif', 0)).toBeNull()
    expect(percentRange('tarif', 1)).toBeNull()
  })

  it('menolak di luar 0 sampai 1', () => {
    expect(percentRange('tarif', -0.1)?.code).toBe('PERSEN_DI_LUAR_RENTANG')
    expect(percentRange('tarif', 1.1)?.code).toBe('PERSEN_DI_LUAR_RENTANG')
  })

  it('mendukung batas atas eksklusif', () => {
    expect(percentRange('tarif', 1, { eksklusifMaks: true })?.code).toBe(
      'PERSEN_DI_LUAR_RENTANG',
    )
  })
})

describe('targetMargin', () => {
  it('menerima 0 sampai kurang dari 1', () => {
    expect(targetMargin('targetMargin', 0)).toBeNull()
    expect(targetMargin('targetMargin', 0.3)).toBeNull()
    expect(targetMargin('targetMargin', 0.999)).toBeNull()
  })

  it('menolak 1 dan lebih', () => {
    expect(targetMargin('targetMargin', 1)?.code).toBe(
      'MARGIN_TARGET_TIDAK_VALID',
    )
    expect(targetMargin('targetMargin', 1.2)?.code).toBe(
      'MARGIN_TARGET_TIDAK_VALID',
    )
  })

  it('menolak negatif dan NaN', () => {
    expect(targetMargin('targetMargin', -0.1)?.code).toBe(
      'MARGIN_TARGET_TIDAK_VALID',
    )
    expect(targetMargin('targetMargin', Number.NaN)?.code).toBe('BUKAN_ANGKA')
  })
})

describe('nonEmptyText', () => {
  it('menolak string kosong dan spasi', () => {
    expect(nonEmptyText('nama', '')?.code).toBe('WAJIB_DIISI')
    expect(nonEmptyText('nama', '   ')?.code).toBe('WAJIB_DIISI')
  })

  it('menerima teks berisi', () => {
    expect(nonEmptyText('nama', 'Produk A')).toBeNull()
  })
})

describe('fromErrors', () => {
  it('mengembalikan nilai bila tidak ada error', () => {
    expect(fromErrors([null, null], () => 10)).toEqual({ ok: true, value: 10 })
  })

  it('mengumpulkan seluruh error dan tidak menghitung nilai', () => {
    const error = { field: 'x', code: 'X', message: 'Perbaiki x.' }
    let computed = false
    const result = fromErrors([error, null], () => {
      computed = true
      return 1
    })

    expect(result).toEqual({ ok: false, errors: [error] })
    expect(computed).toBe(false)
  })
})
