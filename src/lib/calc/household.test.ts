import { describe, expect, it } from 'vitest'
import {
  BATAS_MENDEKATI_ANGGARAN,
  hargaEfektifProduk,
  hargaPerSatuanProduk,
  hargaPerSatuanStandar,
  hargaPerSatuanStandarDetail,
  penghematan,
  persenAnggaranTerpakai,
  rankingProduk,
  satuanStandar,
  selisihHematDariTermurah,
  sisaAnggaran,
  statusAnggaran,
  statusKesegaranHarga,
  totalBelanja,
} from './household'
import { expectErr, expectOk } from './test-helpers'

const berasA = {
  nama: 'Beras A',
  harga: 68_000,
  ongkir: 10_000,
  voucher: 3_000,
  isi: 5,
  satuan: 'kg' as const,
}

const berasB = {
  nama: 'Beras B',
  harga: 62_000,
  ongkir: 18_000,
  voucher: 0,
  isi: 5,
  satuan: 'kg' as const,
}

const berasC = {
  nama: 'Beras C',
  harga: 25_000,
  ongkir: 8_000,
  voucher: 0,
  isi: 2,
  satuan: 'kg' as const,
}

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

describe('hargaEfektifProduk', () => {
  it('menjumlahkan harga dan ongkir lalu mengurangi voucher', () => {
    expect(
      expectOk(
        hargaEfektifProduk({
          harga: 68_000,
          ongkir: 10_000,
          voucher: 3_000,
        }),
      ),
    ).toBe(75_000)
  })

  it('menganggap ongkir dan voucher nol bila tidak diisi', () => {
    expect(expectOk(hargaEfektifProduk({ harga: 68_000 }))).toBe(68_000)
  })

  it('menolak voucher yang melebihi harga tambah ongkir', () => {
    expectErr(
      hargaEfektifProduk({
        harga: 68_000,
        ongkir: 10_000,
        voucher: 100_000,
      }),
      'VOUCHER_MELEBIHI_TOTAL',
    )
  })

  it('menolak harga, ongkir, atau voucher negatif', () => {
    expectErr(
      hargaEfektifProduk({ harga: -1, ongkir: 0, voucher: 0 }),
      'NOMINAL_NEGATIF',
    )
    expectErr(
      hargaEfektifProduk({ harga: 68_000, ongkir: -1, voucher: 0 }),
      'NOMINAL_NEGATIF',
    )
    expectErr(
      hargaEfektifProduk({ harga: 68_000, ongkir: 0, voucher: -1 }),
      'NOMINAL_NEGATIF',
    )
  })

  it('menolak nilai tidak finite', () => {
    expectErr(
      hargaEfektifProduk({ harga: Number.NaN, ongkir: 0, voucher: 0 }),
      'BUKAN_ANGKA',
    )
    expectErr(
      hargaEfektifProduk({
        harga: 68_000,
        ongkir: Number.POSITIVE_INFINITY,
        voucher: 0,
      }),
      'BUKAN_ANGKA',
    )
  })
})

describe('hargaPerSatuanProduk', () => {
  it('menghitung harga per kg dari isi kilogram', () => {
    expect(
      expectOk(
        hargaPerSatuanProduk({
          hargaEfektif: 75_000,
          isi: 5,
          satuan: 'kg',
        }),
      ),
    ).toBe(15_000)
  })

  it('mengonversi gram ke kilogram', () => {
    expect(
      expectOk(
        hargaPerSatuanProduk({
          hargaEfektif: 18_000,
          isi: 750,
          satuan: 'g',
        }),
      ),
    ).toBe(24_000)
  })

  it('mengonversi mililiter ke liter', () => {
    expect(
      expectOk(
        hargaPerSatuanProduk({
          hargaEfektif: 18_000,
          isi: 1_500,
          satuan: 'ml',
        }),
      ),
    ).toBe(12_000)
  })

  it('memakai pcs apa adanya', () => {
    expect(
      expectOk(
        hargaPerSatuanProduk({
          hargaEfektif: 10_000,
          isi: 2,
          satuan: 'pcs',
        }),
      ),
    ).toBe(5_000)
  })

  it('menolak isi nol atau negatif', () => {
    expectErr(
      hargaPerSatuanProduk({
        hargaEfektif: 75_000,
        isi: 0,
        satuan: 'kg',
      }),
      'KUANTITAS_TIDAK_POSITIF',
    )
    expectErr(
      hargaPerSatuanProduk({
        hargaEfektif: 75_000,
        isi: -1,
        satuan: 'kg',
      }),
      'KUANTITAS_TIDAK_POSITIF',
    )
  })

  it('menolak harga efektif negatif atau tidak finite', () => {
    expectErr(
      hargaPerSatuanProduk({
        hargaEfektif: -1,
        isi: 5,
        satuan: 'kg',
      }),
      'NOMINAL_NEGATIF',
    )
    expectErr(
      hargaPerSatuanProduk({
        hargaEfektif: Number.POSITIVE_INFINITY,
        isi: 5,
        satuan: 'kg',
      }),
      'BUKAN_ANGKA',
    )
  })
})

describe('rankingProduk', () => {
  it('mengurutkan dengan ongkir dan voucher dari harga per satuan termurah', () => {
    const hasil = expectOk(rankingProduk([berasA, berasB, berasC]))

    expect(hasil.map((produk) => produk.nama)).toEqual([
      'Beras A',
      'Beras B',
      'Beras C',
    ])
    expect(hasil.map((produk) => produk.hargaEfektif)).toEqual([
      75_000, 80_000, 33_000,
    ])
    expect(hasil.map((produk) => produk.hargaPerSatuan)).toEqual([
      15_000, 16_000, 16_500,
    ])
    expect(hasil.every((produk) => !produk.seri)).toBe(true)
  })

  it('mengurutkan tanpa ongkir dan voucher berdasarkan harga per kg', () => {
    const hasil = expectOk(
      rankingProduk([
        { ...berasA, ongkir: 0, voucher: 0 },
        { ...berasB, ongkir: 0, voucher: 0 },
        { ...berasC, ongkir: 0, voucher: 0 },
      ]),
    )

    expect(hasil.map((produk) => produk.nama)).toEqual([
      'Beras B',
      'Beras C',
      'Beras A',
    ])
    expect(hasil.map((produk) => produk.hargaPerSatuan)).toEqual([
      12_400, 12_500, 13_600,
    ])
  })

  it('menolak perbandingan massa dan volume', () => {
    const hasil = rankingProduk([
      berasA,
      {
        nama: 'Minyak',
        harga: 30_000,
        isi: 2,
        satuan: 'l' as const,
      },
    ])

    expect(hasil.ok).toBe(false)
    if (hasil.ok) return
    expect(hasil.errors).toContainEqual(
      expect.objectContaining({
        code: 'SATUAN_TIDAK_SEBANDING',
        message: 'satuan tidak bisa dibandingkan',
      }),
    )
  })

  it('menandai harga per satuan sama sebagai seri tanpa mengubah urutan', () => {
    const hasil = expectOk(
      rankingProduk([
        { nama: 'Beras A', harga: 75_000, isi: 5, satuan: 'kg' as const },
        { nama: 'Beras B', harga: 60_000, isi: 4, satuan: 'kg' as const },
        { nama: 'Beras C', harga: 90_000, isi: 6, satuan: 'kg' as const },
        { nama: 'Beras D', harga: 80_000, isi: 5, satuan: 'kg' as const },
      ]),
    )

    expect(hasil.map((produk) => produk.nama)).toEqual([
      'Beras A',
      'Beras B',
      'Beras C',
      'Beras D',
    ])
    expect(hasil.map((produk) => produk.seri)).toEqual([
      true,
      true,
      true,
      false,
    ])
  })

  it('menyamakan harga per satuan setelah konversi gram ke kg', () => {
    const hasil = expectOk(
      rankingProduk([
        {
          nama: 'Kemasan 5 kg',
          harga: 75_000,
          isi: 5,
          satuan: 'kg' as const,
        },
        {
          nama: 'Kemasan 5000 g',
          harga: 75_000,
          isi: 5_000,
          satuan: 'g' as const,
        },
      ]),
    )

    expect(hasil.map((produk) => produk.hargaPerSatuan)).toEqual([
      15_000, 15_000,
    ])
    expect(hasil.map((produk) => produk.seri)).toEqual([true, true])
  })

  it('meneruskan error voucher berlebih', () => {
    expectErr(
      rankingProduk([
        {
          nama: 'Beras',
          harga: 68_000,
          ongkir: 10_000,
          voucher: 100_000,
          isi: 5,
          satuan: 'kg' as const,
        },
      ]),
      'VOUCHER_MELEBIHI_TOTAL',
    )
  })
})

describe('selisihHematDariTermurah', () => {
  it('menghitung selisih harga efektif A terhadap B', () => {
    expect(expectOk(selisihHematDariTermurah(berasA, berasB))).toBe(5_000)
  })

  it('tidak bergantung pada urutan argumen', () => {
    expect(expectOk(selisihHematDariTermurah(berasB, berasA))).toBe(5_000)
  })

  it('meneruskan error voucher berlebih', () => {
    expectErr(
      selisihHematDariTermurah(
        {
          harga: 68_000,
          ongkir: 10_000,
          voucher: 100_000,
        },
        berasA,
      ),
      'VOUCHER_MELEBIHI_TOTAL',
    )
  })
})

describe('statusKesegaranHarga', () => {
  const sekarang = new Date('2026-10-29T12:00:00.000Z')

  it('segar untuk harga yang dicek hari ini', () => {
    expect(
      statusKesegaranHarga(
        new Date('2026-10-29T00:00:00.000Z'),
        sekarang,
      ),
    ).toBe('segar')
  })

  it('segar tepat pada batas 7 hari', () => {
    expect(
      statusKesegaranHarga(
        new Date('2026-10-22T12:00:00.000Z'),
        sekarang,
      ),
    ).toBe('segar')
  })

  it('lama bila melewati batas 7 hari', () => {
    expect(
      statusKesegaranHarga(
        new Date('2026-10-22T11:59:59.999Z'),
        sekarang,
      ),
    ).toBe('lama')
  })

  it('menerima string ISO', () => {
    expect(
      statusKesegaranHarga('2026-10-01T00:00:00.000Z', sekarang),
    ).toBe('lama')
  })

  it('memakai batas hari kustom', () => {
    expect(
      statusKesegaranHarga(
        '2026-10-28T12:00:00.000Z',
        sekarang,
        1,
      ),
    ).toBe('segar')
    expect(
      statusKesegaranHarga(
        '2026-10-28T11:59:59.999Z',
        sekarang,
        1,
      ),
    ).toBe('lama')
  })

  it('menganggap tanggal tidak valid sebagai lama', () => {
    expect(statusKesegaranHarga('bukan tanggal', sekarang)).toBe('lama')
  })
})
