/**
 * Consent state for the cookie banner and the footer link (browser side).
 * Nothing is stored or sent before the visitor clicks. A choice is sent to POST /api/v1/consent, which sets the
 * consent cookie (and removes the session cookie on refusal); the page then reads the cookie back.
 * Do-Not-Track / Global Privacy Control count as a refusal: no banner, no capture.
 */
import { clientOptedOut } from '~/utils/beacon'
import { consentFromCookieHeader } from '~/utils/consent'

export function useConsent() {
  const enabled = useState<boolean>('visitorLog', () => false)
  /** null = no choice yet. */
  const choice = useState<boolean | null>('consent-stats', () => null)
  const open = useState('consent-open', () => false)
  const view = useState<'banner' | 'settings'>('consent-view', () => 'banner')
  const optedOut = useState('consent-optout', () => false)
  const busy = useState('consent-busy', () => false)
  const failed = useState('consent-failed', () => false)
  /** Bumped after every saved choice (page tracking reacts to it). */
  const revision = useState('consent-rev', () => 0)
  const reopened = useState('consent-reopened', () => false)

  function readCookie() {
    const c = consentFromCookieHeader(document.cookie)
    choice.value = c ? c.stats : null
    return c
  }

  /** Once after mount: decide whether the banner opens by itself. */
  function init(path: string) {
    if (!import.meta.client || !enabled.value) return
    optedOut.value = clientOptedOut()
    const c = readCookie()
    reopened.value = false
    open.value = !optedOut.value && !c && !path.startsWith('/admin')
    view.value = 'banner'
  }

  /** Footer link: reopen the banner (or, with a refusal signal, the short explanation). */
  function reopen() {
    if (!import.meta.client) return
    optedOut.value = clientOptedOut()
    readCookie()
    failed.value = false
    reopened.value = true
    view.value = 'banner'
    open.value = true
  }

  function close() {
    open.value = false
    view.value = 'banner'
  }

  async function save(stats: boolean) {
    if (!import.meta.client || busy.value) return
    busy.value = true
    failed.value = false
    try {
      const res = await fetch('/api/v1/consent', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ stats }),
        credentials: 'same-origin',
      })
      if (!res.ok) throw new Error(String(res.status))
      readCookie()
      revision.value++
      close()
    } catch {
      failed.value = true
    } finally {
      busy.value = false
    }
  }

  return { enabled, choice, open, view, optedOut, busy, failed, revision, reopened, init, reopen, close, save }
}
