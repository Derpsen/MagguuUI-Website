/**
 * CLI-specific Node heap. The website process uses NODE_OPTIONS
 * --max-old-space-size=640 inside a 1 GB container; the manual CLI is a
 * second process and must not inherit that cap (live abort on 12.11.2026
 * in the previous 768 MB cgroup: guard tripped at 565 MB heapUsed / 653 MB
 * RSS mid leaderboard ingest).
 *
 * Default 256 MB: an EU-scale pre-spec run peaks around 130 MB heap, and
 * 70% of a 192 MB cap (134 MB) is too tight once in-flight boards are
 * counted. 70% of 256 MB is 179 MB. The wrapper prefers process.execve so
 * it does not stay resident (~40–70 MB saved). Sized for the 1 GB
 * container next to a website process of up to 640 MB heap. Typical
 * website RSS is 150–200 MB plus CLI 200–240 MB. Worst case, a website
 * already at its 640 MB cap (RSS often 700–800 MB with native addons)
 * plus CLI 200–240 MB is about 0.90–1.04 GB — tight against 1 GB if the
 * website is already at the cap; do not fire the CLI then. See
 * docs/meta-nightly.md.
 */
import type { ChildProcess } from 'node:child_process'
import { constants } from 'node:os'
import { readMaxOldSpaceSizeMb } from './blizzardMetaHeap'

export { readMaxOldSpaceSizeMb }

export const META_SYNC_CLI_DEFAULT_HEAP_MB = 256
export const META_SYNC_CLI_HEAP_MIN_MB = 64
export const META_SYNC_CLI_HEAP_MAX_MB = 512
export const META_SYNC_CLI_HEAP_ENV = 'NUXT_META_CLI_HEAP_MB'
/** argv marker set only by our re-exec; an inherited env flag is ignored. */
export const META_SYNC_CLI_HEAP_MARKER = '--meta-sync-cli-heap'
/** Test-only: skip process.execve and keep a spawn wrapper (SIGKILL / parent-death tests). */
export const META_SYNC_CLI_FORCE_SPAWN_ENV = 'META_SYNC_CLI_FORCE_SPAWN'
export const META_SYNC_CLI_FORWARD_SIGNALS = ['SIGTERM', 'SIGINT', 'SIGHUP'] as const
/** Start-of-run RSS budget used by CI image smoke and the unit spawn test. */
export const META_SYNC_CLI_START_RSS_BUDGET_BYTES = 150 * 1024 * 1024
export const META_SYNC_CLI_START_HEAP_BUDGET_BYTES = 50 * 1024 * 1024
/** EU-scale mock pre-spec peak budgets (CI probe + unit spawn under the CLI cap). */
export const META_SYNC_CLI_PEAK_RSS_BUDGET_BYTES = 300 * 1024 * 1024
export const META_SYNC_CLI_PEAK_HEAP_BUDGET_BYTES = 180 * 1024 * 1024

const MAX_OLD_SPACE = /(?:^|\s)--max[-_]old[-_]space[-_]size=\d+/g

export function parseMetaSyncCliHeapMb(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env[META_SYNC_CLI_HEAP_ENV]
  const n = raw == null || raw === '' ? META_SYNC_CLI_DEFAULT_HEAP_MB : Number(raw)
  if (!Number.isFinite(n)) return META_SYNC_CLI_DEFAULT_HEAP_MB
  return Math.floor(Math.min(META_SYNC_CLI_HEAP_MAX_MB, Math.max(META_SYNC_CLI_HEAP_MIN_MB, n)))
}

export function stripMaxOldSpaceSize(nodeOptions: string): string {
  return nodeOptions.replace(MAX_OLD_SPACE, ' ').replace(/\s+/g, ' ').trim()
}

export function resolveMetaSyncCliNodeOptions(env: NodeJS.ProcessEnv = process.env): string {
  return stripMaxOldSpaceSize(env.NODE_OPTIONS || '')
}

export function metaSyncCliHeapAlreadyApplied(
  argv: readonly string[] = process.argv,
  execArgv: readonly string[] = process.execArgv,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  void env.META_SYNC_CLI_HEAP_APPLIED
  if (!argv.includes(META_SYNC_CLI_HEAP_MARKER)) return false
  const mb = readMaxOldSpaceSizeMb(execArgv, '')
  return mb != null && mb >= META_SYNC_CLI_HEAP_MIN_MB && mb <= META_SYNC_CLI_HEAP_MAX_MB
}

export function shouldSpawnMetaSyncCliWrapper(env: NodeJS.ProcessEnv = process.env): boolean {
  return env[META_SYNC_CLI_FORCE_SPAWN_ENV] === '1' || typeof process.execve !== 'function'
}

/** Replace this process with the heap-capped CLI. Does not return on success. */
export function execveMetaSyncCli(
  selfPath: string,
  argv: readonly string[] = process.argv,
  env: NodeJS.ProcessEnv = process.env,
): void {
  const args = [process.execPath, ...metaSyncCliReexecArgs(selfPath, argv, env)]
  const childEnv = { ...env, NODE_OPTIONS: resolveMetaSyncCliNodeOptions(env) }
  process.execve!(process.execPath, args, childEnv)
}

export function metaSyncCliReexecArgs(
  selfPath: string,
  argv: readonly string[] = process.argv,
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const heap = `--max-old-space-size=${parseMetaSyncCliHeapMb(env)}`
  const rest = argv.slice(2).filter(arg => arg !== META_SYNC_CLI_HEAP_MARKER)
  return [heap, selfPath, META_SYNC_CLI_HEAP_MARKER, ...rest]
}

export function signalExitCode(signal: NodeJS.Signals | string): number {
  const signals = constants.signals as Record<string, number | undefined>
  const number = signals[signal]
  return 128 + (number ?? 1)
}

export function childExitStatus(code: number | null, signal: NodeJS.Signals | string | null): number {
  if (signal) return signalExitCode(signal)
  return code ?? 1
}

export function attachForwardedChild(
  child: ChildProcess,
  hooks: {
    on: (event: 'SIGTERM' | 'SIGINT' | 'SIGHUP', listener: () => void) => void
    off: (event: 'SIGTERM' | 'SIGINT' | 'SIGHUP', listener: () => void) => void
    exit: (code: number) => void
  } = process,
): void {
  const forward = (signal: NodeJS.Signals) => {
    try {
      child.kill(signal)
    } catch {
      /* child already gone */
    }
  }
  const listeners = META_SYNC_CLI_FORWARD_SIGNALS.map(signal => {
    const listener = () => forward(signal)
    hooks.on(signal, listener)
    return { signal, listener }
  })
  const cleanup = () => {
    for (const { signal, listener } of listeners) hooks.off(signal, listener)
  }
  child.on('error', () => {
    cleanup()
    hooks.exit(1)
  })
  child.on('exit', (code, signal) => {
    cleanup()
    hooks.exit(childExitStatus(code, signal))
  })
}

/** Abort when the wrapper dies (IPC disconnect or ppid change after SIGKILL). */
export function installMetaSyncCliParentWatch(
  abort: AbortController,
  hooks: {
    on: (event: 'disconnect', listener: () => void) => void
    off: (event: 'disconnect', listener: () => void) => void
    ppid: () => number
    channel?: object | null
    intervalMs?: number
  } = {
    on: (event, listener) => process.on(event, listener),
    off: (event, listener) => process.off(event, listener),
    ppid: () => process.ppid,
    channel: process.channel ?? null,
  },
): () => void {
  const die = () => {
    if (!abort.signal.aborted) abort.abort()
  }
  const onDisconnect = () => die()
  if (hooks.channel) hooks.on('disconnect', onDisconnect)
  const startPpid = hooks.ppid()
  const timer = setInterval(() => {
    const current = hooks.ppid()
    if (current !== startPpid) die()
  }, hooks.intervalMs ?? 250)
  timer.unref?.()
  return () => {
    if (hooks.channel) hooks.off('disconnect', onDisconnect)
    clearInterval(timer)
  }
}
