import type { ModuleType } from '@/lib/storage/schemas'

export interface ModuleInfo {
  type: ModuleType
  label: string
  shortLabel: string
  path: string
  description: string
}

export const MODULES: readonly ModuleInfo[] = [
  {
    type: 'household',
    label: 'Hemat Rumah Tangga',
    shortLabel: 'Rumah Tangga',
    path: '/rumah-tangga',
    description:
      'Atur anggaran belanja, hitung harga per satuan, dan bandingkan pilihan.',
  },
  {
    type: 'margin',
    label: 'Margin Rescue',
    shortLabel: 'Margin',
    path: '/margin-rescue',
    description:
      'Hitung HPP, tentukan harga jual dari target margin, dan cek break-even.',
  },
  {
    type: 'reseller',
    label: 'Profit Kit Reseller',
    shortLabel: 'Reseller',
    path: '/reseller',
    description:
      'Lihat laba bersih setelah diskon, komisi platform, iklan, dan biaya lain.',
  },
  {
    type: 'bundle',
    label: 'Generator Paket Hemat',
    shortLabel: 'Paket Hemat',
    path: '/paket-hemat',
    description:
      'Susun paket, simulasi diskon, dan ketahui harga minimum yang aman.',
  },
]

export function moduleInfo(type: ModuleType): ModuleInfo {
  return MODULES.find((module) => module.type === type) ?? MODULES[0]!
}
