/**
 * useApi — Wrapper for authenticated API calls
 */

export function useApi() {
  /**
   * Fetch with same-origin cookie auth
   */
  async function apiFetch<T>(url: string, options: any = {}): Promise<T> {
    const response = await $fetch<{ success: boolean; data: T }>(url, {
      ...options,
      credentials: 'include',
    })

    return response.data
  }

  return { apiFetch }
}
