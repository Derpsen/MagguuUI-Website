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

function apiErrorText(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined
  const record = body as { message?: unknown, error?: unknown, data?: unknown }
  if (record.error && typeof record.error === 'object') {
    const message = (record.error as { message?: unknown }).message
    if (typeof message === 'string' && message) return message
  }
  if (record.data && typeof record.data === 'object' && record.data !== body) {
    const nested = apiErrorText(record.data)
    if (nested) return nested
  }
  if (typeof record.message === 'string' && record.message && !isFetchStatusLine(record.message)) {
    return record.message
  }
  return undefined
}

function isFetchStatusLine(message: string) {
  return /^\[(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\]/.test(message)
}

export function errorMessage(err: unknown, fallback = 'Unknown error'): string {
  const e = asApiError(err)
  return (
    apiErrorText(e.data)
    || apiErrorText(e.response?._data)
    || (err instanceof Error && !isFetchStatusLine(err.message) ? err.message : undefined)
    || (e.message && !isFetchStatusLine(e.message) ? e.message : undefined)
    || fallback
  )
}
