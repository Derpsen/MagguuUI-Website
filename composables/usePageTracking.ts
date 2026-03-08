/**
 * usePageTracking — Automatic anonymous page view tracking
 *
 * Fires on every client-side route change (public pages only).
 * Sends path + referrer to /api/v1/page-view.
 * Does NOT track admin pages or duplicate navigations.
 */

export function usePageTracking() {
  const router = useRouter()

  // Only run on client
  if (import.meta.server) return

  // Track initial page load
  onMounted(() => {
    trackView(router.currentRoute.value.fullPath)
  })

  // Track client-side navigation
  router.afterEach((to) => {
    trackView(to.fullPath)
  })
}

function trackView(path: string) {
  // Skip admin pages
  if (path.startsWith('/admin')) return

  // Fire-and-forget — never block rendering
  try {
    $fetch('/api/v1/page-view', {
      method: 'POST',
      body: {
        path,
        referrer: document.referrer || null,
      },
    }).catch(() => { /* silent */ })
  } catch { /* silent */ }
}
