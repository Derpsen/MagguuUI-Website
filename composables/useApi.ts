/**
 * useApi — Wrapper for authenticated API calls
 */

import type { FetchOptions } from 'ofetch'

/**
 * Subset of FetchOptions accepted by apiFetch.
 * Excludes `credentials` (always set to 'include') and narrows `method` to
 * the HTTP verb literals that Nuxt's $fetch / nitropack actually accepts, so
 * the call-site spread is type-compatible.
 */
type ApiFetchOptions = Omit<FetchOptions, 'credentials' | 'method'> & {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'
}

export function useApi() {
  /**
   * Fetch with same-origin cookie auth
   */
  async function apiFetch<T>(url: string, options: ApiFetchOptions = {}): Promise<T> {
    const response = await $fetch<{ success: boolean; data: T; error?: { code?: string; message?: string } }>(url, {
      ...options,
      credentials: 'include',
    })

    if (!response?.success) {
      throw new Error(response?.error?.message || 'Request failed')
    }

    return response.data
  }

  return { apiFetch }
}
