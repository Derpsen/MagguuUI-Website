/**
 * Manual Meta sync runner used by the container CLI.
 * Shares the SQLite lock, lean path, heap guard and fail-closed promote
 * behaviour of runScheduledBlizzardMetaSync. Never logs secrets.
 */
import { sanitizeBlizzardLog } from './blizzardAuth'
import { defaultMetaHeapLimitBytes, readProcessMetaMemory } from './blizzardMetaHeap'
import { runScheduledBlizzardMetaSyncGuarded, type MetaSyncDroppedCounts, type ScheduledMetaResult } from './blizzardMetaSync'
import type { MetaSqlite } from './blizzardMetaStore'
import type { BlizzardFetcher } from './blizzardHttp'
import { installMetaSyncCliParentWatch, META_SYNC_CLI_FORWARD_SIGNALS } from './metaSyncCliHeap'

/**
 * SIGINT/SIGTERM/SIGHUP abort the in-flight sync so `withBlizzardMetaLock` can
 * release in `finally`. The job also aborts if the wrapper dies (IPC
 * disconnect or a ppid change after SIGKILL). Do not `process.exit` here —
 * that would skip cleanup.
 */
export function installMetaSyncCliSignalHandlers(abort: AbortController): () => void {
  const handler = () => {
    if (!abort.signal.aborted) abort.abort()
  }
  for (const signal of META_SYNC_CLI_FORWARD_SIGNALS) process.on(signal, handler)
  const stopWatch = installMetaSyncCliParentWatch(abort)
  return () => {
    for (const signal of META_SYNC_CLI_FORWARD_SIGNALS) process.off(signal, handler)
    stopWatch()
  }
}

export const META_SYNC_CLI_EXIT = {
  ok: 0,
  error: 1,
  locked: 2,
  partial: 3,
  skipped: 4,
} as const

export type MetaSyncCliSummary = {
  status: string
  durationMs: number
  peakRssBytes: number
  peakHeapUsedBytes: number
  heapLimitBytes: number
  specsWithData: number
  http429: number
  dropped?: MetaSyncDroppedCounts
  reason?: string
}

export type MetaSyncCliMemory = {
  rss: number
  heapUsed: number
}

export function exitCodeForMetaSync(status: string): number {
  if (status === 'ok') return META_SYNC_CLI_EXIT.ok
  if (status === 'locked') return META_SYNC_CLI_EXIT.locked
  if (status === 'partial') return META_SYNC_CLI_EXIT.partial
  if (status === 'skipped') return META_SYNC_CLI_EXIT.skipped
  return META_SYNC_CLI_EXIT.error
}

function secretList(config: {
  blizzardClientId?: unknown
  blizzardClientSecret?: unknown
  metaKumaPushUrl?: unknown
}): string[] {
  return [
    typeof config.blizzardClientId === 'string' ? config.blizzardClientId : '',
    typeof config.blizzardClientSecret === 'string' ? config.blizzardClientSecret : '',
    typeof config.metaKumaPushUrl === 'string' ? config.metaKumaPushUrl : '',
  ].filter(Boolean)
}

export function summarizeMetaSyncCli(input: {
  result: ScheduledMetaResult
  durationMs: number
  peakRssBytes: number
  peakHeapUsedBytes: number
  heapLimitBytes?: number
  secrets?: readonly string[]
}): MetaSyncCliSummary {
  const summary: MetaSyncCliSummary = {
    status: input.result.status,
    durationMs: input.result.durationMs ?? input.durationMs,
    peakRssBytes: input.peakRssBytes,
    peakHeapUsedBytes: input.peakHeapUsedBytes,
    heapLimitBytes: input.heapLimitBytes ?? defaultMetaHeapLimitBytes(),
    specsWithData: input.result.specsWithData ?? 0,
    http429: input.result.http429 ?? 0,
  }
  if (input.result.dropped && input.result.dropped.total > 0) {
    summary.dropped = input.result.dropped
  }
  if (input.result.reason) {
    summary.reason = sanitizeBlizzardLog(input.result.reason, input.secrets ?? [])
  }
  return summary
}

export async function runMetaSyncCli(input: {
  sqlite: MetaSqlite
  config: Parameters<typeof runScheduledBlizzardMetaSyncGuarded>[0]['config']
  fetcher: BlizzardFetcher
  sleep?: (ms: number) => Promise<void>
  now?: number | (() => number)
  nodeEnv?: string
  warn?: (message: string) => void
  caps?: Parameters<typeof runScheduledBlizzardMetaSyncGuarded>[0]['caps']
  kumaPush?: Parameters<typeof runScheduledBlizzardMetaSyncGuarded>[0]['kumaPush']
  purgeMeta?: Parameters<typeof runScheduledBlizzardMetaSyncGuarded>[0]['purgeMeta']
  deadline?: number
  heap?: Parameters<typeof runScheduledBlizzardMetaSyncGuarded>[0]['heap']
  abortController?: AbortController
  force?: boolean
  memory?: () => MetaSyncCliMemory
  secrets?: readonly string[]
}): Promise<{ summary: MetaSyncCliSummary, exitCode: number }> {
  const started = typeof input.now === 'function' ? input.now() : (input.now ?? Date.now())
  const memory = input.memory ?? readProcessMetaMemory
  let peakRssBytes = 0
  let peakHeapUsedBytes = 0
  const sample = () => {
    const usage = memory()
    if (usage.rss > peakRssBytes) peakRssBytes = usage.rss
    if (usage.heapUsed > peakHeapUsedBytes) peakHeapUsedBytes = usage.heapUsed
  }
  sample()
  const timer = setInterval(sample, 250)
  timer.unref?.()
  try {
    const result = await runScheduledBlizzardMetaSyncGuarded({
      sqlite: input.sqlite,
      config: input.config,
      fetcher: input.fetcher,
      sleep: input.sleep,
      now: input.now,
      nodeEnv: input.nodeEnv,
      warn: input.warn,
      caps: input.caps,
      kumaPush: input.kumaPush,
      purgeMeta: input.purgeMeta,
      deadline: input.deadline,
      heap: input.heap,
      abortController: input.abortController,
      force: input.force ?? true,
    })
    sample()
    const ended = typeof input.now === 'function' ? input.now() : (input.now ?? Date.now())
    const summary = summarizeMetaSyncCli({
      result,
      durationMs: ended - started,
      peakRssBytes,
      peakHeapUsedBytes,
      secrets: input.secrets ?? secretList(input.config),
    })
    return { summary, exitCode: exitCodeForMetaSync(summary.status) }
  } finally {
    clearInterval(timer)
  }
}
