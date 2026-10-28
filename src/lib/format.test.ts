import { describe, expect, it } from 'vitest'
import { formatRupiah } from './format'

describe('formatRupiah', () => {
  it('formats a whole amount with Indonesian thousands separators', () => {
    expect(formatRupiah(1_500_000)).toBe('Rp\u00a01.500.000')
  })

  it('formats zero', () => {
    expect(formatRupiah(0)).toBe('Rp\u00a00')
  })

  it('rounds to whole rupiah', () => {
    expect(formatRupiah(24_750.6)).toBe('Rp\u00a024.751')
  })
})
