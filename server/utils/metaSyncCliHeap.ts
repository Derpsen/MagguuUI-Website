/**
 * CLI-specific Node heap. The website process uses NODE_OPTIONS
 * --max-old-space-size=640 inside a 1 GB container; the manual CLI is a
 * second process and must not inherit that cap (live abort on 12.11.2026
 * in the previous 768 MB cgroup: guard tripped at 565 MB heapUsed / 653 MB
 * RSS mid leaderboard ingest).
 *
 * Default 256 MB: an EU-scale pre-spec run peaks around 130 MB heap, and
 * 70% of a 192 MB cap (134 MB) is too tight once in-flight boards are
 * counted. 70% of 256 MB is 179 MB. Sized for the 1 GB container next to
 * a website process of up to 640 MB heap (640 + 256 = 896 MB, about
 * 128 MB slack for RSS overhead). Measured CLI RSS is ~200–240 MB.
 * See docs/meta-nightly.md.
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
): boolean {
  if (!argv.includes(META_SYNC_CLI_HEAP_MARKER)) return false
  const mb = readMaxOldSpaceSizeMb(execArgv, '')
  return mb != null && mb >= META_SYNC_CLI_HEAP_MIN_MB && mb <= META_SYNC_CLI_HEAP_MAX_MB
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
    on: (event: 'SIGTERM' | 'SIGINT', listener: () => void) => void
    off: (event: 'SIGTERM' | 'SIGINT', listener: () => void) => void
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
  const onTerm = () => forward('SIGTERM')
  const onInt = () => forward('SIGINT')
  hooks.on('SIGTERM', onTerm)
  hooks.on('SIGINT', onInt)
  const cleanup = () => {
    hooks.off('SIGTERM', onTerm)
    hooks.off('SIGINT', onInt)
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
