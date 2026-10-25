import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'
import { initializeDatabase } from '../../server/database/bootstrap'
import { OVERVIEW_CACHE_MS, OVERVIEW_RECENT_LIMIT, buildOverview, getOverview, resetOverviewCache } from '../../server/utils/adminOverview'
import { recordAuditChange } from '../../server/utils/auditLog'
import { attentionItems, formatBytes, formatTrend, formatUptime, visibleOf } from '../../utils/overviewView'

const NOW = 1_800_000_000
const DAY = 86400

function freshDb() {
  const sqlite = new Database(':memory:')
  initializeDatabase(sqlite)
  sqlite.prepare("INSERT INTO users (id, username, password_hash) VALUES (1, 'marco', 'x')").run()
  return sqlite
}

describe('buildOverview', () => {
  it('is all zeros and null on an empty database', () => {
    const o = buildOverview(freshDb(), { now: NOW })
    assert.equal(o.health.database, 'ok')
    assert.equal(o.counts.faqTotal, 0)
    assert.equal(o.counts.contentPages, 0)
    assert.deepEqual(o.drafts, { cells: 0, pages: [] })
    assert.equal(o.changelog.latestVersion, null)
    assert.equal(o.lastChange.any, null)
    assert.equal(o.lastChange.publishAt, null)
    assert.deepEqual(o.recent, [])
    assert.deepEqual(attentionItems(o), [])
  })

  it('counts content, changelog, FAQ, strings and drafts', () => {
    const sqlite = freshDb()
    const cell = sqlite.prepare("INSERT INTO site_content (page, section, key, locale, value, type) VALUES (?, ?, ?, 'en', 'v', 'text')")
    cell.run('about', 'intro', 'title'); cell.run('about', 'intro', 'body'); cell.run('home', 'hero', 'title')
    const draft = sqlite.prepare("INSERT INTO content_drafts (page, section, key, locale, value) VALUES (?, ?, ?, 'en', 'd')")
    draft.run('home', 'hero', 'title'); draft.run('about', 'intro', 'body')
    sqlite.prepare("INSERT INTO faqs (category, question, answer, is_visible) VALUES ('general', 'Q1', 'A', 1), ('general', 'Q2', 'A', 0)").run()
    sqlite.prepare("INSERT INTO profiles (addon, profile, string, is_visible, updated_at) VALUES ('Plater', 'Fresh', 's', 1, ?), ('Plater', 'Old', 's', 0, ?)").run(NOW, NOW - 40 * DAY)
    sqlite.prepare("INSERT INTO wowup_strings (name, string, updated_at) VALUES ('W', 's', ?)").run(NOW)
    sqlite.prepare("INSERT INTO character_layouts (name, updated_at) VALUES ('L', ?)").run(NOW - 31 * DAY)
    const o = buildOverview(sqlite, { now: NOW })
    assert.equal(o.counts.contentPages, 2)
    assert.equal(o.counts.contentCells, 3)
    assert.equal(o.counts.faqTotal, 2)
    assert.equal(o.counts.faqVisible, 1)
    assert.equal(o.counts.profilesTotal, 2)
    assert.equal(o.counts.profilesVisible, 1)
    assert.equal(o.counts.wowupTotal, 1)
    assert.deepEqual(o.drafts, { cells: 2, pages: ['about', 'home'] })
    assert.deepEqual(o.stale, { days: 30, profiles: 1, wowup: 0, layouts: 1 })
    const ids = attentionItems(o).map(i => i.id)
    assert.deepEqual(ids, ['drafts', 'stale'])
  })

  it('latest changelog counts only published vX.Y.Z releases', () => {
    const sqlite = freshDb()
    const add = sqlite.prepare('INSERT INTO changelogs (version, content, is_published, published_at) VALUES (?, ?, ?, ?)')
    add.run('v12.1.7', 'a', 1, NOW - 5 * DAY)
    add.run('v12.1.8', 'b', 1, NOW - DAY)
    add.run('v12.1.9', 'c', 0, null)
    add.run('Unreleased', 'd', 1, NOW)
    add.run('auto', 'e', 1, NOW + 5)
    const o = buildOverview(sqlite, { now: NOW })
    assert.equal(o.changelog.latestVersion, 'v12.1.8')
    assert.equal(o.changelog.latestPublishedAt, NOW - DAY)
    assert.equal(o.changelog.hasUnreleased, true)
    assert.equal(o.changelog.unpublished, 1)
    assert.equal(o.counts.changelogTotal, 5)
    assert.ok(attentionItems(o).some(i => i.id === 'changelog'))
  })

  it('reads last publish/edit from the audit log without exposing snapshots', () => {
    const sqlite = freshDb()
    const content = { after: { 'about/intro/title@en': 'New' }, before: { 'about/intro/title@en': 'Old' } }
    recordAuditChange(sqlite, { action: 'updated', entityType: 'content', entityName: 'about saved', userId: 1, redactKeys: false, ...content })
    recordAuditChange(sqlite, { action: 'updated', entityType: 'content', entityName: 'about published', userId: 1, redactKeys: false, before: { x: '1' }, after: { x: '2' } })
    recordAuditChange(sqlite, { action: 'created', entityType: 'faq', entityId: 3, entityName: 'Question', userId: 1, before: null, after: { question: 'Question', apiKey: 'sk-secretsecretsecretsecret1234' } })
    sqlite.prepare('UPDATE audit_changes SET created_at = ? WHERE id = 1').run(NOW - 3 * 3600)
    sqlite.prepare('UPDATE audit_changes SET created_at = ? WHERE id = 2').run(NOW - 2 * 3600)
    sqlite.prepare('UPDATE audit_changes SET created_at = ? WHERE id = 3').run(NOW - 3600)
    const o = buildOverview(sqlite, { now: NOW })
    assert.equal(o.lastChange.publishAt, NOW - 2 * 3600)
    assert.equal(o.lastChange.any?.entityName, 'Question')
    assert.equal(o.lastChange.any?.actorName, 'marco')
    assert.deepEqual(o.lastChange.byType.map(t => t.entityType), ['faq', 'content'])
    assert.equal(o.lastChange.byType[1]!.at, NOW - 2 * 3600)
    assert.equal(o.recent.length, 3)
    const json = JSON.stringify(o)
    assert.ok(!json.includes('sk-secret'))
    assert.ok(!json.includes('before'), 'no snapshots in the overview')
    assert.ok(!('beforeJson' in o.recent[0]!) && !('afterJson' in o.recent[0]!))
  })

  it('caps recent changes and orders newest first', () => {
    const sqlite = freshDb()
    for (let i = 0; i < OVERVIEW_RECENT_LIMIT + 4; i++) {
      recordAuditChange(sqlite, { action: 'created', entityType: 'faq', entityId: i + 1, entityName: `F${i}`, userId: 1, before: null, after: { question: `F${i}` } })
    }
    const o = buildOverview(sqlite, { now: NOW + 10 })
    assert.equal(o.recent.length, OVERVIEW_RECENT_LIMIT)
    assert.equal(o.recent[0]!.entityName, `F${OVERVIEW_RECENT_LIMIT + 3}`)
    assert.equal(o.health.auditRows, OVERVIEW_RECENT_LIMIT + 4)
  })

  it('aggregates own traffic counters for this and the previous week plus top copies', () => {
    const sqlite = freshDb()
    const view = sqlite.prepare("INSERT INTO page_views (path, ip, created_at) VALUES ('/', ?, ?)")
    view.run('1.1.1.1', NOW - DAY); view.run('1.1.1.1', NOW - 2 * DAY); view.run('2.2.2.2', NOW - 3 * DAY)
    view.run('unknown', NOW - 3 * DAY); view.run('3.3.3.3', NOW - 10 * DAY)
    sqlite.prepare("INSERT INTO profiles (id, addon, profile, string) VALUES (7, 'Plater', 'Main', 's')").run()
    const copy = sqlite.prepare("INSERT INTO copy_events (string_type, string_id, ip, created_at) VALUES (?, ?, 'x', ?)")
    copy.run('profile', 7, NOW - DAY); copy.run('profile', 7, NOW - 2 * DAY); copy.run('wowup', 99, NOW - DAY); copy.run('profile', 7, NOW - 9 * DAY)
    const o = buildOverview(sqlite, { now: NOW })
    assert.equal(o.traffic.views7d, 4)
    assert.equal(o.traffic.viewsPrev7d, 1)
    assert.equal(o.traffic.visitors7d, 2)
    assert.equal(o.traffic.copies7d, 3)
    assert.equal(o.traffic.copiesPrev7d, 1)
    assert.deepEqual(o.traffic.topCopied[0], { name: 'Plater - Main', type: 'profile', copies: 3 })
    assert.equal(o.traffic.topCopied[1]!.name, 'wowup #99')
  })

  it('reports health from the environment it is given', () => {
    const o = buildOverview(freshDb(), { now: NOW, dbSizeBytes: 4096, uptimeSeconds: 90, build: { shortSha: 'abc1234', buildTime: '2026-10-25T00:00:00Z' } })
    assert.deepEqual(o.health.build, { shortSha: 'abc1234', buildTime: '2026-10-25T00:00:00Z' })
    assert.equal(o.health.dbSizeBytes, 4096)
    assert.equal(o.health.uptimeSeconds, 90)
  })

  it('flags a broken database', () => {
    const sqlite = freshDb()
    const broken = { prepare: (sql: string) => sql.startsWith('SELECT 1') ? { get: () => { throw new Error('boom') } } : sqlite.prepare(sql) }
    const o = buildOverview(broken as unknown as Database.Database, { now: NOW })
    assert.equal(o.health.database, 'unavailable')
    assert.equal(attentionItems(o)[0]!.id, 'database')
  })
})

describe('overview cache', () => {
  it('serves the cached value for a short time and bypasses it with fresh', () => {
    resetOverviewCache()
    const sqlite = freshDb()
    const first = getOverview(sqlite, {}, false, 1000)
    sqlite.prepare("INSERT INTO faqs (category, question, answer) VALUES ('g', 'Q', 'A')").run()
    assert.equal(getOverview(sqlite, {}, false, 1000 + OVERVIEW_CACHE_MS - 1).counts.faqTotal, first.counts.faqTotal)
    assert.equal(getOverview(sqlite, {}, true, 1001).counts.faqTotal, 1)
    assert.equal(getOverview(sqlite, {}, false, 1001 + OVERVIEW_CACHE_MS + 1).counts.faqTotal, 1)
    resetOverviewCache()
  })
})

describe('view helpers', () => {
  it('formats trend, bytes, uptime and visibility', () => {
    assert.equal(formatTrend(5, 0), 'n/a')
    assert.equal(formatTrend(15, 10), '+50%')
    assert.equal(formatTrend(5, 10), '-50%')
    assert.equal(formatTrend(10, 10), '0%')
    assert.equal(formatBytes(null), 'unknown')
    assert.equal(formatBytes(512), '512 B')
    assert.equal(formatBytes(1536), '1.5 KB')
    assert.equal(formatBytes(5 * 1024 * 1024), '5.0 MB')
    assert.equal(formatUptime(59), '0m')
    assert.equal(formatUptime(3700), '1h 1m')
    assert.equal(formatUptime(90000), '1d 1h')
    assert.equal(visibleOf(3, 3), '3')
    assert.equal(visibleOf(3, 2), '2 / 3 visible')
  })

  it('links a single draft page to its editor', () => {
    const o = buildOverview(freshDb(), { now: NOW })
    o.drafts = { cells: 1, pages: ['home'] }
    assert.equal(attentionItems(o)[0]!.to, '/admin/content/home')
    o.drafts = { cells: 3, pages: ['about', 'home'] }
    assert.equal(attentionItems(o)[0]!.to, '/admin/content')
    assert.match(attentionItems(o)[0]!.text, /3 unpublished draft fields on about, home/)
  })
})
