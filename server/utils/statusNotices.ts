/**
 * Extension point for item B (admin-written maintenance / incident notices on /status).
 *
 * Nothing registers a source yet, so the page shows no notices. Item B adds its
 * own table + admin endpoints and calls `registerStatusNoticeSource(fn)` once
 * (e.g. from a Nitro plugin); `fn(nowSeconds)` returns the notices that are active
 * right now. Everything a source returns is passed through `toPublicNotice`, a
 * whitelist with length caps and plain text only (the page renders it as text), so
 * a source cannot leak extra columns. After an admin change, B calls
 * `clearPublicStatusCache()` (server/utils/siteStatus.ts) so it shows within seconds.
 */

import type { StatusNotice } from '../../utils/publicStatus'

export type StatusNoticeSource = (nowSeconds: number) => unknown[]

export const MAX_NOTICES = 5
const TITLE_MAX = 120
const MESSAGE_MAX = 600

const g = globalThis as unknown as { __statusNoticeSources?: StatusNoticeSource[] }
const sources: StatusNoticeSource[] = g.__statusNoticeSources ?? (g.__statusNoticeSources = [])

export function registerStatusNoticeSource(source: StatusNoticeSource): void {
  if (!sources.includes(source)) sources.push(source)
}

/** For tests. */
export function resetStatusNoticeSources(): void {
  sources.length = 0
}

const text = (v: unknown, max: number): string =>
  typeof v === 'string' ? [...v].map(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127 ? ' ' : c).join('').replace(/ {2,}/g, ' ').trim().slice(0, max) : ''

function isoOrNull(v: unknown): string | null {
  if (typeof v !== 'string' && typeof v !== 'number' && !(v instanceof Date)) return null
  const d = new Date(typeof v === 'number' && v < 1e11 ? v * 1000 : v)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

/** Keeps only the public fields; returns null for anything malformed. */
export function toPublicNotice(raw: unknown): StatusNotice | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const kind = r.kind === 'maintenance' || r.kind === 'incident' ? r.kind : null
  const id = text(r.id, 40)
  const title = text(r.title, TITLE_MAX)
  const startsAt = isoOrNull(r.startsAt)
  if (!kind || !id || !title || !startsAt) return null
  return { id, kind, title, message: text(r.message, MESSAGE_MAX), startsAt, endsAt: isoOrNull(r.endsAt) }
}

export function listActiveStatusNotices(nowSeconds: number): StatusNotice[] {
  const out: StatusNotice[] = []
  for (const source of sources) {
    try {
      for (const raw of source(nowSeconds)) {
        const notice = toPublicNotice(raw)
        if (notice) out.push(notice)
      }
    } catch { /* a broken source must never break the status page */ }
  }
  return out.sort((a, b) => b.startsAt.localeCompare(a.startsAt)).slice(0, MAX_NOTICES)
}
