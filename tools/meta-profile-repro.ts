/**
 * Bounded real-API repro for Meta profile sampling rate (EU only).
 *
 * Load credentials into the environment first; never print, log, or commit them:
 *   set -a && source /path/to/buddy-secrets/blizzard.env && set +a
 *   npx tsx tools/meta-profile-repro.ts
 *
 * Caps stay small so the run stays polite: 2 specs, 15 samples, 2 realms, 1 period.
 * Not invoked from CI. Writes nothing except progress lines and a JSON summary
 * of timing / rates / coverage (no names, realms, or secrets).
 */
import Database from 'better-sqlite3'
import { sanitizeBlizzardLog } from '../server/utils/blizzardAuth'
import { createOfetchBlizzardFetcher } from '../server/utils/blizzardHttp'
import { buildMetaSnapshot } from '../server/utils/blizzardMetaSync'
import { initializeDatabase } from '../server/database/bootstrap'

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]
  const n = raw != null && raw !== '' ? Number(raw) : NaN
  return Number.isFinite(n) ? Math.floor(n) : fallback
}

function credentialPair(): { id: string, secret: string } | null {
  const id = process.env.NUXT_BLIZZARD_CLIENT_ID || process.env.BLIZZARD_CLIENT_ID || ''
  const secret = process.env.NUXT_BLIZZARD_CLIENT_SECRET || process.env.BLIZZARD_CLIENT_SECRET || ''
  if (!id || !secret) return null
  return { id, secret }
}

async function main() {
  const credentials = credentialPair()
  const secrets = credentials ? [credentials.id, credentials.secret] : []
  const warn = (message: string) => {
    process.stderr.write(`${sanitizeBlizzardLog(message, secrets)}\n`)
  }
  if (!credentials) {
    process.stderr.write('Missing NUXT_BLIZZARD_CLIENT_ID / NUXT_BLIZZARD_CLIENT_SECRET (or BLIZZARD_CLIENT_* aliases).\n')
    process.exitCode = 2
    return
  }

  const caps = {
    maxRealms: envInt('META_REPRO_MAX_REALMS', 2),
    periods: envInt('META_REPRO_PERIODS', 1),
    samplePerSpec: envInt('META_REPRO_SAMPLE_PER_SPEC', 15),
    maxAttemptsPerSpec: envInt('META_REPRO_MAX_ATTEMPTS', 20),
    maxSpecs: envInt('META_REPRO_MAX_SPECS', 2),
    concurrency: envInt('META_REPRO_CONCURRENCY', 16),
    maxConcurrentSpecs: 1,
    maxRps: envInt('META_REPRO_MAX_RPS', 40),
  }
  const deadlineMs = envInt('META_REPRO_DEADLINE_MS', 8 * 60 * 1000)
  const sqlite = new Database(':memory:')
  initializeDatabase(sqlite)
  const started = Date.now()
  warn(`[repro] start maxSpecs=${caps.maxSpecs} samplePerSpec=${caps.samplePerSpec} maxRealms=${caps.maxRealms} periods=${caps.periods} concurrency=${caps.concurrency} deadlineMs=${deadlineMs}`)
  try {
    const built = await buildMetaSnapshot({
      fetcher: createOfetchBlizzardFetcher(),
      credentials,
      sqlite,
      caps,
      deadline: started + deadlineMs,
      warn,
    })
    const elapsed = Date.now() - started
    const rps = elapsed > 0 ? (built.stats.calls * 1000) / elapsed : 0
    const specsWithData = built.payload.classes.reduce(
      (n, cls) => n + cls.specs.filter(spec => spec.n > 0).length,
      0,
    )
    const summary = {
      ok: true,
      hitDeadline: Boolean(built.hitDeadline),
      durationMs: elapsed,
      calls: built.stats.calls,
      http429: built.stats.http429,
      http404: built.stats.http404,
      rps: Number(rps.toFixed(2)),
      specsWithData,
      profiles: built.payload.sampled.profiles,
      attempted: built.failures.attempted,
      leaderboards: built.leaderboards,
    }
    process.stdout.write(`${JSON.stringify(summary)}\n`)
  } catch (error) {
    const elapsed = Date.now() - started
    const reason = sanitizeBlizzardLog(error instanceof Error ? error.message : 'repro failed', secrets)
    process.stdout.write(`${JSON.stringify({ ok: false, durationMs: elapsed, reason })}\n`)
    process.stderr.write(`${reason}\n`)
    process.exitCode = 1
  } finally {
    sqlite.close()
  }
}

void main()
