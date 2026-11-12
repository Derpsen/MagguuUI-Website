/**
 * Holds the Meta sync lock inside runMetaSyncCli, then waits.
 * SIGTERM/SIGINT must abort the hang, release the lock in finally, and exit non-zero.
 *
 * No top-level await: Node can treat SIGTERM during unsettled TLA as a hard
 * exit and skip JS finally (seen in CI as "Detected unsettled top-level await").
 * A ref'd timer keeps the event loop alive; an AbortSignal listener alone does not.
 */
import { writeFileSync } from 'node:fs'
import Database from 'better-sqlite3'
import { initializeDatabase } from '../../../server/database/bootstrap'
import { isBlizzardMetaLockHeld } from '../../../server/utils/blizzardMetaLock'
import { installMetaSyncCliSignalHandlers, runMetaSyncCli } from '../../../server/utils/metaSyncCli'

const dbPath = process.argv[2]
const readyFile = process.argv[3]
if (!dbPath || !readyFile) {
  process.stderr.write('usage: metaSyncCliSignalChild.ts <dbPath> <readyFile>\n')
  process.exit(2)
}
const dbFile = dbPath
const readyPath = readyFile

async function main() {
  const sqlite = new Database(dbFile)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('busy_timeout = 5000')
  initializeDatabase(sqlite)

  const abortController = new AbortController()
  const stopSignals = installMetaSyncCliSignalHandlers(abortController)
  const keepAlive = setInterval(() => {}, 1000)

  function hang(): Promise<never> {
    return new Promise((_resolve, reject) => {
      const fail = () => reject(new Error('Meta nightly aborted'))
      if (abortController.signal.aborted) {
        fail()
        return
      }
      abortController.signal.addEventListener('abort', fail, { once: true })
    })
  }

  const fetcher = async () => {
    if (isBlizzardMetaLockHeld(sqlite)) writeFileSync(readyPath, 'ready\n')
    return hang()
  }

  try {
    const { summary, exitCode } = await runMetaSyncCli({
      sqlite,
      config: {
        metaNightly: 'on',
        blizzardClientId: 'client-id',
        blizzardClientSecret: 'client-secret',
      },
      fetcher,
      force: true,
      sleep: hang,
      kumaPush: async () => 'skipped',
      purgeMeta: async () => 'skipped',
      abortController,
    })
    process.stdout.write(`${JSON.stringify(summary)}\n`)
    process.exitCode = exitCode
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Meta sync CLI failed'
    process.stdout.write(`${JSON.stringify({ status: 'error', reason })}\n`)
    process.exitCode = 1
  } finally {
    clearInterval(keepAlive)
    stopSignals()
    sqlite.close()
  }
}

void main()
