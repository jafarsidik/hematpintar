import { describe, expect, it } from 'vitest'
import {
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  normalizeWhatsAppNumber,
} from './whatsapp'

describe('nomor WhatsApp', () => {
  it('menormalkan nomor Indonesia ke format internasional', () => {
    expect(normalizeWhatsAppNumber('0812-3456-7890')).toBe('6281234567890')
    expect(normalizeWhatsAppNumber('+62 812 3456 7890')).toBe('6281234567890')
    expect(normalizeWhatsAppNumber('81234567890')).toBe('6281234567890')
  })

  it('menolak nomor kosong atau terlalu pendek', () => {
    expect(normalizeWhatsAppNumber('')).toBeNull()
    expect(normalizeWhatsAppNumber(undefined)).toBeNull()
    expect(normalizeWhatsAppNumber('12345')).toBeNull()
  })
})

describe('pesan pembelian manual', () => {
  it('memuat paket dan email akun pengguna', () => {
    const message = buildWhatsAppMessage('plus', 'nama@email.com')

    expect(message).toContain('paket Plus')
    expect(message).toContain('39.000')
    expect(message).toContain('Email akun: nama@email.com')
    expect(message).not.toContain('pembayaran berhasil')
  })

  it('memuat paket Bisnis yang dipilih', () => {
    const message = buildWhatsAppMessage('business', 'usaha@email.com')

    expect(message).toContain('paket Bisnis')
    expect(message).toContain('99.000')
    expect(message).toContain('Email akun: usaha@email.com')
  })

  it('membuat tautan wa.me dengan pesan ter-encode', () => {
    const url = buildWhatsAppUrl(
      '0812-3456-7890',
      buildWhatsAppMessage('plus', 'nama@email.com'),
    )

    expect(url).not.toBeNull()
    expect(url).toContain('https://wa.me/6281234567890?text=')
    expect(url).toContain('Plus')
    expect(url).toContain('nama%40email.com')
    expect(url).not.toContain('\n')
  })

  it('tidak membuat tautan bila nomor belum dikonfigurasi', () => {
    expect(buildWhatsAppUrl('', 'Halo')).toBeNull()
  })
})
