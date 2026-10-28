import { describe, expect, it } from 'vitest'
import {
  biayaBahanBatch,
  breakEvenUnit,
  hargaJualDariMargin,
  hppPerUnit,
  labaKontribusi,
  marginAktual,
  markup,
  simulasiPerubahanBahan,
} from './margin'
import { expectErr, expectOk } from './test-helpers'

describe('biayaBahanBatch', () => {
  it('menjumlahkan jumlah bahan dikali biaya per satuan', () => {
    const result = biayaBahanBatch([
      { jumlah: 2, biayaPerSatuan: 5_000 },
      { jumlah: 1.5, biayaPerSatuan: 8_000 },
    ])
    expect(expectOk(result)).toBe(22_000)
  })

  it('mengembalikan nol untuk daftar kosong', () => {
    expect(expectOk(biayaBahanBatch([]))).toBe(0)
  })

  it('menolak jumlah bahan nol', () => {
    expectErr(
      biayaBahanBatch([{ jumlah: 0, biayaPerSatuan: 1_000 }]),
      'KUANTITAS_TIDAK_POSITIF',
    )
  })

  it('menolak biaya negatif', () => {
    expectErr(
      biayaBahanBatch([{ jumlah: 1, biayaPerSatuan: -1 }]),
      'NOMINAL_NEGATIF',
    )
  })
})

describe('hppPerUnit', () => {
  it('membagi total biaya batch dengan unit layak jual', () => {
    expect(expectOk(hppPerUnit(22_000, 10))).toBe(2_200)
  })

  it('tidak membulatkan hasil antara', () => {
    expect(expectOk(hppPerUnit(10_000, 3))).toBeCloseTo(3_333.3333333333335, 9)
  })

  it('menolak unit layak jual nol', () => {
    expectErr(hppPerUnit(22_000, 0), 'KUANTITAS_TIDAK_POSITIF')
  })

  it('menolak unit layak jual negatif', () => {
    expectErr(hppPerUnit(22_000, -1), 'KUANTITAS_TIDAK_POSITIF')
  })

  it('menolak total biaya negatif', () => {
    expectErr(hppPerUnit(-1, 10), 'NOMINAL_NEGATIF')
  })
})

describe('hargaJualDariMargin', () => {
  it('menghitung harga jual dari HPP dan target margin', () => {
    expect(expectOk(hargaJualDariMargin(10_000, 0.3))).toBe(14_286)
  })

  it('membulatkan ke atas ke Rupiah penuh', () => {
    expect(expectOk(hargaJualDariMargin(10_000, 0.33))).toBe(14_926)
  })

  it('target margin nol menghasilkan harga sama dengan HPP', () => {
    expect(expectOk(hargaJualDariMargin(10_000, 0))).toBe(10_000)
  })

  it('HPP nol menghasilkan harga nol', () => {
    expect(expectOk(hargaJualDariMargin(0, 0.5))).toBe(0)
  })

  it('menolak target margin 100 persen', () => {
    expectErr(hargaJualDariMargin(10_000, 1), 'MARGIN_TARGET_TIDAK_VALID')
  })

  it('menolak target margin di atas 100 persen', () => {
    expectErr(hargaJualDariMargin(10_000, 1.2), 'MARGIN_TARGET_TIDAK_VALID')
  })

  it('menolak target margin negatif', () => {
    expectErr(hargaJualDariMargin(10_000, -0.1), 'MARGIN_TARGET_TIDAK_VALID')
  })

  it('menolak HPP negatif', () => {
    expectErr(hargaJualDariMargin(-1, 0.3), 'NOMINAL_NEGATIF')
  })

  it('menolak NaN', () => {
    expectErr(hargaJualDariMargin(Number.NaN, 0.3), 'BUKAN_ANGKA')
  })
})

describe('marginAktual', () => {
  it('menghitung (harga jual - HPP) / harga jual', () => {
    expect(expectOk(marginAktual(15_000, 10_000))).toBeCloseTo(1 / 3, 12)
  })

  it('margin nol saat harga jual sama dengan HPP', () => {
    expect(expectOk(marginAktual(10_000, 10_000))).toBe(0)
  })

  it('margin negatif saat harga jual di bawah HPP', () => {
    expect(expectOk(marginAktual(8_000, 10_000))).toBe(-0.25)
  })

  it('margin 100 persen saat HPP nol', () => {
    expect(expectOk(marginAktual(10_000, 0))).toBe(1)
  })

  it('menolak harga jual nol sebagai pembagi', () => {
    expectErr(marginAktual(0, 10_000), 'NILAI_TIDAK_POSITIF')
  })

  it('menolak HPP negatif', () => {
    expectErr(marginAktual(10_000, -1), 'NOMINAL_NEGATIF')
  })
})

describe('markup', () => {
  it('menghitung (harga jual - HPP) / HPP, bukan margin', () => {
    expect(expectOk(markup(15_000, 10_000))).toBe(0.5)
  })

  it('membedakan markup dari margin pada input yang sama', () => {
    expect(expectOk(marginAktual(15_000, 10_000))).toBeCloseTo(1 / 3, 12)
    expect(expectOk(markup(15_000, 10_000))).toBe(0.5)
  })

  it('markup nol saat harga jual sama dengan HPP', () => {
    expect(expectOk(markup(10_000, 10_000))).toBe(0)
  })

  it('markup negatif saat harga jual nol', () => {
    expect(expectOk(markup(0, 10_000))).toBe(-1)
  })

  it('menolak HPP nol sebagai pembagi', () => {
    expectErr(markup(10_000, 0), 'NILAI_TIDAK_POSITIF')
  })

  it('menolak HPP negatif', () => {
    expectErr(markup(10_000, -1), 'NOMINAL_NEGATIF')
  })
})

describe('labaKontribusi', () => {
  it('menghitung harga jual dikurangi biaya variabel', () => {
    expect(expectOk(labaKontribusi(15_000, 12_000))).toBe(3_000)
  })

  it('negatif saat biaya variabel melebihi harga jual', () => {
    expect(expectOk(labaKontribusi(10_000, 12_000))).toBe(-2_000)
  })

  it('menolak biaya variabel negatif', () => {
    expectErr(labaKontribusi(15_000, -1), 'NOMINAL_NEGATIF')
  })

  it('menolak harga jual negatif', () => {
    expectErr(labaKontribusi(-1, 0), 'NOMINAL_NEGATIF')
  })
})

describe('breakEvenUnit', () => {
  it('membulatkan break-even ke atas', () => {
    expect(expectOk(breakEvenUnit(5_000_000, 15_000, 12_000))).toBe(1_667)
  })

  it('biaya tetap nol menghasilkan nol unit', () => {
    expect(expectOk(breakEvenUnit(0, 15_000, 12_000))).toBe(0)
  })

  it('membulatkan pecahan kecil ke satu unit', () => {
    expect(expectOk(breakEvenUnit(1, 3, 1))).toBe(1)
  })

  it('menolak kontribusi nol', () => {
    expectErr(breakEvenUnit(5_000_000, 12_000, 12_000), 'BREAK_EVEN_TIDAK_TERCAPAI')
  })

  it('menolak kontribusi negatif', () => {
    expectErr(breakEvenUnit(5_000_000, 10_000, 12_000), 'BREAK_EVEN_TIDAK_TERCAPAI')
  })

  it('menolak biaya tetap negatif', () => {
    expectErr(breakEvenUnit(-1, 15_000, 12_000), 'NOMINAL_NEGATIF')
  })

  it('menolak NaN', () => {
    expectErr(breakEvenUnit(Number.NaN, 15_000, 12_000), 'BUKAN_ANGKA')
  })
})

describe('simulasiPerubahanBahan', () => {
  it('menerapkan perubahan hanya ke biaya bahan', () => {
    expect(expectOk(simulasiPerubahanBahan(10_000, 0.1, 5_000))).toBe(16_000)
  })

  it('menerapkan penurunan biaya bahan', () => {
    expect(expectOk(simulasiPerubahanBahan(10_000, -0.5, 5_000))).toBe(10_000)
  })

  it('penurunan 100 persen menyisakan biaya lain', () => {
    expect(expectOk(simulasiPerubahanBahan(10_000, -1, 5_000))).toBe(5_000)
  })

  it('menolak penurunan lebih dari 100 persen', () => {
    expectErr(
      simulasiPerubahanBahan(10_000, -1.1, 5_000),
      'PERUBAHAN_TIDAK_VALID',
    )
  })

  it('menolak biaya lain negatif', () => {
    expectErr(simulasiPerubahanBahan(10_000, 0.1, -1), 'NOMINAL_NEGATIF')
  })

  it('menolak perubahan NaN', () => {
    expectErr(
      simulasiPerubahanBahan(10_000, Number.NaN, 5_000),
      'BUKAN_ANGKA',
    )
  })
})
