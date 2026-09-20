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
