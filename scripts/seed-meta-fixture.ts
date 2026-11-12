/**
 * Write the checked-in Meta snapshot fixture into data/magguuui.db.
 * For Lighthouse and ads-runtime checks only — never set this up on Unraid.
 *
 * The production guard runs before any server/database import. CI=true and
 * GITHUB_ACTIONS must not bypass it; set NUXT_ALLOW_META_FIXTURE_SEED=true
 * explicitly in the CI job that is meant to seed the fixture.
 */
if (process.env.NODE_ENV === 'production' && process.env.NUXT_ALLOW_META_FIXTURE_SEED !== 'true') {
  console.error('[meta-fixture] refusing to seed in production without NUXT_ALLOW_META_FIXTURE_SEED=true. Never run this on Unraid.')
  process.exit(1)
}

const { readFileSync } = await import('node:fs')
const { join } = await import('node:path')
const { sqlite } = await import('../server/database')
const { readCurrentMetaSnapshot, writeMetaSnapshot } = await import('../server/utils/blizzardMetaStore')
const { parseMetaSnapshotPayload } = await import('../utils/metaSnapshot')

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
