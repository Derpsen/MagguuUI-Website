/**
 * Tiny anonymous counting beacon (browser only). No cookies, no storage, no ids:
 * it sends a route or a copied item and nothing else. Skipped entirely when the
 * visitor sends Do-Not-Track or Global Privacy Control; the server checks too.
 */
import { isOptedOut } from '~/utils/trackingRules'

type Nav = Navigator & { globalPrivacyControl?: boolean, msDoNotTrack?: string }

export function clientOptedOut(): boolean {
  if (!import.meta.client) return true
  const nav = navigator as Nav
  const dnt = nav.doNotTrack ?? (window as unknown as { doNotTrack?: string }).doNotTrack ?? nav.msDoNotTrack
  return isOptedOut({ dnt, gpc: nav.globalPrivacyControl ? '1' : null })
}

export function sendCountBeacon(url: string, payload: Record<string, unknown>) {
  if (clientOptedOut()) return
  try {
    const body = JSON.stringify(payload)
    if (!navigator.sendBeacon?.(url, new Blob([body], { type: 'text/plain' }))) {
      void fetch(url, { method: 'POST', body, keepalive: true, credentials: 'omit' }).catch(() => {})
    }
  } catch { /* counting must never break the page */ }
}

/** One copy click on an import string (profile, WowUp collection or class layout). */
export function trackCopy(type: 'profile' | 'wowup' | 'layout' | 'community', id: number) {
  sendCountBeacon('/api/v1/copy-event', { stringType: type, stringId: id })
}
