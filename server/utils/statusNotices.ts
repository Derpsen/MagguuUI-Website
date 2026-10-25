/**
 * Notice registry for the public /status page (item B).
 *
 * `server/plugins/status-notices.ts` registers the database source
 * (server/utils/statusNoticeStore.ts `publicNoticeRows`); other sources could be added
 * the same way: `fn(nowSeconds)` returns raw notices, scheduled/ongoing ones and recently
 * resolved ones together. Everything a source returns is passed through `toPublicNotice`,
 * the WHITELIST: fixed fields only, length caps, Markdown rendered through the limited
 * sanitizer (utils/noticeMarkdown.ts). A source can therefore never leak extra columns or
 * raw HTML. After an admin change, handlers call `clearPublicStatusCache()`
 * (server/utils/siteStatus.ts) so the page shows it within seconds.
 */

import { NOTICE_COMPONENT_IDS, NOTICE_KINDS, NOTICE_STATUSES } from '../../utils/publicStatus'
import type { StatusNotice, StatusNoticeKind, StatusNoticeStatus, StatusNoticeUpdate } from '../../utils/publicStatus'
import { renderNoticeMarkdown } from '../../utils/noticeMarkdown'

export type StatusNoticeSource = (nowSeconds: number) => unknown[]

/** Scheduled + ongoing notices shown at the top. */
export const MAX_NOTICES = 10
/** Resolved notices shown in the history list. */
export const MAX_HISTORY = 25
export const PUBLIC_UPDATES_MAX = 30
const TITLE_MAX = 120
const BODY_MAX = 2000
const UPDATE_MAX = 1000
export const HISTORY_WINDOW_DAYS = 90

const g = globalThis as unknown as { __statusNoticeSources?: StatusNoticeSource[] }
const sources: StatusNoticeSource[] = g.__statusNoticeSources ?? (g.__statusNoticeSources = [])

export function registerStatusNoticeSource(source: StatusNoticeSource): void {
  if (!sources.includes(source)) sources.push(source)
}

/** For tests. */
export function resetStatusNoticeSources(): void {
  sources.length = 0
}

const clean = (v: unknown, max: number, keepNewlines = false): string =>
  typeof v === 'string'
    ? [...v].map((c) => {
        const n = c.charCodeAt(0)
        if (keepNewlines && (c === '\n' || c === '\t')) return c
        return n < 32 || n === 127 ? ' ' : c
      }).join('').trim().slice(0, max)
    : ''

const oneLine = (v: unknown, max: number) => clean(v, max).replace(/ {2,}/g, ' ')

function isoOrNull(v: unknown): string | null {
  if (typeof v !== 'string' && typeof v !== 'number' && !(v instanceof Date)) return null
  const d = new Date(typeof v === 'number' && v < 1e11 ? v * 1000 : v)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

const oneOf = <T extends string>(v: unknown, list: readonly T[]): T | null =>
  typeof v === 'string' && (list as readonly string[]).includes(v) ? v as T : null

function toPublicUpdate(raw: unknown): StatusNoticeUpdate | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const at = isoOrNull(r.at)
  const status = oneOf<StatusNoticeStatus>(r.status, NOTICE_STATUSES)
  if (!at || !status) return null
  return { at, status, bodyHtml: renderNoticeMarkdown(clean(r.body, UPDATE_MAX, true)) }
}

/** Keeps only the public fields; returns null for anything malformed. */
export function toPublicNotice(raw: unknown): StatusNotice | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const kind = oneOf<StatusNoticeKind>(r.kind, NOTICE_KINDS)
  const status = oneOf<StatusNoticeStatus>(r.status ?? 'in_progress', NOTICE_STATUSES)
  const id = oneLine(typeof r.id === 'number' && Number.isSafeInteger(r.id) ? String(r.id) : r.id, 40)
  const title = oneLine(r.title, TITLE_MAX)
  const startsAt = isoOrNull(r.startsAt)
  if (!kind || !status || !id || !title || !startsAt) return null
  const resolvedAt = isoOrNull(r.resolvedAt)
  if (status === 'resolved' && !resolvedAt) return null
  const updates = (Array.isArray(r.updates) ? r.updates : [])
    .map(toPublicUpdate)
    .filter((u): u is StatusNoticeUpdate => u !== null)
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(-PUBLIC_UPDATES_MAX)
  return {
    id,
    kind,
    status,
    title,
    bodyHtml: renderNoticeMarkdown(clean(r.body, BODY_MAX, true)),
    component: oneOf(r.component, NOTICE_COMPONENT_IDS),
    startsAt,
    endsAt: isoOrNull(r.endsAt),
    resolvedAt: status === 'resolved' ? resolvedAt : null,
    updates,
  }
}

function collect(nowSeconds: number): StatusNotice[] {
  const out: StatusNotice[] = []
  const seen = new Set<string>()
  for (const source of sources) {
    try {
      for (const raw of source(nowSeconds)) {
        const notice = toPublicNotice(raw)
        if (notice && !seen.has(notice.id)) {
          seen.add(notice.id)
          out.push(notice)
        }
      }
    } catch { /* a broken source must never break the status page */ }
  }
  return out
}

// Ongoing incident, ongoing maintenance, then what is scheduled.
const rank = (n: StatusNotice) => n.status === 'scheduled' ? 2 : n.kind === 'incident' ? 0 : 1

/** Scheduled and ongoing notices: ongoing first (newest start first), then upcoming (soonest first). */
export function listActiveStatusNotices(nowSeconds: number): StatusNotice[] {
  return collect(nowSeconds)
    .filter(n => n.status !== 'resolved')
    .sort((a, b) => rank(a) - rank(b) || (a.status === 'scheduled' ? a.startsAt.localeCompare(b.startsAt) : b.startsAt.localeCompare(a.startsAt)))
    .slice(0, MAX_NOTICES)
}

/** Resolved notices of the last 90 days, newest resolution first. */
export function listStatusHistory(nowSeconds: number): StatusNotice[] {
  const cutoff = new Date((nowSeconds - HISTORY_WINDOW_DAYS * 86400) * 1000).toISOString()
  return collect(nowSeconds)
    .filter(n => n.status === 'resolved' && n.resolvedAt !== null && n.resolvedAt >= cutoff)
    .sort((a, b) => (b.resolvedAt ?? '').localeCompare(a.resolvedAt ?? ''))
    .slice(0, MAX_HISTORY)
}
