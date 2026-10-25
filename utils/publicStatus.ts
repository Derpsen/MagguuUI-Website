/**
 * Shared shape of the public status payload (GET /api/v1/status) and its labels.
 * This is the WHOLE public surface: anything not listed here is never exposed
 * (tests/unit/siteStatus.test.ts keeps a whitelist test on it).
 */

export type StatusState = 'operational' | 'degraded' | 'down'
export type StatusComponentId = 'website' | 'database' | 'content'

export interface StatusComponent {
  id: StatusComponentId
  name: string
  state: StatusState
  /** Short fixed phrase, no internals. */
  note: string | null
}

export interface StatusUptimeWindow {
  days: 1 | 7 | 30 | 90
  /** 0-100, rounded DOWN to two decimals so downtime is never rounded away. */
  percent: number
}

export type StatusNoticeKind = 'maintenance' | 'incident'
export type StatusNoticeStatus = 'scheduled' | 'in_progress' | 'monitoring' | 'resolved'

export const NOTICE_KINDS: readonly StatusNoticeKind[] = ['maintenance', 'incident']
export const NOTICE_STATUSES: readonly StatusNoticeStatus[] = ['scheduled', 'in_progress', 'monitoring', 'resolved']
export const NOTICE_COMPONENT_IDS: readonly StatusComponentId[] = ['website', 'database', 'content']

export const NOTICE_KIND_LABEL: Record<StatusNoticeKind, string> = { maintenance: 'Maintenance', incident: 'Incident' }
export const NOTICE_STATUS_LABEL: Record<StatusNoticeStatus, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  monitoring: 'Monitoring',
  resolved: 'Resolved',
}
export const NOTICE_COMPONENT_LABEL: Record<StatusComponentId, string> = {
  website: 'Website',
  database: 'Database',
  content: 'Data freshness',
}

/**
 * Allowed status moves. Incidents are never `scheduled`; a resolved notice can only be reopened.
 * Shared so the admin form offers exactly what the server accepts.
 */
const NOTICE_TRANSITIONS: Record<StatusNoticeStatus, StatusNoticeStatus[]> = {
  scheduled: ['in_progress', 'resolved'],
  in_progress: ['monitoring', 'resolved'],
  monitoring: ['in_progress', 'resolved'],
  resolved: ['in_progress'],
}
export const canTransition = (from: StatusNoticeStatus, to: StatusNoticeStatus): boolean =>
  NOTICE_TRANSITIONS[from]?.includes(to) ?? false
export const nextNoticeStatuses = (from: StatusNoticeStatus): StatusNoticeStatus[] => [...(NOTICE_TRANSITIONS[from] ?? [])]

/** One append-only timeline entry. `bodyHtml` is already sanitized (limited Markdown, no raw HTML). */
export interface StatusNoticeUpdate {
  at: string
  status: StatusNoticeStatus
  bodyHtml: string
}

/** Admin-written maintenance / incident notice (item B). Everything public is listed here. */
export interface StatusNotice {
  id: string
  kind: StatusNoticeKind
  status: StatusNoticeStatus
  title: string
  /** Sanitized HTML from limited Markdown; empty when the notice has no description. */
  bodyHtml: string
  component: StatusComponentId | null
  startsAt: string
  endsAt: string | null
  resolvedAt: string | null
  /** Oldest first. */
  updates: StatusNoticeUpdate[]
}

export interface PublicStatus {
  status: StatusState
  checkedAt: string
  components: StatusComponent[]
  uptime: { ready: boolean, windows: StatusUptimeWindow[], note: string }
  /** Scheduled and ongoing notices. */
  notices: StatusNotice[]
  /** Resolved notices of the last 90 days, newest first. */
  history: StatusNotice[]
}

export const STATUS_LABEL: Record<StatusState, string> = {
  operational: 'Operational',
  degraded: 'Degraded',
  down: 'Down',
}

const SEVERITY: Record<StatusState, number> = { operational: 0, degraded: 1, down: 2 }
export const worstState = (states: StatusState[]): StatusState =>
  states.reduce<StatusState>((worst, s) => SEVERITY[s] > SEVERITY[worst] ? s : worst, 'operational')

/** Deterministic (no locale/timezone), so SSR and hydration agree: "2026-10-25 04:12 UTC". */
export function formatStatusTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.toISOString().slice(0, 16).replace('T', ' ')} UTC`
}

export function formatPercent(percent: number): string {
  return `${percent.toFixed(2)}%`
}
