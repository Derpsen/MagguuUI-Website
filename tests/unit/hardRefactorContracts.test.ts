import assert from 'node:assert/strict'
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
