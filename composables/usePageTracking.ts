/**
 * usePageTracking — page counting for public pages.
 *
 * 1. Anonymous counting (everyone): sends the route (path only, no query) once per navigation via sendBeacon,
 *    plus the referrer host on the landing view. No cookies, no storage, no identifiers.
 * 2. Detailed record (ONLY with statistics consent, and only while the server runs with NUXT_VISITOR_LOG), all
 *    first-party, to /api/v1/visitor-hit and /api/v1/visitor-event:
 *    - each visited route (the page sequence), the full referrer URL once, UTM parameters of the landing URL,
 *      screen size, language and time zone
 *    - when a page is left: seconds the page was visible (dwell) and the scroll depth as a milestone (0/25/50/75/100)
 *    - clicks on marked calls to action (`data-cta`), downloads and external links (utils/visitorSignals.ts: fixed
 *      kinds and short targets, never text typed or shown on the page)
 *    The server verifies the consent cookie itself; the check here only avoids pointless requests.
 * Both are skipped when Do-Not-Track / Global Privacy Control is on. Admin pages are never sent; the server
 * additionally ignores admin sessions, bots and unknown routes.
 */
import { sendCountBeacon } from '~/utils/beacon'
import { consentFromCookieHeader } from '~/utils/consent'
import { normalizeTrackedPath } from '~/utils/trackingRules'
import { classifyClick, pickUtm, scrollMilestone } from '~/utils/visitorSignals'

const MAX_CLICKS_PER_PAGE = 20

export function usePageTracking() {
  const router = useRouter()
  if (import.meta.server) return

  const enabled = useState<boolean>('visitorLog', () => false)
  const consent = useConsent()
  let last = ''
  let landing = true
  let detailReferrerSent = false
  let utmSent = false

  // dwell (visible time) and scroll depth of the page being viewed
  let visibleSince: number | null = null
  let visibleMs = 0
  let scrollMax = 0
  let clicks = 0
  let scrollTimer: ReturnType<typeof setTimeout> | null = null

  function statsConsent(): boolean {
    return enabled.value && consentFromCookieHeader(document.cookie)?.stats === true
  }

  function externalReferrer(): string | null {
    if (!document.referrer) return null
    try {
      return new URL(document.referrer).hostname !== location.hostname ? document.referrer.slice(0, 2048) : null
    } catch { return null }
  }

  function sendDetail(path: string) {
    if (!statsConsent()) return
    const referrerUrl = detailReferrerSent ? null : externalReferrer()
    detailReferrerSent = true
    const utm = utmSent ? {} : pickUtm(location.search)
    utmSent = true
    const env = { sw: screen.width, sh: screen.height, lang: navigator.language, tz: Intl.DateTimeFormat().resolvedOptions().timeZone }
    sendCountBeacon('/api/v1/visitor-hit', { path, referrerUrl, utm, env }, { credentials: true })
  }

  function resetPage() {
    visibleMs = 0
    scrollMax = 0
    clicks = 0
    visibleSince = document.visibilityState === 'visible' ? performance.now() : null
  }

  function pause() {
    if (visibleSince !== null) { visibleMs += performance.now() - visibleSince; visibleSince = null }
  }

  /** Report the page being left (or hidden): visible seconds since the last report and the scroll milestone. */
  function flush() {
    pause()
    const dwell = Math.round(visibleMs / 1000)
    visibleMs = 0
    if (document.visibilityState === 'visible') visibleSince = performance.now()
    if (!last || !statsConsent() || (dwell < 1 && scrollMax === 0)) return
    sendCountBeacon('/api/v1/visitor-event', { type: 'leave', path: last, dwell, scroll: scrollMax }, { credentials: true })
  }

  function measureScroll() {
    scrollTimer = null
    const doc = document.documentElement
    const room = doc.scrollHeight - window.innerHeight
    const percent = room <= 0 ? 100 : (window.scrollY / room) * 100
    scrollMax = Math.max(scrollMax, scrollMilestone(percent))
  }

  function onScroll() {
    if (scrollTimer === null) scrollTimer = setTimeout(measureScroll, 250)
  }

  function onVisibility() {
    if (document.visibilityState === 'hidden') { flush(); pause() } else if (visibleSince === null) visibleSince = performance.now()
  }

  function onClick(e: MouseEvent) {
    if (!last || clicks >= MAX_CLICKS_PER_PAGE || !statsConsent()) return
    const el = (e.target as Element | null)?.closest?.('[data-cta],a[href]')
    if (!el) return
    const c = classifyClick({ cta: el.getAttribute('data-cta'), href: el.getAttribute('href'), download: el.hasAttribute('download') }, location.origin)
    if (!c) return
    clicks++
    sendCountBeacon('/api/v1/visitor-event', { type: 'click', path: last, kind: c.kind, target: c.target }, { credentials: true })
  }

  function trackView(fullPath: string) {
    const path = normalizeTrackedPath(fullPath)
    if (!path || path === last) return
    flush() // the page before this one
    last = path
    resetPage()
    let referrer: string | null = null
    if (landing && document.referrer) {
      try {
        const host = new URL(document.referrer).hostname
        if (host && host !== location.hostname) referrer = host
      } catch { /* ignore */ }
    }
    landing = false
    sendCountBeacon('/api/v1/page-view', { path, referrer })
    sendDetail(path)
  }

  onMounted(() => {
    trackView(router.currentRoute.value.fullPath)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVisibility)
    document.addEventListener('click', onClick, true)
  })
  const off = router.afterEach(to => trackView(to.fullPath))
  // The visitor just said yes: the page they are on counts from now on (time before the answer is not counted).
  const stop = watch(() => consent.revision.value, () => { if (last) { resetPage(); sendDetail(last) } })
  onUnmounted(() => {
    off(); stop()
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('pagehide', flush)
    document.removeEventListener('visibilitychange', onVisibility)
    document.removeEventListener('click', onClick, true)
    if (scrollTimer !== null) clearTimeout(scrollTimer)
  })
}
