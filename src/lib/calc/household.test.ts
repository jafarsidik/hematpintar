import { describe, expect, it } from 'vitest'
import {
  BATAS_MENDEKATI_ANGGARAN,
  hargaPerSatuanStandar,
  hargaPerSatuanStandarDetail,
  penghematan,
  persenAnggaranTerpakai,
  satuanStandar,
  sisaAnggaran,
  statusAnggaran,
  totalBelanja,
} from './household'
import { expectErr, expectOk } from './test-helpers'

describe('totalBelanja', () => {
  it('menjumlahkan jumlah dikali harga satuan', () => {
    const result = totalBelanja([
      { jumlah: 2, hargaSatuan: 15_000 },
      { jumlah: 3, hargaSatuan: 4_000 },
    ])
    expect(expectOk(result)).toBe(42_000)
  })

  it('mengembalikan nol untuk daftar kosong', () => {
    expect(expectOk(totalBelanja([]))).toBe(0)
  })

  it('menerima kuantitas pecahan', () => {
    expect(expectOk(totalBelanja([{ jumlah: 0.5, hargaSatuan: 20_000 }]))).toBe(
      10_000,
    )
  })

  it('menolak kuantitas nol', () => {
    expectErr(totalBelanja([{ jumlah: 0, hargaSatuan: 1_000 }]), 'KUANTITAS_TIDAK_POSITIF')
  })

  it('menolak harga satuan negatif', () => {
    expectErr(totalBelanja([{ jumlah: 1, hargaSatuan: -1 }]), 'NOMINAL_NEGATIF')
  })

  it('menolak NaN', () => {
    expectErr(
      totalBelanja([{ jumlah: Number.NaN, hargaSatuan: 1_000 }]),
      'BUKAN_ANGKA',
    )
  })

  it('mengumpulkan error dari beberapa item', () => {
    const result = totalBelanja([
      { jumlah: 0, hargaSatuan: 1_000 },
      { jumlah: 1, hargaSatuan: -1 },
    ])
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors).toHaveLength(2)
  })
})

describe('sisaAnggaran', () => {
  it('menghitung anggaran dikurangi total', () => {
    expect(expectOk(sisaAnggaran(100_000, 75_000))).toBe(25_000)
  })

  it('mengembalikan nilai negatif saat melebihi anggaran', () => {
    expect(expectOk(sisaAnggaran(100_000, 120_000))).toBe(-20_000)
  })

  it('menerima anggaran nol', () => {
    expect(expectOk(sisaAnggaran(0, 0))).toBe(0)
  })

  it('menolak anggaran negatif', () => {
    expectErr(sisaAnggaran(-1, 0), 'NOMINAL_NEGATIF')
  })

  it('menolak total belanja negatif', () => {
    expectErr(sisaAnggaran(100_000, -1), 'NOMINAL_NEGATIF')
  })

  it('menolak Infinity', () => {
    expectErr(sisaAnggaran(Number.POSITIVE_INFINITY, 0), 'BUKAN_ANGKA')
  })
})

describe('persenAnggaranTerpakai', () => {
  it('menghitung proporsi anggaran terpakai', () => {
    expect(expectOk(persenAnggaranTerpakai(100_000, 75_000))).toBe(0.75)
  })

  it('bisa melebihi 100 persen', () => {
    expect(expectOk(persenAnggaranTerpakai(100_000, 120_000))).toBe(1.2)
  })

  it('mengembalikan null saat anggaran nol', () => {
    expect(expectOk(persenAnggaranTerpakai(0, 50_000))).toBeNull()
  })

  it('menolak anggaran negatif', () => {
    expectErr(persenAnggaranTerpakai(-1, 10), 'NOMINAL_NEGATIF')
  })

  it('menolak total negatif', () => {
    expectErr(persenAnggaranTerpakai(10, -1), 'NOMINAL_NEGATIF')
  })
})

describe('hargaPerSatuanStandar', () => {
  it('menghitung harga per gram dari harga kemasan', () => {
    expect(expectOk(hargaPerSatuanStandar(18_000, 750))).toBe(24)
  })

  it('menghitung harga per unit isi', () => {
    expect(expectOk(hargaPerSatuanStandar(18_000, 1_000))).toBe(18)
  })

  it('menerima harga kemasan nol', () => {
    expect(expectOk(hargaPerSatuanStandar(0, 500))).toBe(0)
  })

  it('menolak isi kemasan nol', () => {
    expectErr(hargaPerSatuanStandar(18_000, 0), 'KUANTITAS_TIDAK_POSITIF')
  })

  it('menolak harga kemasan negatif', () => {
    expectErr(hargaPerSatuanStandar(-1, 500), 'NOMINAL_NEGATIF')
  })

  it('menolak isi kemasan negatif', () => {
    expectErr(hargaPerSatuanStandar(18_000, -500), 'KUANTITAS_TIDAK_POSITIF')
  })
})

describe('penghematan', () => {
  it('positif berarti alternatif lebih murah', () => {
    expect(expectOk(penghematan(100_000, 85_000))).toBe(15_000)
  })

  it('negatif berarti alternatif lebih mahal', () => {
    expect(expectOk(penghematan(100_000, 105_000))).toBe(-5_000)
  })

  it('nol berarti sama', () => {
    expect(expectOk(penghematan(100_000, 100_000))).toBe(0)
  })

  it('menolak nilai baseline negatif', () => {
    expectErr(penghematan(-1, 0), 'NOMINAL_NEGATIF')
  })

  it('menolak nilai alternatif negatif', () => {
    expectErr(penghematan(0, -1), 'NOMINAL_NEGATIF')
  })
})

describe('satuanStandar', () => {
  it('memetakan satuan massa ke kg', () => {
    expect(satuanStandar('g')).toBe('kg')
    expect(satuanStandar('kg')).toBe('kg')
  })

  it('memetakan satuan volume ke l', () => {
    expect(satuanStandar('ml')).toBe('l')
    expect(satuanStandar('l')).toBe('l')
  })

  it('mempertahankan satuan jumlah', () => {
    expect(satuanStandar('pcs')).toBe('pcs')
  })
})

describe('hargaPerSatuanStandarDetail', () => {
  it('menghitung contoh PRD: Rp18.000 untuk 750 g menjadi Rp24.000/kg', () => {
    const detail = expectOk(hargaPerSatuanStandarDetail(18_000, 750, 'g'))
    expect(detail).toEqual({
      harga: 24_000,
      satuan: 'kg',
      isiStandar: 0.75,
    })
  })

  it('menerima isi kemasan yang sudah dalam kg', () => {
    const detail = expectOk(hargaPerSatuanStandarDetail(18_000, 0.75, 'kg'))
    expect(detail).toEqual({
      harga: 24_000,
      satuan: 'kg',
      isiStandar: 0.75,
    })
  })

  it('menghitung harga per liter dari mililiter', () => {
    const detail = expectOk(hargaPerSatuanStandarDetail(18_000, 1_500, 'ml'))
    expect(detail.harga).toBe(12_000)
    expect(detail.satuan).toBe('l')
    expect(detail.isiStandar).toBe(1.5)
  })

  it('menghitung harga per pcs', () => {
    const detail = expectOk(hargaPerSatuanStandarDetail(10_000, 2, 'pcs'))
    expect(detail).toEqual({
      harga: 5_000,
      satuan: 'pcs',
      isiStandar: 2,
    })
  })

  it('menolak isi kemasan nol', () => {
    expectErr(
      hargaPerSatuanStandarDetail(18_000, 0, 'kg'),
      'KUANTITAS_TIDAK_POSITIF',
    )
  })

  it('menolak harga kemasan negatif', () => {
    expectErr(
      hargaPerSatuanStandarDetail(-1, 1, 'kg'),
      'NOMINAL_NEGATIF',
    )
  })
})

describe('statusAnggaran', () => {
  it('dalam anggaran saat pemakaian di bawah 90%', () => {
    expect(expectOk(statusAnggaran(200_000, 134_000))).toBe('dalam_anggaran')
  })

  it('mendekati batas saat pemakaian tepat 90%', () => {
    expect(expectOk(statusAnggaran(100_000, 90_000))).toBe('mendekati_batas')
  })

  it('mendekati batas saat pemakaian 100% tetapi belum melebihi', () => {
    expect(expectOk(statusAnggaran(100_000, 100_000))).toBe(
      'mendekati_batas',
    )
  })

  it('melebihi anggaran saat total lebih besar dari anggaran', () => {
    expect(expectOk(statusAnggaran(100_000, 100_001))).toBe(
      'melebihi_anggaran',
    )
  })

  it('melebihi anggaran saat anggaran nol dan ada belanja', () => {
    expect(expectOk(statusAnggaran(0, 1))).toBe('melebihi_anggaran')
  })

  it('dalam anggaran saat anggaran dan total sama-sama nol', () => {
    expect(expectOk(statusAnggaran(0, 0))).toBe('dalam_anggaran')
  })

  it('memakai ambang 90%', () => {
    expect(BATAS_MENDEKATI_ANGGARAN).toBe(0.9)
  })

  it('menolak anggaran negatif', () => {
    expectErr(statusAnggaran(-1, 0), 'NOMINAL_NEGATIF')
  })

  it('menolak total negatif', () => {
    expectErr(statusAnggaran(0, -1), 'NOMINAL_NEGATIF')
  })

  it('menolak Infinity', () => {
    expectErr(
      statusAnggaran(Number.POSITIVE_INFINITY, 0),
      'BUKAN_ANGKA',
    )
  })
})

describe('contoh Hemat Rumah Tangga', () => {
  it('menghasilkan angka acuan PRD 5.2', () => {
    const budget = 200_000
    const items = [
      { jumlah: 5, hargaSatuan: 12_000 },
      { jumlah: 2, hargaSatuan: 17_000 },
      { jumlah: 1, hargaSatuan: 30_000 },
      { jumlah: 2, hargaSatuan: 5_000 },
    ]
    const baselineItems = [
      { jumlah: 5, hargaSatuan: 13_000 },
      { jumlah: 2, hargaSatuan: 18_000 },
      { jumlah: 1, hargaSatuan: 32_000 },
      { jumlah: 2, hargaSatuan: 5_000 },
    ]

    const total = expectOk(totalBelanja(items))
    const baseline = expectOk(totalBelanja(baselineItems))
    const alternative = expectOk(totalBelanja(items))

    expect(total).toBe(134_000)
    expect(expectOk(sisaAnggaran(budget, total))).toBe(66_000)
    expect(expectOk(persenAnggaranTerpakai(budget, total))).toBe(0.67)
    expect(baseline).toBe(143_000)
    expect(alternative).toBe(134_000)
    expect(expectOk(penghematan(baseline, alternative))).toBe(9_000)
    expect(expectOk(statusAnggaran(budget, total))).toBe('dalam_anggaran')

    const unit = expectOk(
      hargaPerSatuanStandarDetail(18_000, 0.75, 'kg'),
    )
    expect(unit.harga).toBe(24_000)
    expect(unit.satuan).toBe('kg')
  })
})
