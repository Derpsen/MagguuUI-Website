/** Anonymous Web Vitals (RUM): validation + p75 aggregation. Pure, unit-tested. */

export const VITAL_METRICS = ['LCP', 'INP', 'CLS', 'TTFB'] as const
export type VitalMetric = typeof VITAL_METRICS[number]

/** Upper bounds that drop junk samples (ms; CLS is stored × 1000). */
const MAX_VALUE: Record<VitalMetric, number> = { LCP: 60_000, INP: 60_000, TTFB: 60_000, CLS: 10_000 }

export interface VitalSample { path: string, metric: VitalMetric, value: number }

/** Pathname only (no query/hash), public pages only, bounded length. */
export function normalizeVitalPath(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.length > 300) return null
  const path = raw.split(/[?#]/)[0] || '/'
  if (path.startsWith('/admin') || path.startsWith('/api') || path.startsWith('/_')) return null
  if (!/^\/[\w\-/.]*$/.test(path)) return null
  return path.length > 1 ? path.replace(/\/+$/, '') : path
}

/** Accepts `{ path, metrics: [{ name, value }] }`; at most 8 samples per beacon. */
export function parseVitalsBeacon(body: unknown): VitalSample[] {
  if (!body || typeof body !== 'object') return []
  const { path, metrics } = body as { path?: unknown, metrics?: unknown }
  const cleanPath = normalizeVitalPath(path)
  if (!cleanPath || !Array.isArray(metrics)) return []
  const out: VitalSample[] = []
  for (const m of metrics.slice(0, 8)) {
    if (!m || typeof m !== 'object') continue
    const name = (m as { name?: unknown }).name
    const value = (m as { value?: unknown }).value
    if (typeof name !== 'string' || !(VITAL_METRICS as readonly string[]).includes(name)) continue
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) continue
    const metric = name as VitalMetric
    const stored = Math.round(metric === 'CLS' ? value * 1000 : value)
    if (stored > MAX_VALUE[metric]) continue
    out.push({ path: cleanPath, metric, value: stored })
  }
  return out
}

/** Nearest-rank 75th percentile of a non-empty list. */
export function p75(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.max(0, Math.ceil(sorted.length * 0.75) - 1)]!
}

/** web.dev thresholds (good / needs improvement / poor). CLS in × 1000 units. */
export function vitalRating(metric: VitalMetric, value: number): 'good' | 'needs improvement' | 'poor' {
  const thresholds: Record<VitalMetric, [number, number]> = { LCP: [2500, 4000], INP: [200, 500], CLS: [100, 250], TTFB: [800, 1800] }
  const [good, poor] = thresholds[metric]
  return value <= good ? 'good' : value <= poor ? 'needs improvement' : 'poor'
}

export interface VitalRow { path: string, metric: VitalMetric, p75: number, samples: number, rating: string }

export function aggregateVitals(rows: Array<{ path: string, metric: string, value: number }>): VitalRow[] {
  const groups = new Map<string, number[]>()
  for (const r of rows) {
    const k = `${r.path}\u0000${r.metric}`
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(r.value)
  }
  const out: VitalRow[] = []
  for (const [k, values] of groups) {
    const [path, metric] = k.split('\u0000') as [string, VitalMetric]
    const v = p75(values)
    out.push({ path, metric, p75: v, samples: values.length, rating: vitalRating(metric, v) })
  }
  return out.sort((a, b) => a.path.localeCompare(b.path) || VITAL_METRICS.indexOf(a.metric) - VITAL_METRICS.indexOf(b.metric))
}
