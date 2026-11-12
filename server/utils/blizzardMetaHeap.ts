/**
 * In-process heap guard for the Meta nightly job. A breach aborts the run
 * with a named error so the caller can release the lock and leave the last
 * good snapshot in place, instead of letting the process OOM.
 */

import { getHeapStatistics } from 'node:v8'

export const META_HEAP_FRACTION = 0.85

export class MetaHeapGuardError extends Error {
  readonly heapUsed: number
  readonly heapLimit: number
  readonly fraction: number

  constructor(heapUsed: number, heapLimit: number, fraction: number) {
    const usedMb = (heapUsed / (1024 * 1024)).toFixed(1)
    const limitMb = (heapLimit / (1024 * 1024)).toFixed(1)
    super(`Meta nightly aborted: heap ${usedMb} MB reached ${Math.round(fraction * 100)}% of the ${limitMb} MB limit`)
    this.name = 'MetaHeapGuardError'
    this.heapUsed = heapUsed
    this.heapLimit = heapLimit
    this.fraction = fraction
  }
}

export type MetaHeapMonitor = {
  used: () => number
  limit: () => number
  fraction?: number
}

export function defaultMetaHeapLimitBytes(): number {
  const stats = getHeapStatistics()
  const fromEnv = Number(process.env.NUXT_META_HEAP_LIMIT_MB)
  if (Number.isFinite(fromEnv) && fromEnv > 0) {
    return Math.min(fromEnv * 1024 * 1024, stats.heap_size_limit)
  }
  return stats.heap_size_limit
}

export function defaultMetaHeapMonitor(): MetaHeapMonitor {
  return {
    used: () => process.memoryUsage().heapUsed,
    limit: defaultMetaHeapLimitBytes,
    fraction: META_HEAP_FRACTION,
  }
}

export function assertMetaHeapSafe(monitor: MetaHeapMonitor = defaultMetaHeapMonitor()): void {
  const limit = monitor.limit()
  const fraction = monitor.fraction ?? META_HEAP_FRACTION
  if (!(limit > 0) || !(fraction > 0 && fraction < 1)) return
  const used = monitor.used()
  if (used >= limit * fraction) throw new MetaHeapGuardError(used, limit, fraction)
}

export function isMetaHeapGuardError(error: unknown): error is MetaHeapGuardError {
  return error instanceof MetaHeapGuardError
}
