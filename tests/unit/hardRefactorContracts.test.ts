import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { ELVUI_PACKED_PREFIX } from '../../server/utils/addonProfileLua'
import { summarizeGithubDataSyncResults } from '../../server/utils/githubDataSnapshot'
import { isObsoletePackedElvUiDefault } from '../../server/utils/profileReadModels'

test('isObsoletePackedElvUiDefault only matches packed ElvUI/Default rows', () => {
  assert.equal(isObsoletePackedElvUiDefault({
    addon: 'ElvUI',
    profile: 'Default',
    string: `${ELVUI_PACKED_PREFIX}blob`,
  }), true)
  assert.equal(isObsoletePackedElvUiDefault({
    addon: 'elvui',
    profile: 'default',
    string: `${ELVUI_PACKED_PREFIX}`,
  }), true)
  assert.equal(isObsoletePackedElvUiDefault({
    addon: 'ElvUI',
    profile: 'Default',
    string: '!ELVUI!notPacked',
  }), false)
  assert.equal(isObsoletePackedElvUiDefault({
    addon: 'EllesmereUI',
    profile: 'Default',
    string: `${ELVUI_PACKED_PREFIX}blob`,
  }), false)
  assert.equal(isObsoletePackedElvUiDefault({
    addon: 'ElvUI',
    profile: 'Main',
    string: `${ELVUI_PACKED_PREFIX}blob`,
  }), false)
})

test('summarizeGithubDataSyncResults counts success and soft error statuses', () => {
  assert.deepEqual(summarizeGithubDataSyncResults([
    { status: 'created' },
    { status: 'updated' },
    { status: 'updated' },
    { status: 'unchanged' },
    { status: 'error: boom' },
    { status: 'error: again' },
  ]), {
    created: 1,
    updated: 2,
    unchanged: 1,
    errors: 2,
    imported: 3,
  })

  assert.deepEqual(summarizeGithubDataSyncResults([]), {
    created: 0,
    updated: 0,
    unchanged: 0,
    errors: 0,
    imported: 0,
  })
})

test('admin stats does not query empty api_logs', () => {
  const src = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../../server/api/v1/admin/stats/index.get.ts'),
    'utf8',
  )
  assert.equal(/apiLogs|api_logs/.test(src), false)
  assert.match(src, /totalApiCalls:\s*0/)
  assert.match(src, /apiCallsLast7Days:\s*0/)
  assert.match(src, /id: activityLog\.id/)
  assert.equal(src.includes('activityLog.details'), false)
})

test('strings page lists profiles and layouts without import blobs', () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
  const page = readFileSync(join(root, 'pages/strings.vue'), 'utf8')
  const profilesGet = readFileSync(join(root, 'server/api/v1/profiles/index.get.ts'), 'utf8')
  const sync = readFileSync(join(root, 'server/api/v1/sync/profiles.get.ts'), 'utf8')
  const models = readFileSync(join(root, 'server/utils/profileReadModels.ts'), 'utf8')
  const indexStart = models.indexOf('export function readGroupedProfileIndex')
  const indexEnd = models.indexOf('export function readPublicLayoutIndex')
  const indexFn = models.slice(indexStart, indexEnd)

  assert.match(page, /useFetch<\{ data: ProfileGroupedPublic \}>\('\/api\/v1\/profiles\?view=meta'\)/)
  assert.match(page, /useFetch<\{ data: PublicLayout\[\] \}>\('\/api\/v1\/layouts\?view=meta'\)/)
  assert.equal(page.includes("useFetch<{ data: ProfileGroupedPublic }>('/api/v1/profiles')"), false)
  assert.match(page, /\/api\/v1\/profiles\/\$\{id\}/)
  assert.match(page, /\/api\/v1\/layouts\/\$\{id\}/)
  assert.match(profilesGet, /query\.view === 'meta'/)
  assert.match(profilesGet, /readGroupedProfiles\(/)
  assert.match(sync, /readGroupedProfiles\(/)
  assert.equal(sync.includes('readGroupedProfileIndex'), false)
  assert.equal(indexFn.includes('string: profiles.string'), false)
  assert.match(indexFn, /length\(\$\{profiles\.string\}\)/)
  assert.match(models, /export function readGroupedProfiles/)
})

test('latest-change homepage query selects action fields without details JSON', () => {
  const src = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../../server/api/v1/latest-change.get.ts'),
    'utf8',
  )
  assert.match(src, /select\(\{\s*action: activityLog\.action,\s*entityType: activityLog\.entityType,\s*entityName: activityLog\.entityName,\s*createdAt: activityLog\.createdAt,\s*\}\)/s)
  assert.equal(src.includes('activityLog.details'), false)
  assert.match(src, /action: row\.action/)
  assert.match(src, /type: row\.entityType/)
  assert.match(src, /name: row\.entityName/)
  assert.match(src, /createdAt: row\.createdAt/)
})
