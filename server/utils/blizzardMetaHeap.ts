/**
 * In-process heap guard for the Meta nightly job. A breach aborts the run
 * with a named error so the caller can release the lock and leave the last
 * good snapshot in place, instead of letting the process OOM.
 * The comparison uses this process's `process.memoryUsage().heapUsed` only,
 * never cgroup / container `memory.current`, RSS, or `external`. The ceiling prefers the process `--max-old-space-size` when set. The trip fraction is 70% for a CLI-sized old-space (≤ 512 MB) and 85% for the website process (640 MB cap), so the in-process nightly does not abort at ~448 MB.
 */

import { getHeapStatistics } from 'node:v8'

/** CLI / tight old-space trip fraction (70% of a 256 MB cap is 179 MB). */
export const META_HEAP_FRACTION = 0.70
/** Website / large old-space trip fraction (85% of a 640 MB cap is 544 MB). */
export const META_HEAP_FRACTION_SERVER = 0.85
/** Old-space sizes at or below this use the tighter CLI fraction. */
export const META_HEAP_CLI_OLD_SPACE_MAX_MB = 512

const MAX_OLD_SPACE_VALUE = /^--max[-_]old[-_]space[-_]size=(\d+)$/
const MAX_OLD_SPACE_IN_OPTIONS = /--max[-_]old[-_]space[-_]size=(\d+)/g

/** Prefer execArgv (what this process actually started with), then NODE_OPTIONS. Accepts the underscore spelling too. */
export function readMaxOldSpaceSizeMb(
  execArgv: readonly string[] = process.execArgv,
  nodeOptions: string = process.env.NODE_OPTIONS || '',
): number | null {
  let found: number | null = null
  for (const arg of execArgv) {
    const match = arg.match(MAX_OLD_SPACE_VALUE)
    if (match) found = Number(match[1])
  }
  if (found != null && Number.isFinite(found) && found > 0) return found
  for (const match of nodeOptions.matchAll(MAX_OLD_SPACE_IN_OPTIONS)) {
    found = Number(match[1])
  }
  return found != null && Number.isFinite(found) && found > 0 ? found : null
}


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

export type ProcessMetaMemory = {
  rss: number
  heapUsed: number
}

/**
 * Process-local memory only. Do not read /sys/fs/cgroup/memory.current:
 * that is the whole container (website + CLI) and is not a heapUsed value.
 */
export function readProcessMetaMemory(): ProcessMetaMemory {
  const usage = process.memoryUsage()
  return { rss: usage.rss, heapUsed: usage.heapUsed }
}

export type MetaHeapMonitor = {
  used: () => number
  limit: () => number
  fraction?: number
}

/**
 * Effective guard ceiling: the smaller of V8 heap_size_limit, an explicit
 * NUXT_META_HEAP_LIMIT_MB, and the process --max-old-space-size (hyphen or
 * underscore form, execArgv first, then NODE_OPTIONS). The default fraction
 * The default fraction is 70% of this ceiling on a CLI-sized old-space,
 * and 85% in the website process, so the in-process nightly is not tripped
 * at ~448 MB (70% of 640). The job still aborts before V8 starts
 * ineffective mark-compacts near the cap.
 */
export function defaultMetaHeapLimitBytes(
  env: NodeJS.ProcessEnv = process.env,
  execArgv: readonly string[] = process.execArgv,
): number {
  const stats = getHeapStatistics()
  let limit = stats.heap_size_limit
  const fromEnv = Number(env.NUXT_META_HEAP_LIMIT_MB)
  if (Number.isFinite(fromEnv) && fromEnv > 0) {
    limit = Math.min(limit, fromEnv * 1024 * 1024)
  }
  const oldSpaceMb = readMaxOldSpaceSizeMb(execArgv, env.NODE_OPTIONS || '')
  if (oldSpaceMb != null) {
    limit = Math.min(limit, oldSpaceMb * 1024 * 1024)
  }
  return limit
}

export function defaultMetaHeapFraction(
  execArgv: readonly string[] = process.execArgv,
  nodeOptions: string = process.env.NODE_OPTIONS || '',
): number {
  const oldSpaceMb = readMaxOldSpaceSizeMb(execArgv, nodeOptions)
  if (oldSpaceMb != null && oldSpaceMb <= META_HEAP_CLI_OLD_SPACE_MAX_MB) return META_HEAP_FRACTION
  return META_HEAP_FRACTION_SERVER
}

export function defaultMetaHeapMonitor(
  execArgv: readonly string[] = process.execArgv,
  env: NodeJS.ProcessEnv = process.env,
): MetaHeapMonitor {
  return {
    used: () => readProcessMetaMemory().heapUsed,
    limit: () => defaultMetaHeapLimitBytes(env, execArgv),
    fraction: defaultMetaHeapFraction(execArgv, env.NODE_OPTIONS || ''),
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
