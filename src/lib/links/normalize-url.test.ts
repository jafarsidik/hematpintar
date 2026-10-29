import { describe, expect, it } from 'vitest'
import {
  detectPlatform,
  isValidProductUrl,
  normalizeLinkSource,
  normalizeUrl,
} from './normalize-url'

describe('normalizeUrl', () => {
  it('menerima URL https apa adanya', () => {
    expect(normalizeUrl('https://shopee.co.id/product/123')).toEqual({
      url: 'https://shopee.co.id/product/123',
    })
  })

  it('menerima URL http', () => {
    expect(normalizeUrl('http://tokopedia.com/x')).toEqual({
      url: 'http://tokopedia.com/x',
    })
  })

  it('menambahkan https:// bila protokol tidak ditulis', () => {
    expect(normalizeUrl('shopee.co.id/product')).toEqual({
      url: 'https://shopee.co.id/product',
    })
  })

  it('memotong spasi di awal dan akhir', () => {
    expect(normalizeUrl('  https://blibli.com/x  ')).toEqual({
      url: 'https://blibli.com/x',
    })
  })

  it('menolak javascript:', () => {
    expect(normalizeUrl('javascript:alert(1)')).toEqual({
      error: 'Hanya alamat http:// atau https:// yang diperbolehkan.',
    })
  })

  it('menolak data:', () => {
    expect(normalizeUrl('data:text/html,<script>alert(1)</script>')).toEqual({
      error: 'Hanya alamat http:// atau https:// yang diperbolehkan.',
    })
  })

  it('menolak skema lain', () => {
    expect(normalizeUrl('ftp://files.example.com/x')).toEqual({
      error: 'Hanya alamat http:// atau https:// yang diperbolehkan.',
    })
  })

  it('menolak input kosong', () => {
    expect(normalizeUrl('')).toEqual({ error: 'URL wajib diisi.' })
    expect(normalizeUrl('   ')).toEqual({ error: 'URL wajib diisi.' })
  })

  it('mengubah teks tanpa protokol menjadi https://', () => {
    expect(normalizeUrl('bukan-url')).toEqual({
      url: 'https://bukan-url/',
    })
  })
})

describe('detectPlatform', () => {
  it('mendeteksi Shopee dari domain utama', () => {
    expect(detectPlatform('https://shopee.co.id/x')).toBe('Shopee')
  })

  it('mendeteksi Shopee dari domain link pendek', () => {
    expect(detectPlatform('https://shope.ee/x')).toBe('Shopee')
  })

  it('mendeteksi Tokopedia', () => {
    expect(detectPlatform('https://tokopedia.com/x')).toBe('Tokopedia')
  })

  it('mendeteksi TikTok Shop', () => {
    expect(detectPlatform('https://www.tiktok.com/x')).toBe('TikTok Shop')
    expect(detectPlatform('https://vm.tiktok.com/x')).toBe('TikTok Shop')
  })

  it('mendeteksi Lazada dan link pendeknya', () => {
    expect(detectPlatform('https://lazada.co.id/x')).toBe('Lazada')
    expect(detectPlatform('https://laz.click/x')).toBe('Lazada')
  })

  it('mendeteksi Blibli dan Bukalapak', () => {
    expect(detectPlatform('https://blibli.com/x')).toBe('Blibli')
    expect(detectPlatform('https://bukalapak.com/x')).toBe('Bukalapak')
  })

  it('mengembalikan Lainnya untuk domain tidak dikenal', () => {
    expect(detectPlatform('https://example.com/x')).toBe('Lainnya')
    expect(detectPlatform('https://notamarketplace.id/x')).toBe('Lainnya')
  })
})

describe('normalizeLinkSource', () => {
  it('mengembalikan URL dan platform terdeteksi', () => {
    const result = normalizeLinkSource('shopee.co.id/produk')
    if ('error' in result) throw new Error(result.error)
    expect(result.url).toBe('https://shopee.co.id/produk')
    expect(result.platform).toBe('Shopee')
  })

  it('mengembalikan error untuk URL berbahaya', () => {
    const result = normalizeLinkSource('javascript:alert(1)')
    expect('error' in result).toBe(true)
    if ('error' in result) expect(result.error).toContain('http')
  })
})

describe('isValidProductUrl', () => {
  it('menerima http dan https', () => {
    expect(isValidProductUrl('https://tokopedia.com/x')).toBe(true)
    expect(isValidProductUrl('http://tokopedia.com/x')).toBe(true)
  })

  it('menolak javascript, data, dan input tidak valid', () => {
    expect(isValidProductUrl('javascript:alert(1)')).toBe(false)
    expect(isValidProductUrl('data:text/html,x')).toBe(false)
    expect(isValidProductUrl('')).toBe(false)
  })
})
