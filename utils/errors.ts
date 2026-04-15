/**
 * Shared helpers for narrowing unknown errors from $fetch / apiFetch.
 *
 * Ofetch throws FetchError with `response.status`, `data.message`,
 * `data.error.message`. A Nitro createError throws with `.statusCode` +
 * `.data.message`. Browser APIs (WebAuthn) throw DOMException with `.name`.
 * One shape covers all three without the `as any` escape hatch.
 */

export interface ApiErrorShape {
  response?: { status?: number, _data?: { message?: string, error?: { message?: string } } }
  data?: { message?: string, error?: { message?: string } }
  status?: number
  statusCode?: number
  message?: string
  name?: string
}

export function asApiError(err: unknown): ApiErrorShape {
  return (err ?? {}) as ApiErrorShape
}

export function errorStatus(err: unknown): number | undefined {
  const e = asApiError(err)
  return e.response?.status ?? e.statusCode ?? e.status
}

export function errorMessage(err: unknown, fallback = 'Unknown error'): string {
  const e = asApiError(err)
  return (
    e.data?.message
    || e.data?.error?.message
    || e.response?._data?.message
    || e.response?._data?.error?.message
    || (err instanceof Error ? err.message : undefined)
    || e.message
    || fallback
  )
}
