/**
 * Admin Auth Guard — Global Middleware
 *
 * Protects all /admin/* routes (except /admin/login).
 * No SSR flash because admin routes render client-only (see nuxt.config).
 */

export default defineNuxtRouteMiddleware((to) => {
  // Only apply to admin routes
  if (!to.path.startsWith('/admin')) return
  if (to.path === '/admin/login') return

  // Only runs client-side (admin routes have ssr: false)
  if (import.meta.server) return

  const token = localStorage.getItem('token')

  if (!token) {
    return navigateTo('/admin/login')
  }

  // Validate token isn't expired
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('token')
      return navigateTo('/admin/login')
    }
  } catch {
    localStorage.removeItem('token')
    return navigateTo('/admin/login')
  }
})
