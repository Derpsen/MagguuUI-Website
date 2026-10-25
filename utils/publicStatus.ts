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

/** Extension point for item B (admin-written notices). Plain text only. */
export interface StatusNotice {
  id: string
  kind: 'maintenance' | 'incident'
  title: string
  message: string
  startsAt: string
  endsAt: string | null
}

export interface PublicStatus {
  status: StatusState
  checkedAt: string
  components: StatusComponent[]
  uptime: { ready: boolean, windows: StatusUptimeWindow[], note: string }
  notices: StatusNotice[]
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
