import { describe, expect, it } from 'vitest'
import { formatPercent, formatRupiah, parseRupiahInput } from './currency-format'
import { expectErr, expectOk } from './test-helpers'

describe('formatRupiah', () => {
  it('memformat Rupiah dengan pemisah ribuan Indonesia', () => {
    expect(formatRupiah(1_500_000)).toBe('Rp\u00a01.500.000')
  })

  it('memformat nol', () => {
    expect(formatRupiah(0)).toBe('Rp\u00a00')
  })

  it('membulatkan tampilan ke Rupiah penuh', () => {
    expect(formatRupiah(24_750.6)).toBe('Rp\u00a024.751')
  })

  it('mengembalikan teks tidak tersedia untuk nilai non-finite', () => {
    expect(formatRupiah(Number.NaN)).toBe('Tidak tersedia')
    expect(formatRupiah(Number.POSITIVE_INFINITY)).toBe('Tidak tersedia')
  })
})

describe('formatPercent', () => {
  it('memformat pecahan desimal sebagai persen', () => {
    expect(formatPercent(0.3)).toBe('30%')
  })

  it('memakai koma desimal Indonesia', () => {
    expect(formatPercent(0.33333)).toBe('33,33%')
  })

  it('menghormati jumlah desimal yang diminta', () => {
    expect(formatPercent(0.33333, { maximumFractionDigits: 0 })).toBe('33%')
  })

  it('mengembalikan teks tidak tersedia untuk nilai non-finite', () => {
    expect(formatPercent(Number.NaN)).toBe('Tidak tersedia')
  })
})

describe('parseRupiahInput', () => {
  it.each([
    ['1.500.000', 1_500_000],
    ['1500000', 1_500_000],
    ['Rp 1.500.000', 1_500_000],
    ['Rp1.500.000', 1_500_000],
    ['rp 0', 0],
    [' 1.000 ', 1_000],
    ['0', 0],
  ])('menerima %s', (input, expected) => {
    expect(expectOk(parseRupiahInput(input))).toBe(expected)
  })

  it.each([[''], ['   '], ['Rp']])('menolak input kosong %s', (input) => {
    expectErr(parseRupiahInput(input), 'INPUT_KOSONG')
  })

  it.each([
    ['1,5'],
    ['1.500,00'],
    ['1 500'],
    ['abc'],
    ['1.50.0'],
    ['1.5000'],
    ['001.500'],
    ['1e6'],
  ])('menolak format ambigu %s', (input) => {
    expectErr(parseRupiahInput(input), 'FORMAT_TIDAK_DIKENAL')
  })

  it('menolak nominal negatif', () => {
    expectErr(parseRupiahInput('-1.000'), 'NOMINAL_NEGATIF')
  })

  it('menolak nominal di atas batas aman', () => {
    expectErr(parseRupiahInput('999999999999999999999'), 'NILAI_TERLALU_BESAR')
  })
})
