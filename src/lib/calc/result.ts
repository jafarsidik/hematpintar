export interface ValidationError {
  field: string
  code: string
  message: string
}

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; errors: ValidationError[] }

export function ok<T>(value: T): Result<T> {
  return { ok: true, value }
}

export function fail<T = never>(
  errors: ValidationError | ValidationError[],
): Result<T> {
  return { ok: false, errors: Array.isArray(errors) ? errors : [errors] }
}
