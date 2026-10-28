import type { z } from 'zod'
import type { ValidationError } from '@/lib/calc/result'

export type StorageOperation = 'baca' | 'simpan' | 'hapus'

const MESSAGES: Record<StorageOperation, string> = {
  baca: 'Data gagal dibaca dari penyimpanan perangkat. Coba muat ulang halaman.',
  simpan:
    'Data gagal disimpan ke perangkat. Data lama tidak diubah; silakan coba lagi.',
  hapus: 'Data gagal dihapus dari perangkat. Silakan coba lagi.',
}

export function storageError(operation: StorageOperation): ValidationError {
  return {
    field: 'storage',
    code: 'PENYIMPANAN_GAGAL',
    message: MESSAGES[operation],
  }
}

export function zodValidationErrors<T>(
  error: z.ZodError<T>,
  code = 'VALIDASI_GAGAL',
): ValidationError[] {
  return error.issues.map((issue) => ({
    field:
      issue.path.length > 0
        ? issue.path.map((segment) => String(segment)).join('.')
        : 'data',
    code,
    message: issue.message,
  }))
}

export function errorMessage(errors: readonly ValidationError[]): string {
  return errors.map((error) => error.message).join(' ')
}
