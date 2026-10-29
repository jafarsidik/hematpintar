/**
 * Konfigurasi domain marketplace yang dikenal. Digunakan hanya untuk
 * mendeteksi platform dari hostname URL; tidak ada permintaan jaringan ke
 * domain ini dari browser atau server.
 */
export interface MarketplacePlatform {
  key: string
  label: string
  domains: string[]
}

export const MARKETPLACE_PLATFORMS: readonly MarketplacePlatform[] = [
  {
    key: 'shopee',
    label: 'Shopee',
    domains: [
      'shopee.co.id', 'shopee.com', 'shopee.sg', 'shopee.com.my',
      'shopee.ph', 'shopee.vn', 'shopee.tw', 'shopee.co.th', 'shopee.id',
      'shope.ee',
    ],
  },
  {
    key: 'tokopedia',
    label: 'Tokopedia',
    domains: ['tokopedia.com', 'www.tokopedia.com'],
  },
  {
    key: 'tiktok_shop',
    label: 'TikTok Shop',
    domains: [
      'tiktok.com', 'www.tiktok.com', 'tiktokshop.com', 'www.tiktokshop.com',
      'vm.tiktok.com', 'vt.tiktok.com',
    ],
  },
  {
    key: 'lazada',
    label: 'Lazada',
    domains: [
      'lazada.co.id', 'lazada.com', 'lazada.sg', 'lazada.com.my',
      'lazada.ph', 'lazada.vn', 'lazada.co.th', 'laz.click', 'lzd.co',
    ],
  },
  {
    key: 'blibli',
    label: 'Blibli',
    domains: ['blibli.com', 'www.blibli.com'],
  },
  {
    key: 'bukalapak',
    label: 'Bukalapak',
    domains: ['bukalapak.com', 'www.bukalapak.com'],
  },
]

export const UNKNOWN_PLATFORM = 'Lainnya'

export function platformLabel(key: string): string {
  const found = MARKETPLACE_PLATFORMS.find((platform) => platform.key === key)
  return found ? found.label : UNKNOWN_PLATFORM
}

export function platformKeyByLabel(label: string): string {
  const found = MARKETPLACE_PLATFORMS.find((platform) => platform.label === label)
  return found ? found.key : ''
}

export function isKnownDomain(hostname: string): boolean {
  const host = hostname.toLowerCase()
  return MARKETPLACE_PLATFORMS.some((platform) =>
    platform.domains.some(
      (domain) => host === domain || host.endsWith('.' + domain),
    ),
  )
}
