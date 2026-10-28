import { describe, expect, it } from 'vitest'
import {
  hargaPerSatuanStandar,
  penghematan,
  persenAnggaranTerpakai,
  sisaAnggaran,
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
