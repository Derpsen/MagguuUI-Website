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
 * Error response
 */
export function apiError(code: string, message: string, statusCode = 400) {
  throw createError({
    statusCode,
    data: {
      success: false,
      error: { code, message },
    },
  })
}

