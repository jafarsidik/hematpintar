import {
  MARKETPLACE_PLATFORMS,
  UNKNOWN_PLATFORM,
  platformLabel,
} from './platforms'

const ALLOWED_PROTOCOLS = ['http:', 'https:']

export interface NormalizeUrlOk {
  url: string
}

export interface NormalizeUrlErr {
  error: string
}

export type NormalizeUrlOutcome = NormalizeUrlOk | NormalizeUrlErr

export interface LinkSource {
  /** URL yang sudah dinormalisasi dan aman ditampilkan. */
  url: string
  /** Platform yang terdeteksi dari hostname; pengguna boleh mengubah manual. */
  platform: string
}

/**
 * Memastikan URL hanya menggunakan http atau https, menolak skema berbahaya
 * seperti javascript: dan data:, memotong spasi, dan menambahkan https://
 * bila pengguna lupa menulis protokol.
 */
export function normalizeUrl(input: string): NormalizeUrlOutcome {
  const trimmed = input.trim()
  if (trimmed.length === 0) {
    return { error: 'URL wajib diisi.' }
  }

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    try {
      url = new URL('https://' + trimmed)
    } catch {
      return {
        error:
          'URL tidak valid; gunakan alamat yang dimulai dengan http:// atau https://.',
      }
    }
  }

  if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
    return {
      error: 'Hanya alamat http:// atau https:// yang diperbolehkan.',
    }
  }

  return { url: url.toString() }
}

/**
 * Mendeteksi platform dari hostname URL lewat tabel konfigurasi domain.
 * Domain yang tidak dikenal dikembalikan sebagai "Lainnya".
 */
export function detectPlatform(url: string): string {
  let hostname: string
  try {
    hostname = new URL(url).hostname
  } catch {
    return UNKNOWN_PLATFORM
  }

  const host = hostname.toLowerCase()
  for (const platform of MARKETPLACE_PLATFORMS) {
    if (
      platform.domains.some(
        (domain) => host === domain || host.endsWith('.' + domain),
      )
    ) {
      return platform.label
    }
  }

  return UNKNOWN_PLATFORM
}

/**
 * Menormalisasi URL dan mendeteksi platform sekaligus. Digunakan saat
 * menambahkan atau memperbarui produk kandidat.
 */
export function normalizeLinkSource(input: string): LinkSource | NormalizeUrlErr {
  const normalized = normalizeUrl(input)
  if ('error' in normalized) return normalized

  return {
    url: normalized.url,
    platform: detectPlatform(normalized.url),
  }
}

export function isValidProductUrl(input: string): boolean {
  return 'error' in normalizeUrl(input) === false
}

export { platformLabel, UNKNOWN_PLATFORM }
