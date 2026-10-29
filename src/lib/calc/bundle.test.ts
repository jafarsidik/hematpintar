import { describe, expect, it } from 'vitest'
import {
  biayaPaket,
  diskonMaksimum,
  diskonNominal,
  diskonPersen,
  hargaMinimum,
  hargaNormalPaket,
  labaPaket,
  marginPaket,
  statusPaket,
  totalBiayaRelevanPaket,
} from './bundle'
import { expectErr, expectOk } from './test-helpers'

const items = [
  { jumlah: 2, biayaSatuan: 5_000, hargaNormalSatuan: 8_000 },
  { jumlah: 1, biayaSatuan: 12_000, hargaNormalSatuan: 15_000 },
]

describe('hargaNormalPaket', () => {
  it('menjumlahkan harga normal tiap komponen sesuai kuantitas', () => {
    expect(expectOk(hargaNormalPaket(items))).toBe(31_000)
  })

  it('mengembalikan nol untuk paket kosong', () => {
    expect(expectOk(hargaNormalPaket([]))).toBe(0)
  })

  it('menolak kuantitas nol', () => {
    expectErr(
      hargaNormalPaket([{ jumlah: 0, biayaSatuan: 1, hargaNormalSatuan: 1 }]),
      'KUANTITAS_TIDAK_POSITIF',
    )
  })

  it('menolak harga normal negatif', () => {
    expectErr(
      hargaNormalPaket([{ jumlah: 1, biayaSatuan: 1, hargaNormalSatuan: -1 }]),
      'NOMINAL_NEGATIF',
    )
  })
})

describe('biayaPaket', () => {
  it('menjumlahkan biaya komponen ditambah biaya kemasan paket', () => {
    expect(expectOk(biayaPaket(items, 2_000))).toBe(24_000)
  })

  it('tanpa biaya tambahan memakai default nol', () => {
    expect(expectOk(biayaPaket(items))).toBe(22_000)
  })

  it('menolak biaya kemasan tambahan negatif', () => {
    expectErr(biayaPaket(items, -1), 'NOMINAL_NEGATIF')
  })

  it('menolak biaya satuan negatif', () => {
    expectErr(
      biayaPaket([{ jumlah: 1, biayaSatuan: -1, hargaNormalSatuan: 1 }]),
      'NOMINAL_NEGATIF',
    )
  })
})

describe('diskonNominal', () => {
  it('menghitung selisih harga normal dan harga paket', () => {
    expect(expectOk(diskonNominal(31_000, 27_000))).toBe(4_000)
  })

  it('boleh negatif bila harga paket lebih mahal', () => {
    expect(expectOk(diskonNominal(31_000, 32_000))).toBe(-1_000)
  })

  it('menolak harga negatif', () => {
    expectErr(diskonNominal(-1, 0), 'NOMINAL_NEGATIF')
  })
})

describe('diskonPersen', () => {
  it('menghitung proporsi diskon terhadap harga normal', () => {
    expect(expectOk(diskonPersen(31_000, 27_000))).toBeCloseTo(
      0.12903225806451613,
      12,
    )
  })

  it('menolak harga normal nol sebagai pembagi', () => {
    expectErr(diskonPersen(0, 27_000), 'HARGA_NORMAL_NOL')
  })

  it('menolak harga normal negatif', () => {
    expectErr(diskonPersen(-1, 0), 'NOMINAL_NEGATIF')
  })
})

describe('labaPaket', () => {
  it('mengurangi harga paket dengan biaya paket dan biaya variabel', () => {
    expect(expectOk(labaPaket(27_000, 24_000, 1_000))).toBe(2_000)
  })

  it('bisa negatif saat biaya melebihi harga paket', () => {
    expect(expectOk(labaPaket(20_000, 24_000, 1_000))).toBe(-5_000)
  })

  it('menolak biaya variabel negatif', () => {
    expectErr(labaPaket(27_000, 24_000, -1), 'NOMINAL_NEGATIF')
  })

  it('menolak harga paket negatif', () => {
    expectErr(labaPaket(-1, 24_000), 'NOMINAL_NEGATIF')
  })
})

describe('marginPaket', () => {
  it('menghitung laba dibagi harga paket', () => {
    expect(expectOk(marginPaket(2_000, 27_000))).toBeCloseTo(
      2_000 / 27_000,
      12,
    )
  })

  it('boleh negatif saat paket rugi', () => {
    expect(expectOk(marginPaket(-5_000, 20_000))).toBeCloseTo(-0.25, 12)
  })

  it('menolak harga paket nol sebagai pembagi', () => {
    expectErr(marginPaket(2_000, 0), 'HARGA_PAKET_NOL')
  })

  it('menolak harga paket negatif', () => {
    expectErr(marginPaket(2_000, -1), 'NOMINAL_NEGATIF')
  })

  it('menolak laba non-finite', () => {
    expectErr(marginPaket(Number.NaN, 27_000), 'BUKAN_ANGKA')
    expectErr(marginPaket(Number.POSITIVE_INFINITY, 27_000), 'BUKAN_ANGKA')
  })
})

describe('totalBiayaRelevanPaket', () => {
  it('menjumlahkan biaya paket dan biaya penjualan variabel', () => {
    expect(expectOk(totalBiayaRelevanPaket(24_000, 1_000))).toBe(25_000)
  })

  it('menerima tanpa biaya penjualan variabel', () => {
    expect(expectOk(totalBiayaRelevanPaket(24_000))).toBe(24_000)
  })

  it('menolak komponen negatif', () => {
    expectErr(totalBiayaRelevanPaket(-1, 0), 'NOMINAL_NEGATIF')
    expectErr(totalBiayaRelevanPaket(24_000, -1), 'NOMINAL_NEGATIF')
  })
})

describe('hargaMinimum', () => {
  it('menghitung harga minimum dari total biaya dan target margin', () => {
    expect(expectOk(hargaMinimum(24_000, 0.2))).toBe(30_000)
  })

  it('membulatkan ke atas ke Rupiah penuh', () => {
    expect(expectOk(hargaMinimum(10_000, 0.3))).toBe(14_286)
  })

  it('target margin nol menghasilkan harga sama dengan biaya', () => {
    expect(expectOk(hargaMinimum(24_000, 0))).toBe(24_000)
  })

  it('menolak target margin 100 persen', () => {
    expectErr(hargaMinimum(24_000, 1), 'MARGIN_TARGET_TIDAK_VALID')
  })

  it('menolak biaya negatif', () => {
    expectErr(hargaMinimum(-1, 0.2), 'NOMINAL_NEGATIF')
  })
})

describe('diskonMaksimum', () => {
  it('menghitung selisih harga normal dengan harga minimum', () => {
    expect(expectOk(diskonMaksimum(31_000, 30_000))).toBe(1_000)
  })

  it('mengembalikan nol bila harga normal sama dengan harga minimum', () => {
    expect(expectOk(diskonMaksimum(30_000, 30_000))).toBe(0)
  })

  it('error bila harga normal tidak cukup mencapai target margin', () => {
    expectErr(
      diskonMaksimum(29_000, 30_000),
      'DISKON_MAKSIMUM_TIDAK_TERSEDIA',
    )
  })

  it('menolak harga negatif', () => {
    expectErr(diskonMaksimum(-1, 0), 'NOMINAL_NEGATIF')
  })
})

describe('statusPaket', () => {
  it('rugi bila laba negatif', () => {
    expect(expectOk(statusPaket(-500, -0.02, 0.1))).toBe('rugi')
  })

  it('impas bila laba nol', () => {
    expect(expectOk(statusPaket(0, 0, 0.1))).toBe('impas')
  })

  it('di bawah target bila margin positif tetapi kurang dari target', () => {
    expect(expectOk(statusPaket(2_000, 2_000 / 27_000, 0.1))).toBe(
      'di_bawah_target',
    )
  })

  it('sesuai target bila margin sama dengan target', () => {
    expect(expectOk(statusPaket(3_000, 0.1, 0.1))).toBe('sesuai_target')
  })

  it('sesuai target bila margin melebihi target', () => {
    expect(expectOk(statusPaket(5_000, 0.15, 0.1))).toBe('sesuai_target')
  })

  it('impas menang atas target margin', () => {
    expect(expectOk(statusPaket(0, 0.5, 0.1))).toBe('impas')
  })

  it('menolak target margin tidak valid', () => {
    expectErr(statusPaket(1_000, 0.1, 1), 'MARGIN_TARGET_TIDAK_VALID')
  })

  it('menolak laba non-finite', () => {
    expectErr(statusPaket(Number.NaN, 0.1, 0.1), 'BUKAN_ANGKA')
  })
})
