/**
 * Write the checked-in Meta snapshot fixture into data/magguuui.db.
 * For Lighthouse and ads-runtime checks only — never set this up on Unraid.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { sqlite } from '../server/database'
import { readCurrentMetaSnapshot, writeMetaSnapshot } from '../server/utils/blizzardMetaStore'
import { parseMetaSnapshotPayload } from '../utils/metaSnapshot'

if (process.env.NODE_ENV === 'production' && process.env.CI !== 'true' && process.env.GITHUB_ACTIONS !== 'true') {
  console.error('[meta-fixture] refusing to seed in production outside CI. Never run this on Unraid.')
  process.exit(1)
}

const path = join(process.cwd(), 'tests/fixtures/blizzard-meta/snapshot.json')
const payload = parseMetaSnapshotPayload(readFileSync(path, 'utf8'))
if (!payload) {
  console.error('[meta-fixture] snapshot.json failed validation')
  process.exit(1)
}
if (readCurrentMetaSnapshot(sqlite)) {
  console.info('[meta-fixture] a current snapshot is already in the database; leaving it in place')
  process.exit(0)
}
writeMetaSnapshot(sqlite, payload)
console.info('[meta-fixture] wrote fixture snapshot')
