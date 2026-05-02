/**
 * API Response Helpers
 *
 * Consistent response format across all endpoints.
 */

/**
 * Success response
 */
export function apiSuccess<T>(data: T, meta?: Record<string, unknown>) {
  return {
    success: true as const,
    data,
    ...(meta ? { meta } : {}),
  }
}

/**
 * Error response — always throws. Returning `never` lets the compiler narrow
 * after a bare call so `apiError(...)` and `throw apiError(...)` are both safe.
 */
export function apiError(code: string, message: string, statusCode = 400): never {
  throw createError({
    statusCode,
    data: {
      success: false,
      error: { code, message },
    },
  })
}

