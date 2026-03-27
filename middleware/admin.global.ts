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
  auth.hydrateFromStorage()

  if (auth.token.value && !auth.isTokenExpired()) {
    return
  }

  if (auth.token.value && auth.isTokenExpired()) {
    auth.clearSession()
  }

  const restored = await auth.restoreSession()
  if (!restored) {
    return navigateTo('/admin/login')
  }
})
