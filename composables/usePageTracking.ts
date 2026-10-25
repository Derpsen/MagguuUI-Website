/**
 * usePageTracking — anonymous page counting for public pages.
 *
 * Sends the route (path only, no query) once per navigation via sendBeacon, plus
 * the referrer host on the landing view. No cookies, no storage, no identifiers.
 * Skipped when Do-Not-Track / Global Privacy Control is on. Admin pages are never
 * sent; the server additionally ignores admin sessions, bots and unknown routes.
 */
import { sendCountBeacon } from '~/utils/beacon'
import { normalizeTrackedPath } from '~/utils/trackingRules'

export function usePageTracking() {
  const router = useRouter()
  if (import.meta.server) return

  let last = ''
  let landing = true

  function trackView(fullPath: string) {
    const path = normalizeTrackedPath(fullPath)
    if (!path || path === last) return
    last = path
    let referrer: string | null = null
    if (landing && document.referrer) {
      try {
        const host = new URL(document.referrer).hostname
        if (host && host !== location.hostname) referrer = host
      } catch { /* ignore */ }
    }
    landing = false
    sendCountBeacon('/api/v1/page-view', { path, referrer })
  }

  onMounted(() => trackView(router.currentRoute.value.fullPath))
  const off = router.afterEach(to => trackView(to.fullPath))
  onUnmounted(() => off())
}
