import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyLatestRelease,
  normalizeAddonVersion,
  versionMismatchNotice,
  type AddonSettingStore,
} from '../../server/utils/addonRelease'

function memoryStore(initial: Record<string, string> = {}): AddonSettingStore & { data: Record<string, string> } {
  const data = { ...initial }
  return { data, get: key => data[key], set: (key, value) => { data[key] = value } }
}

// Mirrors resolveLocalAddonVersion: local_version -> addon_version.
function local(store: AddonSettingStore): string | null {
  return normalizeAddonVersion(store.get('local_version')) || normalizeAddonVersion(store.get('addon_version'))
}

test('stale local, Check runs, local becomes the newest tag and the bell clears', () => {
  const store = memoryStore({ addon_version: '12.1.6', github_latest_version: '12.1.8' })
  assert.ok(versionMismatchNotice(local(store), store.get('github_latest_version')), 'bell shows before the check')

  const now = new Date('2026-11-02T10:31:00Z')
  const applied = applyLatestRelease(store, 'v12.1.8', now)

  assert.deepEqual(applied, { latestVersion: '12.1.8', localVersion: '12.1.8' })
  assert.equal(local(store), '12.1.8')
  assert.equal(store.data.github_latest_version, '12.1.8')
  assert.equal(store.data.github_last_check, now.toISOString())
  assert.equal(versionMismatchNotice(local(store), store.get('github_latest_version')), null)
})

test('a legacy local_version override follows the newest tag too', () => {
  const store = memoryStore({ local_version: 'v12.1.5', addon_version: '12.1.6' })
  applyLatestRelease(store, '12.1.9')
  assert.equal(store.data.local_version, '12.1.9')
  assert.equal(store.data.addon_version, '12.1.9')
  assert.equal(local(store), '12.1.9')
})

test('no local_version row is created when none existed', () => {
  const store = memoryStore({ addon_version: '12.1.6' })
  applyLatestRelease(store, 'v12.1.8')
  assert.equal('local_version' in store.data, false)
})

test('an empty tag writes nothing', () => {
  const store = memoryStore({ addon_version: '12.1.6' })
  assert.equal(applyLatestRelease(store, ''), null)
  assert.equal(applyLatestRelease(store, '  '), null)
  assert.equal(applyLatestRelease(store, undefined), null)
  assert.deepEqual(store.data, { addon_version: '12.1.6' })
})

test('mismatch notice compares normalized versions', () => {
  assert.equal(versionMismatchNotice('v12.1.8', '12.1.8'), null)
  assert.equal(versionMismatchNotice(null, '12.1.8'), null)
  assert.equal(versionMismatchNotice('12.1.8', null), null)
  const notice = versionMismatchNotice('12.1.6', 'v12.1.8')
  assert.equal(notice?.title, 'Addon version outdated')
  assert.equal(notice?.message, 'Local MagguuUI: v12.1.6 — GitHub latest: v12.1.8')
  assert.equal(notice?.link, '/admin/system/github')
})
