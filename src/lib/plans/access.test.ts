import { describe, expect, it } from 'vitest'
import { PLANS } from '@/config/plans'
import {
  canCreateSimulation,
  canUse,
  getSimulationLimit,
  remainingSimulations,
  simulationLimitLabel,
} from './access'

describe('plan configuration', () => {
  it('menyimpan harga dan batas simulasi di satu sumber', () => {
    expect(PLANS.free.price).toBe(0)
    expect(PLANS.plus.price).toBe(39000)
    expect(PLANS.business.price).toBe(99000)

    expect(PLANS.free.simulationLimit).toBe(5)
    expect(PLANS.plus.simulationLimit).toBe(50)
    expect(PLANS.business.simulationLimit).toBeNull()
  })
})

describe('canUse', () => {
  it('menolak fitur Plus bagi paket Free', () => {
    expect(canUse('bulk-csv-export', 'free')).toBe(false)
    expect(canUse('scenario-comparison', 'free')).toBe(false)
    expect(canUse('unlimited-simulations', 'free')).toBe(false)
  })

  it('membuka fitur Plus bagi paket Plus', () => {
    expect(canUse('bulk-csv-export', 'plus')).toBe(true)
    expect(canUse('scenario-comparison', 'plus')).toBe(true)
    expect(canUse('unlimited-simulations', 'plus')).toBe(false)
  })

  it('membuka seluruh fitur bagi paket Bisnis', () => {
    expect(canUse('bulk-csv-export', 'business')).toBe(true)
    expect(canUse('scenario-comparison', 'business')).toBe(true)
    expect(canUse('unlimited-simulations', 'business')).toBe(true)
  })
})

describe('batas simulasi', () => {
  it('mengizinkan Free sampai 5 simulasi per modul', () => {
    expect(canCreateSimulation('free', 0)).toBe(true)
    expect(canCreateSimulation('free', 4)).toBe(true)
    expect(canCreateSimulation('free', 5)).toBe(false)
    expect(canCreateSimulation('free', 6)).toBe(false)
  })

  it('mengizinkan Plus sampai 50 simulasi per modul', () => {
    expect(canCreateSimulation('plus', 49)).toBe(true)
    expect(canCreateSimulation('plus', 50)).toBe(false)
  })

  it('mengizinkan Bisnis tanpa batas jumlah simulasi', () => {
    expect(canCreateSimulation('business', 50)).toBe(true)
    expect(canCreateSimulation('business', 5000)).toBe(true)
  })

  it('menghitung sisa kuota tanpa angka negatif', () => {
    expect(remainingSimulations('free', 4)).toBe(1)
    expect(remainingSimulations('free', 5)).toBe(0)
    expect(remainingSimulations('free', 9)).toBe(0)
    expect(remainingSimulations('plus', 10)).toBe(40)
    expect(remainingSimulations('business', 999)).toBeNull()
  })

  it('menampilkan label batas dari konfigurasi', () => {
    expect(getSimulationLimit('free')).toBe(5)
    expect(getSimulationLimit('plus')).toBe(50)
    expect(getSimulationLimit('business')).toBeNull()
    expect(simulationLimitLabel('free')).toBe('5 simulasi per modul')
    expect(simulationLimitLabel('plus')).toBe('50 simulasi per modul')
    expect(simulationLimitLabel('business')).toBe('Simulasi tanpa batas')
  })
})
