/**
 * useAuth — Client-side authentication
 *
 * Manages JWT token + sessionId in localStorage.
 * Supports server-side logout (session revocation).
 * Used by admin pages and middleware.
 */

export function useAuth() {
  const token = useState<string | null>('auth-token', () => null)
  const user = useState<{ id: number; username: string; role: string } | null>('auth-user', () => null)
  const sessionId = useState<number | null>('auth-session-id', () => null)
  const restoring = useState<boolean>('auth-restoring', () => false)

  // Initialize from localStorage
  if (import.meta.client) {
    const stored = localStorage.getItem('token')
    const storedSessionId = localStorage.getItem('sessionId')
    if (stored) {
      // Validate token isn't expired
      try {
        const payload = JSON.parse(atob(stored.split('.')[1]))
        if (payload.exp * 1000 > Date.now()) {
          token.value = stored
          user.value = { id: payload.userId, username: payload.username, role: payload.role }
          sessionId.value = storedSessionId ? parseInt(storedSessionId) : (payload.sessionId || null)
        } else {
          localStorage.removeItem('token')
          localStorage.removeItem('sessionId')
        }
      } catch {
        localStorage.removeItem('token')
        localStorage.removeItem('sessionId')
      }
    }
  }

  const isLoggedIn = computed(() => !!token.value || !!user.value)

  async function restoreSession() {
    if (import.meta.server || restoring.value || user.value) {
      return !!user.value
    }

    restoring.value = true

    try {
      const response = await $fetch<any>('/api/v1/admin/sessions/current', {
        credentials: 'include',
      })

      if (!response?.data?.user) return false

      user.value = response.data.user
      sessionId.value = response.data.id || null
      return true
    } catch {
      return false
    } finally {
      restoring.value = false
    }
  }

  async function login(username: string, password: string) {
    const response = await $fetch<any>('/api/v1/auth/login', {
      method: 'POST',
      body: { username, password },
      credentials: 'include',
    })

    if (!response?.data?.token) {
      throw new Error('Login failed')
    }

    token.value = response.data.token
    user.value = response.data.user
    sessionId.value = response.data.sessionId || null

    if (import.meta.client) {
      localStorage.setItem('token', response.data.token)
      if (response.data.sessionId) {
        localStorage.setItem('sessionId', String(response.data.sessionId))
      }
    }

    return response.data
  }

  async function logout() {
    // Call server-side logout to revoke session
    if (token.value || user.value) {
      try {
        await $fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: token.value ? { Authorization: `Bearer ${token.value}` } : undefined,
          credentials: 'include',
        })
      } catch {
        // Proceed with local logout even if server call fails
      }
    }

    token.value = null
    user.value = null
    sessionId.value = null
    if (import.meta.client) {
      localStorage.removeItem('token')
      localStorage.removeItem('sessionId')
    }
    navigateTo('/admin/login')
  }

  return { token, user, sessionId, restoring, isLoggedIn, restoreSession, login, logout }
}
