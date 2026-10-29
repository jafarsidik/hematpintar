import 'fake-indexeddb/auto'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const planState = vi.hoisted(() => ({
  plan: 'free' as 'free' | 'plus' | 'business',
}))

const analyticsTrack = vi.hoisted(() => vi.fn())

vi.mock('@/stores/entitlements', () => ({
  useEntitlementStore: () => planState,
}))

vi.mock('@/stores/analytics', () => ({
  useAnalyticsStore: () => ({ track: analyticsTrack }),
}))

import { db } from '@/lib/storage/db'
import { createSimulation } from '@/lib/storage/repository'
import { useSimulationStore } from './simulations'

const payload = {
  budget: 100000,
  items: [],
  baselineItems: [],
  alternativeItems: [],
  notes: 'Uji batas simulasi',
}

async function seed(count: number): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    const result = await createSimulation({
      moduleType: 'household',
      name: `Simulasi ${index + 1}`,
      payload,
    })
    expect(result.ok).toBe(true)
  }
}

beforeEach(async () => {
  setActivePinia(createPinia())
  planState.plan = 'free'
  analyticsTrack.mockReset()
  await db.simulations.clear()
})

describe('batas simulasi di store', () => {
  it('memblokir simulasi keenam pada paket Free tanpa menghapus data lama', async () => {
    await seed(5)
    const store = useSimulationStore()

    const result = await store.create({
      moduleType: 'household',
      name: 'Simulasi keenam',
      payload,
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.some((error) => error.code === 'BATAS_SIMULASI')).toBe(
        true,
      )
    }
    expect(await db.simulations.count()).toBe(5)
    expect(analyticsTrack).not.toHaveBeenCalled()
  })

  it('mengizinkan simulasi keenam pada paket Plus', async () => {
    planState.plan = 'plus'
    await seed(5)
    const store = useSimulationStore()

    const result = await store.create({
      moduleType: 'household',
      name: 'Simulasi keenam',
      payload,
    })

    expect(result.ok).toBe(true)
    expect(await db.simulations.count()).toBe(6)
    expect(analyticsTrack).toHaveBeenCalledWith(
      'simulation_saved',
      'household',
    )
  })

  it('mengizinkan banyak simulasi pada paket Bisnis', async () => {
    planState.plan = 'business'
    await seed(50)
    const store = useSimulationStore()

    const result = await store.create({
      moduleType: 'household',
      name: 'Simulasi kelima puluh satu',
      payload,
    })

    expect(result.ok).toBe(true)
    expect(await db.simulations.count()).toBe(51)
  })

  it('memblokir duplikasi saat batas tercapai tanpa mengubah jumlah data', async () => {
    await seed(5)
    const first = await db.simulations.toCollection().first()
    expect(first).toBeDefined()

    const store = useSimulationStore()
    const result = await store.duplicate(first!.id)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.some((error) => error.code === 'BATAS_SIMULASI')).toBe(
        true,
      )
    }
    expect(await db.simulations.count()).toBe(5)
  })
})
