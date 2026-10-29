/**
 * Satu-satunya sumber harga, batas simulasi, dan fitur paket.
 * Jangan menulis ulang angka batas atau harga di komponen.
 */
export type Plan = 'free' | 'plus' | 'business'

export type PlanFeature =
  | 'bulk-csv-export'
  | 'scenario-comparison'
  | 'unlimited-simulations'

export interface PlanConfig {
  id: Plan
  name: string
  price: number
  tagline: string
  /** `null` berarti tanpa batas. */
  simulationLimit: number | null
  features: readonly PlanFeature[]
}

export const PLAN_ORDER: readonly Plan[] = ['free', 'plus', 'business']

export const FEATURE_LABELS: Record<PlanFeature, string> = {
  'bulk-csv-export': 'Ekspor CSV dari halaman Riwayat',
  'scenario-comparison': 'Perbandingan produk tersimpan',
  'unlimited-simulations': 'Simulasi tanpa batas',
}

export const PLAN_COMMON_FEATURES = [
  'Semua modul terbuka',
  'Kalkulasi dasar dan rincian hasil',
  'Simpan di perangkat tanpa akun',
  'Ekspor CSV per simulasi',
  'Backup dan impor JSON',
] as const

export const PLANS: Record<Plan, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    tagline: 'Untuk mencoba seluruh modul tanpa akun',
    simulationLimit: 5,
    features: [],
  },
  plus: {
    id: 'plus',
    name: 'Plus',
    price: 39000,
    tagline: 'Untuk pemakaian pribadi yang lebih intensif',
    simulationLimit: 50,
    features: ['bulk-csv-export', 'scenario-comparison'],
  },
  business: {
    id: 'business',
    name: 'Bisnis',
    price: 99000,
    tagline: 'Untuk usaha dengan banyak skenario',
    simulationLimit: null,
    features: [
      'bulk-csv-export',
      'scenario-comparison',
      'unlimited-simulations',
    ],
  },
}

export const LICENSE_TERMS = [
  'Harga yang ditampilkan adalah hipotesis dan dapat berubah sebelum pembelian.',
  'Lisensi sekali bayar berlaku untuk versi mayor aplikasi yang tersedia saat pembelian (saat ini versi 1.x), termasuk perbaikan bug pada versi tersebut.',
  'Pembaruan ke versi mayor berikutnya tidak otomatis termasuk dalam lisensi lama.',
  'Pembayaran dan aktivasi paket dilakukan manual oleh penjual; aplikasi tidak memproses pembayaran dan tidak menampilkan status “pembayaran berhasil”.',
] as const
