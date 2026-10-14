/**
 * Anonymous real-user Web Vitals → first-party /api/v1/vitals.
 * Loads `web-vitals` lazily after the page is idle, public pages only, and
 * flushes once when the page is hidden (sendBeacon, no cookies needed).
 */
export default defineNuxtPlugin(() => {
  if (import.meta.dev) return
  const router = useRouter()
  if (router.currentRoute.value.path.startsWith('/admin')) return

  const queue: Array<{ name: string, value: number }> = []
  const path = router.currentRoute.value.path
  let sent = false

  function flush() {
    if (sent || queue.length === 0) return
    sent = true
    const body = JSON.stringify({ path, metrics: queue.splice(0, 8) })
    try {
      if (!navigator.sendBeacon?.('/api/v1/vitals', new Blob([body], { type: 'text/plain' }))) {
        void fetch('/api/v1/vitals', { method: 'POST', body, keepalive: true, credentials: 'omit' })
      }
    } catch { /* never break the page */ }
  }

  const start = () => {
    void import('web-vitals').then(({ onLCP, onINP, onCLS, onTTFB }) => {
      const push = (m: { name: string, value: number }) => { queue.push({ name: m.name, value: m.value }) }
      onLCP(push)
      onINP(push)
      onCLS(push)
      onTTFB(push)
      // Registered after web-vitals' own listeners, so final LCP/CLS/INP values
      // are queued before this flush runs.
      addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush() })
      addEventListener('pagehide', flush)
    }).catch(() => {})
  }
  // Vitals describe the landing page; later SPA navigations are not measured.
  router.afterEach(() => { flush() })
  if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 4000 })
  else setTimeout(start, 2000)
})
