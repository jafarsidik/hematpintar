import { describe, expect, it } from 'vitest'
import type { SimulationRecord } from './schemas'
import { simulationsToCsv } from './csv'

const UUID = '11111111-1111-4111-8111-111111111111'

function householdRecord(): SimulationRecord {
  return {
    id: UUID,
    moduleType: 'household',
    name: 'Belanja, "Rumah"',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    schemaVersion: 1,
    payload: {
      budget: 500_000,
      items: [
        {
          nama: 'Beras',
          kuantitas: 5,
          satuan: 'kg',
          harga: 15_000,
        },
      ],
      baselineItems: [],
      alternativeItems: [],
      notes: 'baris satu\nbaris dua',
    },
  }
}

const marginRecord: SimulationRecord = {
  id: '22222222-2222-4222-8222-222222222222',
  moduleType: 'margin',
  name: 'HPP Kue',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  schemaVersion: 1,
  payload: {
    productName: 'Kue Lapis',
    batchYield: 20,
    ingredients: [{ nama: 'Tepung', kuantitas: 1, hargaPerSatuan: 12_000 }],
    packagingCost: 5_000,
    directLaborCost: 20_000,
    allocatedOverhead: 10_000,
    sellingPrice: 10_000,
    targetMargin: 0.3,
  },
}

describe('simulationsToCsv', () => {
  it('menambahkan BOM dan header khusus modul household', () => {
    const csv = simulationsToCsv('household', [householdRecord()])
    expect(csv.startsWith('\uFEFF')).toBe(true)

    const [header] = csv.replace('\uFEFF', '').split('\n')
    expect(header).toContain('Anggaran')
    expect(header).toContain('Daftar Item')
  })

  it('meng-escape koma, tanda kutip, dan baris baru', () => {
    const csv = simulationsToCsv('household', [householdRecord()])

    expect(csv).toContain('"Belanja, ""Rumah"""')
    expect(csv).toContain('"baris satu\nbaris dua"')
  })

  it('mengisi nilai payload household', () => {
    const csv = simulationsToCsv('household', [householdRecord()])
    expect(csv).toContain('500000')
    expect(csv).toContain('Beras 5 kg @ 15000')
  })

  it('memakai header margin untuk modul margin', () => {
    const csv = simulationsToCsv('margin', [marginRecord])
    expect(csv).toContain('Target Margin')
    expect(csv).toContain('Kue Lapis')
    expect(csv).toContain('0.3')
  })

  it('memakai header reseller dan bundle', () => {
    const reseller = simulationsToCsv('reseller', [])
    expect(reseller).toContain('Tarif Platform')
    expect(reseller).toContain('Dasar Komisi')

    const bundle = simulationsToCsv('bundle', [])
    expect(bundle).toContain('Nama Paket')
    expect(bundle).toContain('Harga Paket')
  })

  it('hanya mengekspor simulasi dengan moduleType yang diminta', () => {
    const csv = simulationsToCsv('household', [marginRecord])
    const lines = csv.replace('\uFEFF', '').split('\n').filter(Boolean)
    expect(lines).toHaveLength(1)
  })
})
