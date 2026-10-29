import { PLANS, type Plan } from '@/config/plans'
import { formatRupiah } from '@/lib/calc/currency-format'

/**
 * Menerima nomor Indonesia dengan spasi, tanda hubung, atau awalan +62/0.
 * Mengembalikan digit format internasional, atau null bila tidak valid.
 */
export function normalizeWhatsAppNumber(
  input: string | null | undefined,
): string | null {
  const raw = typeof input === 'string' ? input.trim() : ''
  if (raw === '') return null

  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('0')) {
    digits = `62${digits.slice(1)}`
  } else if (digits.startsWith('8')) {
    digits = `62${digits}`
  }

  return digits.length >= 8 ? digits : null
}

export function buildWhatsAppMessage(plan: Plan, username: string): string {
  const config = PLANS[plan]
  const accountUsername =
    username.trim() === '' ? '(belum login)' : username.trim()

  return [
    'Halo HematPintar,',
    `Saya ingin membeli paket ${config.name} (${formatRupiah(config.price)}).`,
    `Username akun: ${accountUsername}`,
    'Mohon dibantu proses pembelian dan aktivasi manualnya.',
  ].join('\n')
}

export function buildWhatsAppUrl(
  number: string | null | undefined,
  message: string,
): string | null {
  const normalized = normalizeWhatsAppNumber(number)
  if (!normalized) return null

  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`
}

export interface BelanjaItemRingkasan {
  needName: string
  productTitle: string
  platform: string
  hargaEfektif: number
}

/**
 * Membuat pesan WhatsApp untuk daftar belanja yang dipilih.
 * Tidak ada scraping dan tidak ada nomor telepon yang disimpan server.
 */
export function buildWhatsAppBelanjaMessage(
  items: readonly BelanjaItemRingkasan[],
  total: number,
): string {
  const lines = [
    'Halo HematPintar,',
    'Saya ingin membeli belanja berikut:',
    '',
  ]

  for (const item of items) {
    lines.push(
      '*'
        .concat(item.productTitle, '* (')
        .concat(item.platform, ') - ')
        .concat(formatRupiah(item.hargaEfektif)),
    )
  }

  lines.push('', `Total: ${formatRupiah(total)}`, 'Mohon dibantu.')

  return lines.join('\n')
}
