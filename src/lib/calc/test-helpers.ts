import { expect } from 'vitest'
import type { Result } from './result'

export function expectOk<T>(result: Result<T>): T {
  if (!result.ok) {
    throw new Error(
      `Diharapkan ok, tetapi gagal: ${JSON.stringify(result.errors)}`,
    )
  }
  return result.value
}

export function expectErr<T>(result: Result<T>, code: string): void {
  expect(result.ok).toBe(false)
  if (result.ok) return
  expect(result.errors.map((error) => error.code)).toContain(code)
  for (const error of result.errors) {
    expect(error.field.length).toBeGreaterThan(0)
    expect(error.message.length).toBeGreaterThan(0)
  }
}
