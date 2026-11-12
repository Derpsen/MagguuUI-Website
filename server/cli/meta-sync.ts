/**
 * Production entry for a manual Meta snapshot.
 * Packed by tools/build-meta-sync-cli.mjs into .output/server/meta-sync-cli.mjs.
 * Run from /app in the MagguuUI container; never prints secrets.
 */
import { defaultMetaHeapLimitBytes, readProcessMetaMemory } from '../utils/blizzardMetaHeap'

function secretsFromEnv(): string[] {
  return [
    process.env.NUXT_BLIZZARD_CLIENT_ID || '',
    process.env.NUXT_BLIZZARD_CLIENT_SECRET || '',
    process.env.NUXT_META_KUMA_PUSH_URL || '',
  ].filter(Boolean)
}

async function main() {
  const atStart = readProcessMetaMemory()
  const heapLimit = defaultMetaHeapLimitBytes()
  process.stderr.write(
    `[meta-sync-cli] process rss=${atStart.rss} heapUsed=${atStart.heapUsed} heapLimit=${heapLimit}\n`,
  )
  const { sqlite } = await import('../database')
  const { sanitizeBlizzardLog } = await import('../utils/blizzardAuth')
  const { createOfetchBlizzardFetcher } = await import('../utils/blizzardHttp')
  const { installMetaSyncCliSignalHandlers, runMetaSyncCli } = await import('../utils/metaSyncCli')
  const secrets = secretsFromEnv()
  const warn = (message: string) => {
    process.stderr.write(`${sanitizeBlizzardLog(message, secrets)}\n`)
  }
  const abortController = new AbortController()
  const stopSignals = installMetaSyncCliSignalHandlers(abortController)
  try {
    const { summary, exitCode } = await runMetaSyncCli({
      sqlite,
      config: {
        metaNightly: process.env.NUXT_META_NIGHTLY,
        blizzardClientId: process.env.NUXT_BLIZZARD_CLIENT_ID,
        blizzardClientSecret: process.env.NUXT_BLIZZARD_CLIENT_SECRET,
        blizzardRegion: process.env.NUXT_BLIZZARD_REGION,
        metaKumaPushUrl: process.env.NUXT_META_KUMA_PUSH_URL,
        metaSamplePerSpec: process.env.NUXT_META_SAMPLE_PER_SPEC,
        metaMaxAttemptsPerSpec: process.env.NUXT_META_MAX_ATTEMPTS_PER_SPEC,
        metaMaxConcurrentSpecs: process.env.NUXT_META_MAX_CONCURRENT_SPECS,
      },
      fetcher: createOfetchBlizzardFetcher(),
      force: true,
      warn,
      secrets,
      abortController,
    })
    process.stdout.write(`${JSON.stringify(summary)}\n`)
    process.exitCode = exitCode
  } catch (error) {
    const reason = sanitizeBlizzardLog(error instanceof Error ? error.message : 'Meta sync CLI failed', secrets)
    const mem = readProcessMetaMemory()
    process.stdout.write(`${JSON.stringify({
      status: 'error',
      durationMs: 0,
      peakRssBytes: mem.rss,
      peakHeapUsedBytes: mem.heapUsed,
      heapLimitBytes: defaultMetaHeapLimitBytes(),
      specsWithData: 0,
      http429: 0,
      reason,
    })}\n`)
    process.stderr.write(`${reason}\n`)
    process.exitCode = 1
  } finally {
    stopSignals()
  }
}

void main()
