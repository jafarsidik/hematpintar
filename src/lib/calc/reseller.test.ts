import { describe, expect, it } from 'vitest'
import {
  biayaIklanPerPesanan,
  biayaPlatform,
  estimasiLabaVolume,
  labaPerPesanan,
  marginReseller,
  pendapatanBersih,
  perbandinganProduk,
  ringkasanBiayaReseller,
  statusLabaReseller,
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

describe('ringkasanBiayaReseller', () => {
  const contoh = {
    hargaJual: 150_000,
    diskon: 10_000,
    refund: 0,
    biayaBarang: 80_000,
    tarifPlatform: 0.08,
    dasarKomisi: 'harga_setelah_diskon' as const,
    biayaIklanPerPesanan: 4_000,
    biayaKemasan: 3_000,
    subsidiOngkir: 4_800,
    biayaPembayaran: 2_000,
    biayaLain: 0,
  }

  it('mengembalikan ringkasan sesuai contoh PRD', () => {
    expect(expectOk(ringkasanBiayaReseller(contoh))).toEqual({
      pendapatanBersih: 140_000,
      dasarKomisi: 140_000,
      biayaPlatform: 11_200,
      totalBiayaVariabel: 105_000,
      labaPerPesanan: 35_000,
    })
  })

  it('mengikuti dasar komisi yang dipilih', () => {
    const sebelumDiskon = expectOk(
      ringkasanBiayaReseller({
        ...contoh,
        dasarKomisi: 'harga_sebelum_diskon',
      }),
    )
    expect(sebelumDiskon.dasarKomisi).toBe(150_000)
    expect(sebelumDiskon.biayaPlatform).toBe(12_000)
    expect(sebelumDiskon.totalBiayaVariabel).toBe(105_800)
    expect(sebelumDiskon.labaPerPesanan).toBe(34_200)

    const pendapatan = expectOk(
      ringkasanBiayaReseller({
        ...contoh,
        dasarKomisi: 'pendapatan_bersih',
      }),
    )
    expect(pendapatan.dasarKomisi).toBe(140_000)
    expect(pendapatan.biayaPlatform).toBe(11_200)
  })

  it('tidak mengurangi diskon dan refund dua kali', () => {
    const hasil = expectOk(
      ringkasanBiayaReseller({ ...contoh, diskon: 20_000, refund: 5_000 }),
    )
    expect(hasil.pendapatanBersih).toBe(125_000)
    expect(hasil.totalBiayaVariabel).toBe(104_200)
    expect(hasil.labaPerPesanan).toBe(20_800)
  })

  it('menolak diskon dan refund melebihi harga jual', () => {
    expectErr(
      ringkasanBiayaReseller({
        ...contoh,
        diskon: 200_000,
      }),
      'PENDAPATAN_NEGATIF',
    )
  })

  it('menolak biaya negatif', () => {
    expectErr(
      ringkasanBiayaReseller({ ...contoh, biayaKemasan: -1 }),
      'NOMINAL_NEGATIF',
    )
  })
})

describe('estimasiLabaVolume', () => {
  it('mengalikan laba per pesanan dengan volume', () => {
    expect(expectOk(estimasiLabaVolume(35_000, 50))).toBe(1_750_000)
  })

  it('menerima laba negatif dan volume pecahan positif', () => {
    expect(expectOk(estimasiLabaVolume(-2_000, 2.5))).toBe(-5_000)
  })

  it('menolak volume nol', () => {
    expectErr(estimasiLabaVolume(35_000, 0), 'KUANTITAS_TIDAK_POSITIF')
  })

  it('menolak laba non-finite', () => {
    expectErr(
      estimasiLabaVolume(Number.NaN, 10),
      'BUKAN_ANGKA',
    )
  })
})

describe('statusLabaReseller', () => {
  it('menandai laba positif sebagai untung', () => {
    expect(expectOk(statusLabaReseller(1))).toBe('untung')
  })

  it('menandai laba nol sebagai impas', () => {
    expect(expectOk(statusLabaReseller(0))).toBe('impas')
  })

  it('menandai laba negatif sebagai rugi', () => {
    expect(expectOk(statusLabaReseller(-1))).toBe('rugi')
  })

  it('menolak nilai non-finite', () => {
    expectErr(
      statusLabaReseller(Number.POSITIVE_INFINITY),
      'BUKAN_ANGKA',
    )
  })
})
