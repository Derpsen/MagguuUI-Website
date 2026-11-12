/**
 * Job stand-in for the wrapper SIGTERM test. Holds the Meta SQLite lock,
 * writes ready + pid, then waits until SIGTERM/SIGINT abort the hang.
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { initializeDatabase } from '../../../server/database/bootstrap'
import { isBlizzardMetaLockHeld } from '../../../server/utils/blizzardMetaLock'
import { installMetaSyncCliSignalHandlers, runMetaSyncCli } from '../../../server/utils/metaSyncCli'

const cwd = process.cwd()
const dbPath = join(cwd, 'data', 'magguuui.db')
const readyFile = join(cwd, 'ready')
const pidFile = join(cwd, 'pid')

async function main() {
  writeFileSync(pidFile, String(process.pid))
  const sqlite = new Database(dbPath)
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
    if (isBlizzardMetaLockHeld(sqlite)) writeFileSync(readyFile, 'ready\n')
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
