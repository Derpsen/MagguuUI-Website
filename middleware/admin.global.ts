/**
 * Admin Auth Guard — Global Middleware
 *
 * Protects all /admin/* routes (except /admin/login).
 * No SSR flash because admin routes render client-only (see nuxt.config).
 */

export default defineNuxtRouteMiddleware(async (to) => {
  // Only apply to admin routes
  if (!to.path.startsWith('/admin')) return
  if (to.path === '/admin/login') return

  // Only runs client-side (admin routes have ssr: false)
  if (import.meta.server) return

  const auth = useAuth()

  const token = localStorage.getItem('token')

  if (!token) {
    const restored = await auth.restoreSession()
    if (!restored) {
      return navigateTo('/admin/login')
    }
    return
  }

  // Validate token isn't expired
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('token')
      const restored = await auth.restoreSession()
      if (!restored) {
        return navigateTo('/admin/login')
      }
    }
  } catch {
    localStorage.removeItem('token')
    const restored = await auth.restoreSession()
    if (!restored) {
      return navigateTo('/admin/login')
    }
  }
})
