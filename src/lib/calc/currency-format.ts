import { fail, ok, type Result } from './result'
import { isFiniteNumber } from './validation'

const rupiahFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

export function formatRupiah(value: number): string {
  if (!isFiniteNumber(value)) return 'Tidak tersedia'
  return rupiahFormatter.format(value)
}

export function formatPercent(
  value: number,
  options: { maximumFractionDigits?: number } = {},
): string {
  if (!isFiniteNumber(value)) return 'Tidak tersedia'

  const formatter = new Intl.NumberFormat('id-ID', {
    style: 'percent',
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
  })
  return formatter.format(value)
}

/**
 * Menerima format Rupiah Indonesia tanpa desimal:
 * "1.500.000", "1500000", "Rp 1.500.000".
 * Format ambigu (koma desimal, pemisah tidak beraturan, nol di depan) ditolak.
 */
export function parseRupiahInput(input: string): Result<number> {
  const asli = input.trim()
  if (asli.length === 0) {
    return inputKosong()
  }

  let teks = asli.replace(/^rp\s*/i, '').trim()
  if (teks.length === 0) {
    return inputKosong()
  }

  if (teks.startsWith('-')) {
    return fail({
      field: 'nominal',
      code: 'NOMINAL_NEGATIF',
      message: 'Nominal tidak boleh negatif; masukkan angka 0 atau lebih.',
    })
  }

  if (teks.includes(',')) {
    return formatTidakDikenal()
  }

  const digitSaja = /^\d+$/.test(teks)
  const berkelompok = /^\d{1,3}(?:\.\d{3})+$/.test(teks)
  if (!digitSaja && !berkelompok) {
    return formatTidakDikenal()
  }

  const digit = teks.replace(/\./g, '')
  if (digit.length > 1 && digit.startsWith('0')) {
    return formatTidakDikenal()
  }

  const nilai = Number(digit)
  if (!Number.isSafeInteger(nilai)) {
    return fail({
      field: 'nominal',
      code: 'NILAI_TERLALU_BESAR',
      message: 'Nominal terlalu besar; masukkan angka Rupiah yang lebih kecil.',
    })
  }

  return ok(nilai)
}

function inputKosong(): Result<number> {
  return fail({
    field: 'nominal',
    code: 'INPUT_KOSONG',
    message: 'Nominal wajib diisi; masukkan angka seperti 1.500.000.',
  })
}

function formatTidakDikenal(): Result<number> {
  return fail({
    field: 'nominal',
    code: 'FORMAT_TIDAK_DIKENAL',
    message:
      'Format nominal tidak dikenali; gunakan angka tanpa desimal seperti 1.500.000.',
  })
}
