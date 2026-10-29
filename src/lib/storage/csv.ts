import type { ModuleType, SimulationRecord } from './schemas'
import { simulationSchema } from './schemas'

const BASE_HEADERS = ['ID', 'Nama', 'Dibuat', 'Diperbarui'] as const

const MODULE_HEADERS: Record<ModuleType, readonly string[]> = {
  household: [
    'Anggaran',
    'Jumlah Item',
    'Catatan',
    'Daftar Item',
    'Cek Harga Satuan',
  ],
  margin: [
    'Produk',
    'Batch Yield',
    'Harga Jual',
    'Target Margin',
    'Biaya Kemasan',
    'Tenaga Kerja',
    'Overhead',
    'Jumlah Bahan',
    'Daftar Bahan',
    'Biaya Tetap',
    'Perubahan Bahan',
  ],
  reseller: [
    'Produk',
    'Harga Jual',
    'Diskon',
    'Refund',
    'Biaya Barang',
    'Tarif Platform',
    'Dasar Komisi',
    'Biaya Pembayaran',
    'Kemasan',
    'Subsidi Ongkir',
    'Iklan per Pesanan',
    'Biaya Lain',
    'Volume Pesanan',
  ],
  bundle: [
    'Nama Paket',
    'Harga Paket',
    'Target Margin',
    'Kemasan Tambahan',
    'Biaya Variabel',
    'Jumlah Item',
    'Daftar Item',
  ],
}

function escapeCell(value: string | number): string {
  const text = String(value)
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

function householdCells(payload: {
  budget: number
  items: { nama: string; kuantitas: number; satuan: string; harga: number }[]
  notes: string
  unitPriceCheck?: {
    nama?: string
    hargaKemasan: number
    isiKemasan: number
    satuan: string
  }
}): string[] {
  return [
    String(payload.budget),
    String(payload.items.length),
    payload.notes,
    payload.items
      .map(
        (item) =>
          `${item.nama} ${item.kuantitas} ${item.satuan} @ ${item.harga}`,
      )
      .join('; '),
    payload.unitPriceCheck
      ? `${payload.unitPriceCheck.nama ?? 'Kemasan'} ${payload.unitPriceCheck.hargaKemasan}/${payload.unitPriceCheck.isiKemasan} ${payload.unitPriceCheck.satuan}`
      : '',
  ]
}

function recordToCells(record: SimulationRecord): string[] | null {
  const parsed = simulationSchema.safeParse(record)
  if (!parsed.success) return null

  const data = parsed.data
  const base = [data.id, data.name, data.createdAt, data.updatedAt]

  switch (data.moduleType) {
    case 'household':
      return [...base, ...householdCells(data.payload)]
    case 'margin':
      return [
        ...base,
        data.payload.productName,
        String(data.payload.batchYield),
        String(data.payload.sellingPrice),
        String(data.payload.targetMargin),
        String(data.payload.packagingCost),
        String(data.payload.directLaborCost),
        String(data.payload.allocatedOverhead),
        String(data.payload.ingredients.length),
        data.payload.ingredients
          .map(
            (item) =>
              `${item.nama} ${item.kuantitas} ${item.satuan ?? ''} @ ${item.hargaPerSatuan}`.trim(),
          )
          .join('; '),
        String(data.payload.biayaTetap ?? 0),
        String(data.payload.perubahanHargaBahan ?? 0),
      ]
    case 'reseller':
      return [
        ...base,
        data.payload.productName,
        String(data.payload.sellingPrice),
        String(data.payload.discount),
        String(data.payload.refundAllowance),
        String(data.payload.unitCost),
        String(data.payload.platformFeeRate),
        data.payload.platformFeeBase,
        String(data.payload.paymentFee),
        String(data.payload.packagingCost),
        String(data.payload.sellerShippingSubsidy),
        String(data.payload.adCostPerOrder),
        String(data.payload.otherCosts),
        String(data.payload.orderVolume),
      ]
    case 'bundle':
      return [
        ...base,
        data.payload.bundleName,
        String(data.payload.bundlePrice),
        String(data.payload.targetMargin),
        String(data.payload.extraPackagingCost),
        String(data.payload.extraVariableSellingCost),
        String(data.payload.items.length),
        data.payload.items
          .map(
            (item) =>
              `${item.nama} ${item.kuantitas} @ ${item.hargaNormal} (biaya ${item.biaya})`,
          )
          .join('; '),
      ]
  }
}

export function simulationsToCsv(
  moduleType: ModuleType,
  simulations: readonly SimulationRecord[],
): string {
  const headers = [...BASE_HEADERS, ...MODULE_HEADERS[moduleType]]
  const rows = simulations
    .filter((simulation) => simulation.moduleType === moduleType)
    .map(recordToCells)
    .filter((row): row is string[] => row !== null)

  const lines = [headers, ...rows].map((row) =>
    row.map(escapeCell).join(','),
  )
  return `\uFEFF${lines.join('\n')}`
}
