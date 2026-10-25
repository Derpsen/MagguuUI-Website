/**
 * Extra signals of the consent-only visitor log, shared by the browser collector and the server (pure, unit tested).
 * Nothing here captures free text: every value is a number, a short code from a fixed list, a host name or a
 * sanitized query value of a fixed set of keys. The server validates everything again.
 */

export const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const
export type UtmKey = typeof UTM_KEYS[number]
export type Utm = Partial<Record<UtmKey, string>>
export const UTM_MAX = 100

/** Call-to-action markers: elements carry `data-cta="<id>"`; only these ids are ever recorded. */
export const CTA_IDS = ['header-setup', 'hero-setup', 'footer-contact', 'submit-preset'] as const
/** File types counted as a download (extension of the link path). */
export const DOWNLOAD_EXTENSIONS = ['zip', 'exe', 'msi', 'dmg', 'pdf', 'lua', 'json', 'txt', 'csv', 'tar', 'gz', '7z', 'rar'] as const
export const SCROLL_MILESTONES = [0, 25, 50, 75, 100] as const
export const DWELL_MAX_S = 3600
export const CLICK_KINDS = ['cta', 'external', 'download'] as const
export type ClickKind = typeof CLICK_KINDS[number]

// eslint-disable-next-line no-control-regex -- stripping control characters is the point
const CONTROL = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069\ufeff]/g

/** Query value as kept: control and invisible characters removed, trimmed, capped. Null when nothing is left. */
export function cleanText(value: unknown, max = UTM_MAX): string | null {
  if (typeof value !== 'string') return null
  const t = value.replace(CONTROL, '').trim().slice(0, max)
  return t || null
}

/** The five utm_* values of a query string or an object; unknown keys are dropped. */
export function pickUtm(input: unknown): Utm {
  const out: Utm = {}
  let get: (k: string) => unknown
  if (typeof input === 'string') {
    let params: URLSearchParams
    try { params = new URLSearchParams(input.startsWith('?') ? input : `?${input}`) } catch { return out }
    get = k => params.get(k)
  } else if (input && typeof input === 'object' && !Array.isArray(input)) {
    get = k => (input as Record<string, unknown>)[k]
  } else return out
  for (const key of UTM_KEYS) {
    const v = cleanText(get(key))
    if (v) out[key] = v
  }
  return out
}

export interface DeviceEnv { screenW: number | null, screenH: number | null, language: string | null, timezone: string | null }

const intIn = (v: unknown, lo: number, hi: number) => (typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi ? v : null)

/** Screen size, browser language and time zone as reported by the page, validated by shape. */
export function cleanEnv(input: unknown): DeviceEnv {
  const o = input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : {}
  const language = typeof o.lang === 'string' && o.lang.length <= 35 && /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8}){0,3}$/.test(o.lang) ? o.lang : null
  const timezone = typeof o.tz === 'string' && o.tz.length <= 64 && /^[A-Za-z][A-Za-z0-9_+-]*(\/[A-Za-z0-9_+-]+){0,2}$/.test(o.tz) ? o.tz : null
  return { screenW: intIn(o.sw, 1, 20000), screenH: intIn(o.sh, 1, 20000), language, timezone }
}

/** Scroll depth reported as a milestone: 0, 25, 50, 75 or 100. */
export function scrollMilestone(percent: number): number {
  if (!Number.isFinite(percent) || percent < 25) return 0
  if (percent >= 98) return 100
  return percent >= 75 ? 75 : percent >= 50 ? 50 : 25
}

export interface ClickInput { cta?: string | null, href?: string | null, download?: boolean }

/**
 * What a click on a link or marked element is, or null when it is not worth recording. A CTA must carry a known id;
 * an external link is stored as its host name only; a download as its file name (letters, digits, . _ -).
 */
export function classifyClick(input: ClickInput, origin: string): { kind: ClickKind, target: string } | null {
  if (input.cta) return (CTA_IDS as readonly string[]).includes(input.cta) ? { kind: 'cta', target: input.cta } : null
  if (!input.href) return null
  let url: URL
  try { url = new URL(input.href, origin) } catch { return null }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  const file = decodeURIComponentSafe(url.pathname.split('/').pop() ?? '')
  const ext = file.includes('.') ? file.split('.').pop()!.toLowerCase() : ''
  const sameOrigin = url.origin === origin
  if ((input.download || (DOWNLOAD_EXTENSIONS as readonly string[]).includes(ext)) && /^[A-Za-z0-9._-]{1,100}$/.test(file)) return { kind: 'download', target: file }
  if (!sameOrigin) return { kind: 'external', target: url.hostname.toLowerCase().slice(0, 100) }
  return null
}

function decodeURIComponentSafe(s: string): string {
  try { return decodeURIComponent(s) } catch { return s }
}

/** Server-side check of a click as received: kind and target must match what classifyClick can produce. */
export function validClick(kind: unknown, target: unknown): { kind: ClickKind, target: string } | null {
  if (typeof kind !== 'string' || typeof target !== 'string') return null
  if (kind === 'cta') return (CTA_IDS as readonly string[]).includes(target) ? { kind, target } : null
  if (kind === 'external') return target.length <= 100 && /^[a-z0-9.-]+$/.test(target) && target.includes('.') ? { kind, target } : null
  if (kind === 'download') return /^[A-Za-z0-9._-]{1,100}$/.test(target) ? { kind, target } : null
  return null
}

/** Seconds on a page, whole and bounded; null for junk. */
export function cleanDwell(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.min(DWELL_MAX_S, Math.round(v)) : null
}
