/**
 * useApi — Wrapper for authenticated API calls
 */

export function useApi() {
  const { token } = useAuth()

  /**
   * Fetch with JWT auth header
   */
  async function apiFetch<T>(url: string, options: any = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers || {}),
    }

    if (token.value) {
      headers['Authorization'] = `Bearer ${token.value}`
    }

    const response = await $fetch<{ success: boolean; data: T }>(url, {
      ...options,
      headers,
    })

    return response.data
  }

  return { apiFetch }
}
