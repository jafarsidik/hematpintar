import { fail, ok, type Result } from './result'
import { nonNegativeMoney } from './validation'

export type Satuan = 'g' | 'kg' | 'ml' | 'l' | 'pcs'
export type Dimensi = 'massa' | 'volume' | 'jumlah'

const INFO_SATUAN: Record<Satuan, { dimensi: Dimensi; faktor: number }> = {
  g: { dimensi: 'massa', faktor: 1 },
  kg: { dimensi: 'massa', faktor: 1_000 },
  ml: { dimensi: 'volume', faktor: 1 },
  l: { dimensi: 'volume', faktor: 1_000 },
  pcs: { dimensi: 'jumlah', faktor: 1 },
}

export function dimensiSatuan(satuan: Satuan): Dimensi {
  return INFO_SATUAN[satuan].dimensi
}

export function toBaseUnit(value: number, satuan: Satuan): Result<number> {
  const error = nonNegativeMoney('nilai', value)
  if (error) return fail(error)

  return ok(value * INFO_SATUAN[satuan].faktor)
}

export function convertUnit(
  value: number,
  dari: Satuan,
  ke: Satuan,
): Result<number> {
  const error = nonNegativeMoney('nilai', value)
  if (error) return fail(error)

  const asal = INFO_SATUAN[dari]
  const tujuan = INFO_SATUAN[ke]

  if (asal.dimensi !== tujuan.dimensi) {
    return fail({
      field: 'satuan',
      code: 'DIMENSI_TIDAK_COCOK',
      message: `Tidak dapat mengonversi ${dari} ke ${ke} karena berbeda dimensi. Gunakan satuan dengan dimensi yang sama: g/kg, ml/l, atau pcs.`,
    })
  }

  return ok((value * asal.faktor) / tujuan.faktor)
}
