/**
 * CLI-specific Node heap. The website process uses NODE_OPTIONS
 * --max-old-space-size=640 inside a 768 MB container; the manual CLI is a
 * second process and must not inherit that cap (live abort on 12.11.2026:
 * guard tripped at 565 MB heapUsed / 653 MB RSS before any spec loaded,
 * while the container cgroup had already hit 768 MB).
 */
export const META_SYNC_CLI_DEFAULT_HEAP_MB = 256
export const META_SYNC_CLI_HEAP_ENV = 'NUXT_META_CLI_HEAP_MB'
export const META_SYNC_CLI_HEAP_APPLIED_ENV = 'META_SYNC_CLI_HEAP_APPLIED'
/** Start-of-run RSS budget used by CI image smoke and the unit spawn test. */
export const META_SYNC_CLI_START_RSS_BUDGET_BYTES = 150 * 1024 * 1024
export const META_SYNC_CLI_START_HEAP_BUDGET_BYTES = 50 * 1024 * 1024

const MAX_OLD_SPACE = /(?:^|\s)--max-old-space-size=\d+/g

export function parseMetaSyncCliHeapMb(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env[META_SYNC_CLI_HEAP_ENV]
  const n = raw == null || raw === '' ? META_SYNC_CLI_DEFAULT_HEAP_MB : Number(raw)
  if (!Number.isFinite(n) || n < 64 || n > 512) return META_SYNC_CLI_DEFAULT_HEAP_MB
  return Math.floor(n)
}

export function stripMaxOldSpaceSize(nodeOptions: string): string {
  return nodeOptions.replace(MAX_OLD_SPACE, ' ').replace(/\s+/g, ' ').trim()
}

export function resolveMetaSyncCliNodeOptions(env: NodeJS.ProcessEnv = process.env): string {
  const stripped = stripMaxOldSpaceSize(env.NODE_OPTIONS || '')
  const heap = `--max-old-space-size=${parseMetaSyncCliHeapMb(env)}`
  return stripped ? `${stripped} ${heap}` : heap
}

export function metaSyncCliHeapAlreadyApplied(env: NodeJS.ProcessEnv = process.env): boolean {
  return env[META_SYNC_CLI_HEAP_APPLIED_ENV] === '1'
}
