/**
 * useAuth - Client-side authentication
 *
 * Keeps token/user/session state centralized so login, middleware,
 * and passkey flows do not each reimplement localStorage handling.
 */

interface AuthUser {
  id: number
  username: string
  role: string
}

interface AuthSessionPayload {
  token?: string | null
  user?: AuthUser | null
  sessionId?: number | null
}

interface DecodedToken {
  exp?: number
  userId?: number
  username?: string
  role?: string
  sessionId?: number
}

const TOKEN_KEY = 'token'
const SESSION_KEY = 'sessionId'

function decodeTokenPayload(value: string): DecodedToken | null {
  try {
    const [, payload] = value.split('.')
    if (!payload) return null
    return JSON.parse(atob(payload)) as DecodedToken
  } catch {
    return null
  }
}

function readStoredToken() {
  if (import.meta.server) return null
  return localStorage.getItem(TOKEN_KEY)
}

function readStoredSessionId() {
  if (import.meta.server) return null

  const stored = localStorage.getItem(SESSION_KEY)
  if (!stored) return null

  const parsed = Number.parseInt(stored, 10)
  return Number.isFinite(parsed) ? parsed : null
}

function clearStoredSession() {
  if (import.meta.server) return
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(SESSION_KEY)
}

function persistSession(payload: AuthSessionPayload) {
  if (import.meta.server) return

  if (payload.token) {
    localStorage.setItem(TOKEN_KEY, payload.token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }

  if (payload.sessionId) {
    localStorage.setItem(SESSION_KEY, String(payload.sessionId))
  } else {
    localStorage.removeItem(SESSION_KEY)
  }
}

export function useAuth() {
  const token = useState<string | null>('auth-token', () => null)
  const user = useState<AuthUser | null>('auth-user', () => null)
  const sessionId = useState<number | null>('auth-session-id', () => null)
  const restoring = useState<boolean>('auth-restoring', () => false)
  const initialized = useState<boolean>('auth-initialized', () => false)

  function isTokenExpired(candidate: string | null = token.value): boolean {
    if (!candidate) return true

    const payload = decodeTokenPayload(candidate)
    if (!payload?.exp) return true

    return payload.exp * 1000 <= Date.now()
  }

  function setSession(payload: AuthSessionPayload) {
    token.value = payload.token ?? null
    user.value = payload.user ?? null
    sessionId.value = payload.sessionId ?? null
    persistSession(payload)
  }

  function clearSession() {
    token.value = null
    user.value = null
    sessionId.value = null
    clearStoredSession()
  }

  function hydrateFromStorage() {
    if (import.meta.server || initialized.value) return

    const storedToken = readStoredToken()
    if (!storedToken) {
      initialized.value = true
      return
    }

    if (isTokenExpired(storedToken)) {
      clearSession()
      initialized.value = true
      return
    }

    const payload = decodeTokenPayload(storedToken)
    if (!payload?.userId || !payload.username || !payload.role) {
      clearSession()
      initialized.value = true
      return
    }

    setSession({
      token: storedToken,
      user: {
        id: payload.userId,
        username: payload.username,
        role: payload.role,
      },
      sessionId: readStoredSessionId() ?? payload.sessionId ?? null,
    })
    initialized.value = true
  }

  if (import.meta.client) {
    hydrateFromStorage()
  }

  const isLoggedIn = computed(() => {
    if (token.value && !isTokenExpired()) return true
    return !!user.value
  })

  async function restoreSession() {
    if (import.meta.server || restoring.value) {
      return !!user.value
    }

    if (token.value && isTokenExpired()) {
      clearSession()
    }

    if (user.value && (!token.value || !isTokenExpired())) {
      return true
    }

    restoring.value = true

    try {
      const response = await $fetch<any>('/api/v1/admin/sessions/current', {
        credentials: 'include',
      })

      if (!response?.data?.user) return false

      setSession({
        token: token.value,
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

    if (!response?.data?.token) {
      throw new Error('Login failed')
    }

    setSession(response.data)
    return response.data
  }

  async function logout() {
    if (token.value || user.value) {
      try {
        await $fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: token.value ? { Authorization: `Bearer ${token.value}` } : undefined,
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
    token,
    user,
    sessionId,
    restoring,
    isLoggedIn,
    hydrateFromStorage,
    isTokenExpired,
    setSession,
    clearSession,
    restoreSession,
    login,
    logout,
  }
}
