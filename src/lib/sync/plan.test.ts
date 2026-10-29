import { describe, expect, it } from 'vitest'
import type { VersionedRecord } from './plan'
import { planRestore, planUpload } from './plan'

function record(id: string, updatedAt: string): VersionedRecord {
  return { id, updatedAt }
}

describe('planUpload', () => {
  it('mengunggah data lokal yang belum ada di akun', () => {
    const plan = planUpload([record('a', '2026-01-02T00:00:00.000Z')], [])

    expect(plan.toApply.map((item) => item.id)).toEqual(['a'])
    expect(plan.conflicts).toEqual([])
    expect(plan.upToDate).toBe(0)
  })

  it('mengunggah versi lokal yang lebih baru dan menandainya berbeda', () => {
    const plan = planUpload(
      [record('a', '2026-01-02T00:00:00.000Z')],
      [record('a', '2026-01-01T00:00:00.000Z')],
    )

    expect(plan.toApply.map((item) => item.id)).toEqual(['a'])
    expect(plan.conflicts.map((item) => item.id)).toEqual(['a'])
  })

  it('menandai konflik bila versi akun lebih baru', () => {
    const plan = planUpload(
      [record('a', '2026-01-01T00:00:00.000Z')],
      [record('a', '2026-01-02T00:00:00.000Z')],
    )

    expect(plan.toApply).toEqual([])
    expect(plan.conflicts.map((item) => item.id)).toEqual(['a'])
  })

  it('melewati data yang sama persis dan tidak mengunggah data akun saja', () => {
    const plan = planUpload(
      [record('a', '2026-01-02T00:00:00.000Z')],
      [
        record('a', '2026-01-02T00:00:00.000Z'),
        record('b', '2026-01-02T00:00:00.000Z'),
      ],
    )

    expect(plan.toApply).toEqual([])
    expect(plan.conflicts).toEqual([])
    expect(plan.upToDate).toBe(1)
  })

  it('menandai timestamp tidak valid sebagai konflik', () => {
    const plan = planUpload(
      [record('a', 'bukan-tanggal')],
      [record('a', '2026-01-02T00:00:00.000Z')],
    )

    expect(plan.toApply).toEqual([])
    expect(plan.conflicts.map((item) => item.id)).toEqual(['a'])
  })
})

describe('planRestore', () => {
  it('mengunduh data akun yang belum ada di perangkat', () => {
    const plan = planRestore([], [record('a', '2026-01-02T00:00:00.000Z')])

    expect(plan.toApply.map((item) => item.id)).toEqual(['a'])
    expect(plan.conflicts).toEqual([])
    expect(plan.upToDate).toBe(0)
  })

  it('mengunduh versi akun yang lebih baru dan menandainya berbeda', () => {
    const plan = planRestore(
      [record('a', '2026-01-01T00:00:00.000Z')],
      [record('a', '2026-01-02T00:00:00.000Z')],
    )

    expect(plan.toApply.map((item) => item.id)).toEqual(['a'])
    expect(plan.conflicts.map((item) => item.id)).toEqual(['a'])
  })

  it('mempertahankan data lokal yang lebih baru dan menandainya konflik', () => {
    const plan = planRestore(
      [record('a', '2026-01-02T00:00:00.000Z')],
      [record('a', '2026-01-01T00:00:00.000Z')],
    )

    expect(plan.toApply).toEqual([])
    expect(plan.conflicts.map((item) => item.id)).toEqual(['a'])
  })

  it('tidak menghapus data lokal yang tidak ada di akun', () => {
    const plan = planRestore(
      [record('local-only', '2026-01-02T00:00:00.000Z')],
      [],
    )

    expect(plan.toApply).toEqual([])
    expect(plan.conflicts).toEqual([])
    expect(plan.upToDate).toBe(0)
  })

  it('melewati data yang sama persis', () => {
    const plan = planRestore(
      [record('a', '2026-01-02T00:00:00.000Z')],
      [record('a', '2026-01-02T00:00:00.000Z')],
    )

    expect(plan.toApply).toEqual([])
    expect(plan.conflicts).toEqual([])
    expect(plan.upToDate).toBe(1)
  })
})
