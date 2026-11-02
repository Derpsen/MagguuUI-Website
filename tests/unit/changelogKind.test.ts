import assert from 'node:assert/strict'
import test from 'node:test'
import { countReleaseDrafts, isGeneratedChangelogVersion } from '../../server/utils/changelogKind'

test('generated versions: auto and Sync YYYY-MM-DD (as the generators write them)', () => {
  for (const v of ['auto', 'Auto', ' auto ', 'Sync 2026-11-02', 'sync 2026-01-31', ' Sync 2025-12-01 ']) {
    assert.equal(isGeneratedChangelogVersion(v), true, v)
  }
})

test('release versions and look-alikes are not generated', () => {
  for (const v of ['v12.1.8', '12.1.9', 'v12.1.6-Dev-16', 'Unreleased', 'automation', 'v-auto', 'Sync', 'Sync 2026-11', 'Sync 2026-11-02 extra', 'Resync 2026-11-02', '', null, undefined]) {
    assert.equal(isGeneratedChangelogVersion(v), false, String(v))
  }
})

test('mixed unpublished rows: only real release drafts count', () => {
  const versions = [
    ...Array.from({ length: 50 }, () => 'auto'),
    ...Array.from({ length: 38 }, (_, i) => `Sync 2026-10-${String((i % 28) + 1).padStart(2, '0')}`),
    'v12.1.9',
    'v13.0.0-Dev-1',
    'Unreleased',
  ]
  assert.equal(countReleaseDrafts(versions), 3)
  assert.equal(countReleaseDrafts(versions, { excludeUnreleased: true }), 2)
  assert.equal(countReleaseDrafts(versions.slice(0, 88)), 0)
  assert.equal(countReleaseDrafts([]), 0)
})

test('wiring: the admin bell counts through countReleaseDrafts', async () => {
  const { readFileSync } = await import('node:fs')
  const src = readFileSync(new URL('../../server/api/v1/admin/notifications/index.get.ts', import.meta.url), 'utf8')
  assert.match(src, /const releaseDrafts = countReleaseDrafts\(draftVersions\.map\(r => r\.version\)\)/)
  assert.match(src, /if \(releaseDrafts > 0\)/)
  assert.doesNotMatch(src, /count\(\) \}\)\.from\(changelogs\)/)
})
