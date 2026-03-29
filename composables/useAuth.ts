/**
 * useAuth - Client-side authentication
 *
 * Keeps user/session state centralized so login, middleware,
 * and passkey flows stay aligned around cookie-backed session restore.
 */

interface AuthUser {
  id: number
  username: string
  role: string
}

interface AuthSessionPayload {
  user?: AuthUser | null
  sessionId?: number | null
}

export function useAuth() {
  const user = useState<AuthUser | null>('auth-user', () => null)
  const sessionId = useState<number | null>('auth-session-id', () => null)
  const restoring = useState<boolean>('auth-restoring', () => false)
  const initialized = useState<boolean>('auth-initialized', () => false)

  function setSession(payload: AuthSessionPayload) {
    user.value = payload.user ?? null
    sessionId.value = payload.sessionId ?? null
  }

  function clearSession() {
    user.value = null
    sessionId.value = null
  }

  function hydrateFromStorage() {
    if (import.meta.server || initialized.value) return
    initialized.value = true
  }

  if (import.meta.client) {
    hydrateFromStorage()
  }

  const isLoggedIn = computed(() => !!user.value)

  async function restoreSession(force = false) {
    if (import.meta.server || restoring.value) {
      return !!user.value
    }

    if (!force && user.value) {
      return true
    }

    restoring.value = true

    try {
      const response = await $fetch<any>('/api/v1/admin/sessions/current', {
        credentials: 'include',
      })

      if (!response?.data?.user) return false

      setSession({
        user: response.data.user,
        sessionId: response.data.id || null,
      })
      return true
    } catch {
      clearSession()
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

    if (!response?.data?.user) {
      throw new Error('Login failed')
    }

    setSession({
      user: response.data.user,
      sessionId: response.data.sessionId ?? null,
    })
    return response.data
  }

  async function logout() {
    if (user.value) {
      try {
        await $fetch('/api/v1/auth/logout', {
          method: 'POST',
          credentials: 'include',
        })
      } catch {
        // Proceed with local logout even if the server call fails.
      }
    }

    clearSession()
    navigateTo('/admin/login')
  }

  return {
    user,
    sessionId,
    restoring,
    isLoggedIn,
    hydrateFromStorage,
    setSession,
    clearSession,
    restoreSession,
    login,
    logout,
  }
}
