import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'
import { DATABASE_BOOTSTRAP_SQL, initializeDatabase } from '../../server/database/bootstrap'
import { applyContentItems, discardDrafts, listDrafts, publishDrafts, replaceDrafts } from '../../server/utils/contentDrafts'
import { changedItems, overlayDrafts, publishedMap } from '../../utils/contentDrafts'

function freshDb() {
  const sqlite = new Database(':memory:')
  initializeDatabase(sqlite)
  return sqlite
}

const count = (sqlite: Database.Database, sql: string) => (sqlite.prepare(sql).get() as { n: number }).n

const published = (sqlite: Database.Database, page: string) =>
  sqlite.prepare('SELECT section, key, value FROM site_content WHERE page = ? ORDER BY section, key').all(page)

describe('content_drafts migration', () => {
  it('is created on a fresh database and initialize is idempotent', () => {
    const sqlite = freshDb()
    initializeDatabase(sqlite)
    initializeDatabase(sqlite)
    const cols = sqlite.prepare("SELECT name FROM pragma_table_info('content_drafts')").all().map(r => (r as { name: string }).name)
    assert.deepEqual(cols, ['id', 'page', 'section', 'key', 'locale', 'value', 'type', 'user_id', 'updated_at'])
  })

  it('adds the table to an existing production-like database without touching data', () => {
    const sqlite = new Database(':memory:')
    // Prod schema before this feature: everything except content_drafts.
    sqlite.exec(DATABASE_BOOTSTRAP_SQL.replace(/CREATE TABLE IF NOT EXISTS content_drafts[\s\S]*?idx_content_drafts_cell ON content_drafts\(page, section, key, locale\);/, ''))
    assert.equal(count(sqlite, "SELECT count(*) AS n FROM sqlite_master WHERE name = 'content_drafts'"), 0)
    sqlite.prepare("INSERT INTO site_content (page, section, key, value) VALUES ('about', 'header', 'title', 'Old')").run()
    initializeDatabase(sqlite)
    assert.equal(count(sqlite, "SELECT count(*) AS n FROM sqlite_master WHERE name = 'content_drafts'"), 1)
    assert.deepEqual(published(sqlite, 'about'), [{ section: 'header', key: 'title', value: 'Old' }])
  })
})

describe('draft / publish logic', () => {
  it('replaceDrafts stores drafts without touching published content', () => {
    const sqlite = freshDb()
    applyContentItems(sqlite, [{ page: 'about', section: 'header', key: 'title', value: 'Live' }], 1)
    const n = replaceDrafts(sqlite, ['about'], [{ page: 'about', section: 'header', key: 'title', value: 'Draft' }], 1)
    assert.equal(n, 1)
    assert.deepEqual(published(sqlite, 'about'), [{ section: 'header', key: 'title', value: 'Live' }])
    assert.equal(listDrafts(sqlite, ['about'])[0]?.value, 'Draft')
    assert.deepEqual(listDrafts(sqlite, ['imprint']), [])
  })

  it('replaceDrafts replaces the previous draft of the page and ignores other pages', () => {
    const sqlite = freshDb()
    replaceDrafts(sqlite, ['about'], [
      { page: 'about', section: 'a', key: 'x', value: '1' },
      { page: 'about', section: 'a', key: 'y', value: '2' },
    ])
    replaceDrafts(sqlite, ['about'], [
      { page: 'about', section: 'a', key: 'x', value: '3' },
      { page: 'privacy', section: 'a', key: 'x', value: 'ignored' },
    ])
    const rows = listDrafts(sqlite, ['about', 'privacy'])
    assert.deepEqual(rows.map(r => `${r.page}/${r.key}=${r.value}`), ['about/x=3'])
    replaceDrafts(sqlite, ['about'], [])
    assert.deepEqual(listDrafts(sqlite, ['about']), [])
  })

  it('publishDrafts promotes drafts, writes revisions, deletes empty cells and clears the draft', () => {
    const sqlite = freshDb()
    applyContentItems(sqlite, [
      { page: 'about', section: 'header', key: 'title', value: 'Live' },
      { page: 'about', section: 'header', key: 'eyebrow', value: 'Gone soon' },
    ], 1)
    replaceDrafts(sqlite, ['about'], [
      { page: 'about', section: 'header', key: 'title', value: 'New', type: 'text' },
      { page: 'about', section: 'header', key: 'eyebrow', value: '' },
      { page: 'about', section: 'intro', key: 'body', value: '<p>Hi</p>', type: 'html' },
    ], 1)
    assert.equal(publishDrafts(sqlite, ['about'], 7), 3)
    assert.deepEqual(published(sqlite, 'about'), [
      { section: 'header', key: 'title', value: 'New' },
      { section: 'intro', key: 'body', value: '<p>Hi</p>' },
    ])
    assert.deepEqual(listDrafts(sqlite, ['about']), [])
    const revs = sqlite.prepare("SELECT key, value, user_id FROM content_revisions WHERE user_id = 7 ORDER BY key").all()
    assert.deepEqual(revs, [
      { key: 'body', value: null, user_id: 7 },
      { key: 'eyebrow', value: 'Gone soon', user_id: 7 },
      { key: 'title', value: 'Live', user_id: 7 },
    ])
    assert.equal(publishDrafts(sqlite, ['about'], 7), 0)
  })

  it('publish only touches the requested pages; discard leaves published content alone', () => {
    const sqlite = freshDb()
    replaceDrafts(sqlite, ['about'], [{ page: 'about', section: 's', key: 'k', value: 'A' }])
    replaceDrafts(sqlite, ['home'], [{ page: 'home', section: 's', key: 'k', value: 'H' }])
    publishDrafts(sqlite, ['about'])
    assert.equal(published(sqlite, 'about').length, 1)
    assert.equal(published(sqlite, 'home').length, 0)
    assert.equal(discardDrafts(sqlite, ['home']), 1)
    assert.equal(published(sqlite, 'home').length, 0)
    assert.deepEqual(listDrafts(sqlite, ['home']), [])
  })

  it('applyContentItems keeps the legacy bulk semantics', () => {
    const sqlite = freshDb()
    applyContentItems(sqlite, [{ page: 'p', section: 's', key: 'k', value: 'v1', type: 'html' }])
    applyContentItems(sqlite, [{ page: 'p', section: 's', key: 'k', value: 'v1' }]) // unchanged: no revision
    applyContentItems(sqlite, [{ page: 'p', section: 's', key: 'k', value: '' }, { page: 'p', section: 's', key: 'none', value: '' }])
    assert.deepEqual(published(sqlite, 'p'), [])
    assert.equal(count(sqlite, 'SELECT count(*) AS n FROM content_revisions'), 2)
  })
})

describe('client draft helpers', () => {
  const items = (title: string, eyebrow = '') => [
    { page: 'about', section: 'header', key: 'title', value: title },
    { page: 'about', section: 'header', key: 'eyebrow', value: eyebrow },
  ]

  it('changedItems keeps only cells that differ from the published values', () => {
    const base = publishedMap(items('About'))
    assert.deepEqual(changedItems(items('About'), base), [])
    assert.deepEqual(changedItems(items('About 2'), base).map(i => i.key), ['title'])
    assert.deepEqual(changedItems(items('About ', ''), base), [])
  })

  it('overlayDrafts applies drafts per page without mutating the input and empty removes the cell', () => {
    const tree = { en: { header: { title: 'Live', eyebrow: 'E' } } }
    const out = overlayDrafts(tree, 'about', [
      { page: 'about', section: 'header', key: 'title', value: 'Draft' },
      { page: 'about', section: 'header', key: 'eyebrow', value: '' },
      { page: 'about', section: 'intro', key: 'body', value: 'B' },
      { page: 'home', section: 'header', key: 'title', value: 'other page' },
    ])
    assert.deepEqual(out, { en: { header: { title: 'Draft' }, intro: { body: 'B' } } })
    assert.equal(tree.en.header.title, 'Live')
    assert.deepEqual(overlayDrafts(null, 'about', []), {})
  })
})
