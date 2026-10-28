import { describe, expect, it } from 'vitest'
import { fail, ok } from './result'

describe('Result', () => {
  it('membungkus nilai sukses', () => {
    expect(ok(42)).toEqual({ ok: true, value: 42 })
  })

  it('membungkus satu error', () => {
    const error = { field: 'harga', code: 'NEGATIF', message: 'Perbaiki harga.' }
    expect(fail(error)).toEqual({ ok: false, errors: [error] })
  })

  it('membungkus beberapa error', () => {
    const errors = [
      { field: 'a', code: 'A', message: 'Perbaiki a.' },
      { field: 'b', code: 'B', message: 'Perbaiki b.' },
    ]
    expect(fail(errors)).toEqual({ ok: false, errors })
  })
})
