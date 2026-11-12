/**
 * One-shot lock acquire for the cross-process race test.
 * Waits until startAt (ms epoch, argv[3]) then tries to acquire and prints JSON.
 */
import Database from 'better-sqlite3'
import { tryAcquireBlizzardMetaLock } from '../../../server/utils/blizzardMetaLock'

const dbPath = process.argv[2]
const startAt = Number(process.argv[3] || 0)
if (!dbPath || !Number.isFinite(startAt)) {
  process.stderr.write('usage: metaSyncLockAcquireChild.ts <dbPath> <startAtMs>\n')
  process.exit(2)
}

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('busy_timeout = 5000')

while (Date.now() < startAt) {
  // spin until the shared start instant
}

try {
  const result = tryAcquireBlizzardMetaLock(db, Date.now())
  process.stdout.write(`${JSON.stringify({ ok: result.ok })}\n`)
} finally {
  db.close()
}
