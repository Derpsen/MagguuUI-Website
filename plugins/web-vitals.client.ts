/**
 * Anonymous real-user Web Vitals → first-party /api/v1/vitals.
 * Loads `web-vitals` lazily after the page is idle, public pages only, and
 * flushes once when the page is hidden (sendBeacon, no cookies needed).
 * Only path, metric name and value are sent: no cookie, no id, no IP or user
 * agent storage, which is why it belongs with the anonymous counter. Do-Not-Track
 * and Global Privacy Control are honoured here as well (the server checks too).
 */
import { clientOptedOut } from '~/utils/beacon'
import { normalizeTrackedPath } from '~/utils/trackingRules'

export default defineNuxtPlugin(() => {
  if (import.meta.dev) return
  if (clientOptedOut()) return
  const router = useRouter()
  const path = normalizeTrackedPath(router.currentRoute.value.path)
  if (!path) return

  const queue: Array<{ name: string, value: number }> = []
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

  // Flush listeners are registered immediately. If web-vitals is already loaded,
  // defer the send so its own hidden-page callbacks can queue the final values
  // first (those listeners are added later, when the idle import resolves).
  const flushAfterVitals = () => { setTimeout(flush, 0) }
  addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushAfterVitals() })
  addEventListener('pagehide', flushAfterVitals)
  // Vitals describe the landing page; later SPA navigations are not measured.
  router.afterEach(() => { flush() })

  const start = () => {
    void import('web-vitals').then(({ onLCP, onINP, onCLS, onTTFB }) => {
      const push = (m: { name: string, value: number }) => { queue.push({ name: m.name, value: m.value }) }
      onLCP(push)
      onINP(push)
      onCLS(push)
      onTTFB(push)
    }).catch(() => {})
  }
  // Only the library import is deferred. A short rIC timeout forced this work
  // while Lighthouse was still in the TBT window (the 4 s deadline became a
  // 400 ms+ long task on /meta).
  if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 15000 })
  else setTimeout(start, 10000)
})
