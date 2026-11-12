/**
 * Production entry for a manual Meta snapshot.
 * Packed by tools/build-meta-sync-cli.mjs into .output/server/meta-sync-cli.mjs.
 * Run from /app in the MagguuUI container; never prints secrets.
 */
import { sqlite } from '../database'
import { sanitizeBlizzardLog } from '../utils/blizzardAuth'
import { createOfetchBlizzardFetcher } from '../utils/blizzardHttp'
import { installMetaSyncCliSignalHandlers, runMetaSyncCli } from '../utils/metaSyncCli'

function secretsFromEnv(): string[] {
  return [
    process.env.NUXT_BLIZZARD_CLIENT_ID || '',
    process.env.NUXT_BLIZZARD_CLIENT_SECRET || '',
    process.env.NUXT_META_KUMA_PUSH_URL || '',
  ].filter(Boolean)
}

async function main() {
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
    process.stdout.write(`${JSON.stringify({
      status: 'error',
      durationMs: 0,
      peakRssBytes: 0,
      peakHeapUsedBytes: 0,
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
