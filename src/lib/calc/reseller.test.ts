import { describe, expect, it } from 'vitest'
import {
  biayaIklanPerPesanan,
  biayaPlatform,
  labaPerPesanan,
  marginReseller,
  pendapatanBersih,
  perbandinganProduk,
} from './reseller'
import { expectErr, expectOk } from './test-helpers'

describe('pendapatanBersih', () => {
  it('mengurangi diskon dan refund dari harga jual', () => {
    expect(expectOk(pendapatanBersih(100_000, 10_000, 5_000))).toBe(85_000)
  })

  it('menerima tanpa diskon dan refund', () => {
    expect(expectOk(pendapatanBersih(100_000, 0, 0))).toBe(100_000)
  })

  it('boleh menghasilkan nol bila diskon dan refund menghabiskan harga', () => {
    expect(expectOk(pendapatanBersih(100_000, 60_000, 40_000))).toBe(0)
  })

  it('menolak diskon dan refund melebihi harga jual', () => {
    expectErr(pendapatanBersih(100_000, 60_000, 50_000), 'PENDAPATAN_NEGATIF')
  })

  it('menolak komponen negatif', () => {
    expectErr(pendapatanBersih(100_000, -1, 0), 'NOMINAL_NEGATIF')
  })

  it('menolak NaN', () => {
    expectErr(pendapatanBersih(Number.NaN, 0, 0), 'BUKAN_ANGKA')
  })
})

describe('biayaPlatform', () => {
  const dasar = {
    hargaJual: 100_000,
    diskon: 10_000,
    refund: 5_000,
    tarifPlatform: 0.1,
  }

  it('memakai harga sebelum diskon sebagai dasar', () => {
    expect(
      expectOk(biayaPlatform({ ...dasar, dasarKomisi: 'harga_sebelum_diskon' })),
    ).toBe(10_000)
  })

  it('memakai harga setelah diskon sebagai dasar', () => {
    expect(
      expectOk(biayaPlatform({ ...dasar, dasarKomisi: 'harga_setelah_diskon' })),
    ).toBe(9_000)
  })

  it('memakai pendapatan bersih sebagai dasar', () => {
    expect(expectOk(biayaPlatform({ ...dasar, dasarKomisi: 'pendapatan_bersih' }))).toBe(
      8_500,
    )
  })

  it('menolak tarif di atas 100 persen', () => {
    expectErr(
      biayaPlatform({
        ...dasar,
        tarifPlatform: 1.1,
        dasarKomisi: 'harga_sebelum_diskon',
      }),
      'PERSEN_DI_LUAR_RENTANG',
    )
  })

  it('menolak tarif negatif', () => {
    expectErr(
      biayaPlatform({
        ...dasar,
        tarifPlatform: -0.1,
        dasarKomisi: 'harga_sebelum_diskon',
      }),
      'PERSEN_DI_LUAR_RENTANG',
    )
  })

  it('menolak pendapatan bersih negatif', () => {
    expectErr(
      biayaPlatform({
        hargaJual: 100_000,
        diskon: 60_000,
        refund: 50_000,
        tarifPlatform: 0.1,
        dasarKomisi: 'pendapatan_bersih',
      }),
      'PENDAPATAN_NEGATIF',
    )
  })
})

describe('biayaIklanPerPesanan', () => {
  it('membagi total biaya iklan dengan jumlah pesanan', () => {
    expect(expectOk(biayaIklanPerPesanan(300_000, 100))).toBe(3_000)
  })

  it('menolak jumlah pesanan nol', () => {
    expectErr(biayaIklanPerPesanan(300_000, 0), 'KUANTITAS_TIDAK_POSITIF')
  })

  it('menolak total biaya iklan negatif', () => {
    expectErr(biayaIklanPerPesanan(-1, 10), 'NOMINAL_NEGATIF')
  })

  it('menerima total biaya iklan nol', () => {
    expect(expectOk(biayaIklanPerPesanan(0, 10))).toBe(0)
  })
})

describe('labaPerPesanan', () => {
  const input = {
    hargaJual: 100_000,
    diskon: 10_000,
    refund: 5_000,
    biayaBarang: 50_000,
    tarifPlatform: 0.1,
    dasarKomisi: 'harga_setelah_diskon' as const,
    biayaIklanPerPesanan: 3_000,
    biayaKemasan: 2_000,
    subsidiOngkir: 4_000,
    biayaPembayaran: 1_500,
    biayaLain: 500,
  }

  it('mengurangi seluruh biaya tepat satu kali', () => {
    // 85.000 - 50.000 - 9.000 - 3.000 - 2.000 - 4.000 - 1.500 - 500
    expect(expectOk(labaPerPesanan(input))).toBe(15_000)
  })

  it('menghasilkan laba negatif bila biaya melebihi pendapatan', () => {
    expect(
      expectOk(labaPerPesanan({ ...input, biayaBarang: 90_000 })),
    ).toBe(-25_000)
  })

  it('menolak komponen biaya negatif', () => {
    expectErr(labaPerPesanan({ ...input, biayaKemasan: -1 }), 'NOMINAL_NEGATIF')
  })

  it('menolak diskon dan refund melebihi harga jual', () => {
    expectErr(
      labaPerPesanan({ ...input, diskon: 60_000, refund: 50_000 }),
      'PENDAPATAN_NEGATIF',
    )
  })
})

describe('marginReseller', () => {
  it('membagi laba dengan pendapatan bersih', () => {
    expect(expectOk(marginReseller(15_000, 85_000))).toBeCloseTo(
      0.17647058823529413,
      12,
    )
  })

  it('margin negatif bila laba negatif', () => {
    expect(expectOk(marginReseller(-10_000, 100_000))).toBe(-0.1)
  })

  it('menolak pendapatan nol', () => {
    expectErr(marginReseller(10_000, 0), 'MARGIN_TIDAK_TERSEDIA')
  })

  it('menolak pendapatan negatif', () => {
    expectErr(marginReseller(10_000, -1), 'MARGIN_TIDAK_TERSEDIA')
  })

  it('menolak laba non-finite', () => {
    expectErr(
      marginReseller(Number.POSITIVE_INFINITY, 100_000),
      'BUKAN_ANGKA',
    )
  })
})

describe('perbandinganProduk', () => {
  it('menghitung laba total berdasarkan volume tanpa mengubah urutan', () => {
    const result = perbandinganProduk([
      { nama: 'Produk A', labaPerUnit: 5_000, volume: 10 },
      { nama: 'Produk B', labaPerUnit: 3_000, volume: 30 },
    ])

    expect(expectOk(result)).toEqual([
      { nama: 'Produk A', labaPerUnit: 5_000, volume: 10, labaTotal: 50_000 },
      { nama: 'Produk B', labaPerUnit: 3_000, volume: 30, labaTotal: 90_000 },
    ])
  })

  it('mengembalikan daftar kosong', () => {
    expect(expectOk(perbandinganProduk([]))).toEqual([])
  })

  it('menerima laba per unit negatif', () => {
    const result = perbandinganProduk([
      { nama: 'Produk Rugi', labaPerUnit: -1_000, volume: 5 },
    ])
    expect(expectOk(result)[0]?.labaTotal).toBe(-5_000)
  })

  it('menolak nama kosong', () => {
    expectErr(
      perbandinganProduk([{ nama: '  ', labaPerUnit: 1_000, volume: 1 }]),
      'WAJIB_DIISI',
    )
  })

  it('menolak volume negatif', () => {
    expectErr(
      perbandinganProduk([{ nama: 'A', labaPerUnit: 1_000, volume: -1 }]),
      'NOMINAL_NEGATIF',
    )
  })
})
