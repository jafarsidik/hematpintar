import { describe, expect, it } from 'vitest'
import { convertUnit, dimensiSatuan, toBaseUnit } from './unit-conversion'
import { expectErr, expectOk } from './test-helpers'

describe('dimensiSatuan', () => {
  it('mengelompokkan satuan berdasarkan dimensi', () => {
    expect(dimensiSatuan('g')).toBe('massa')
    expect(dimensiSatuan('kg')).toBe('massa')
    expect(dimensiSatuan('ml')).toBe('volume')
    expect(dimensiSatuan('l')).toBe('volume')
    expect(dimensiSatuan('pcs')).toBe('jumlah')
  })
})

describe('convertUnit', () => {
  it('mengonversi kg ke g', () => {
    expect(expectOk(convertUnit(1, 'kg', 'g'))).toBe(1_000)
  })

  it('mengonversi g ke kg', () => {
    expect(expectOk(convertUnit(500, 'g', 'kg'))).toBe(0.5)
  })

  it('mengonversi liter ke mililiter', () => {
    expect(expectOk(convertUnit(1, 'l', 'ml'))).toBe(1_000)
  })

  it('mengonversi pcs ke pcs tanpa perubahan', () => {
    expect(expectOk(convertUnit(2, 'pcs', 'pcs'))).toBe(2)
  })

  it('menerima nilai nol', () => {
    expect(expectOk(convertUnit(0, 'kg', 'g'))).toBe(0)
  })

  it('menolak konversi gram ke mililiter', () => {
    expectErr(convertUnit(1, 'g', 'ml'), 'DIMENSI_TIDAK_COCOK')
  })

  it('menolak konversi antar-dimensi lain', () => {
    expectErr(convertUnit(1, 'pcs', 'kg'), 'DIMENSI_TIDAK_COCOK')
  })

  it('menolak nilai negatif', () => {
    expectErr(convertUnit(-1, 'kg', 'g'), 'NOMINAL_NEGATIF')
  })

  it('menolak NaN dan Infinity', () => {
    expectErr(convertUnit(Number.NaN, 'kg', 'g'), 'BUKAN_ANGKA')
    expectErr(
      convertUnit(Number.POSITIVE_INFINITY, 'kg', 'g'),
      'BUKAN_ANGKA',
    )
  })
})

describe('toBaseUnit', () => {
  it('mengubah kg ke gram', () => {
    expect(expectOk(toBaseUnit(1.5, 'kg'))).toBe(1_500)
  })

  it('mengubah liter ke mililiter', () => {
    expect(expectOk(toBaseUnit(0.25, 'l'))).toBe(250)
  })

  it('mempertahankan pcs', () => {
    expect(expectOk(toBaseUnit(3, 'pcs'))).toBe(3)
  })
})
