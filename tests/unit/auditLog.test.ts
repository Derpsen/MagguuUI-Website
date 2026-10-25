import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'
import { DATABASE_BOOTSTRAP_SQL, initializeDatabase } from '../../server/database/bootstrap'
import { REDACTED, containsRedaction, redactAuditValue, redactToJson, scrubString } from '../../server/utils/auditRedact'
import {
  AuditUndoError, changelogSnapshot, faqSnapshot, listAudit, parseCellId, pruneAudit,
  recordAuditChange, recordContentAudit, undoAuditChange, cellId,
} from '../../server/utils/auditLog'
import { applyContentItems } from '../../server/utils/contentDrafts'
import { diffLines, diffSnapshots } from '../../utils/auditDiff'

function freshDb() {
  const sqlite = new Database(':memory:')
  initializeDatabase(sqlite)
  sqlite.prepare("INSERT INTO users (id, username, password_hash) VALUES (1, 'marco', 'x')").run()
  return sqlite
}
const n = (sqlite: Database.Database, sql: string) => (sqlite.prepare(sql).get() as { n: number }).n

describe('audit_changes migration', () => {
  it('is idempotent and additive on a production-like database', () => {
    const sqlite = new Database(':memory:')
    sqlite.exec(DATABASE_BOOTSTRAP_SQL.replace(/CREATE TABLE IF NOT EXISTS audit_changes[\s\S]*?idx_audit_changes_entity ON audit_changes\(entity_type, entity_id\);/, ''))
    assert.equal(n(sqlite, "SELECT count(*) AS n FROM sqlite_master WHERE name = 'audit_changes'"), 0)
    sqlite.prepare("INSERT INTO faqs (category, question, answer) VALUES ('general', 'Q', 'A')").run()
    initializeDatabase(sqlite)
    initializeDatabase(sqlite)
    assert.equal(n(sqlite, "SELECT count(*) AS n FROM sqlite_master WHERE name = 'audit_changes'"), 1)
    assert.equal(n(sqlite, 'SELECT count(*) AS n FROM faqs'), 1)
  })
})

describe('redaction', () => {
  it('removes values of sensitive keys, whatever the nesting', () => {
    const out = redactAuditValue({
      name: 'ok', password: 'hunter2', password_hash: '$2b$12$abc', apiKey: 'k', api_key_hash: 'h',
      nested: { sessionToken: 'abc', webhook_url: 'https://x.test/hook', passkeyCredential: { publicKey: 'AA' }, fine: 'yes' },
      list: [{ secret: 's' }, 'plain'],
    }) as Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
    assert.equal(out.name, 'ok')
    for (const k of ['password', 'password_hash', 'apiKey', 'api_key_hash']) assert.equal(out[k], REDACTED, k)
    assert.equal(out.nested.sessionToken, REDACTED)
    assert.equal(out.nested.webhook_url, REDACTED)
    assert.equal(out.nested.passkeyCredential, REDACTED)
    assert.equal(out.nested.fine, 'yes')
    assert.equal(out.list[0].secret, REDACTED)
    assert.equal(out.list[1], 'plain')
  })

  it('scrubs secret-shaped strings inside free text', () => {
    const bearer = scrubString('call with Authorization: Bearer abcdef0123456789xyz now')
    assert.ok(!bearer.includes('abcdef0123456789xyz'))
    const samples = [
      'https://discord.com/api/webhooks/123456/abcDEF_token',
      'https://hooks.slack.com/services/T000/B000/XXXXXXXX',
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r',
      '$2b$12$' + 'a'.repeat(53),
      'ghp_' + 'A'.repeat(30),
      'sk-' + 'b'.repeat(30),
      'https://user:pa55word@example.com/path',
      'https://example.com/x?token=abc123&ok=1',
      '-----BEGIN PRIVATE KEY-----\nMIIEvQ\n-----END PRIVATE KEY-----',
      'a'.repeat(10) + 'f'.repeat(64),
    ]
    for (const s of samples) {
      const out = scrubString(`before ${s} after`)
      assert.ok(out.includes(REDACTED), s)
      assert.ok(!out.includes('pa55word') && !out.includes('abc123&') && !out.includes('abcDEF_token') && !out.includes('MIIEvQ'), out)
    }
    assert.equal(scrubString('Release 12.1.3 fixes #12'), 'Release 12.1.3 fixes #12')
  })

  it('can skip key-based redaction for neutral keys but still scrubs values', () => {
    const out = redactAuditValue({ 'privacy/cookies/session': 'Cookie text', 'a/b/c': 'Bearer abcdefghijkl' }, false) as Record<string, string>
    assert.equal(out['privacy/cookies/session'], 'Cookie text')
    assert.ok(out['a/b/c']!.includes(REDACTED))
  })

  it('caps size and marks truncated snapshots as not restorable', () => {
    const big = redactAuditValue({ text: 'x'.repeat(30_000) }) as { text: string }
    assert.ok(big.text.length < 20_100)
    assert.equal(containsRedaction(big), true)
    assert.equal(containsRedaction({ a: 'fine' }), false)
    assert.equal(containsRedaction({ a: REDACTED }), true)
    assert.equal(redactToJson(null), null)
    assert.equal(JSON.parse(redactToJson(Object.fromEntries(Array.from({ length: 400 }, (_, i) => [`k${i}`, 'y'.repeat(19_000)])))!)._truncated, true)
  })

  it('never writes secrets into audit_changes (settings-style record)', () => {
    const sqlite = freshDb()
    recordAuditChange(sqlite, {
      action: 'updated', entityType: 'setting', entityName: '3 settings', userId: 1,
      before: { discord_webhook_url: 'https://discord.com/api/webhooks/1/secretpart', site_name: 'Old', admin_password: 'p1' },
      after: { discord_webhook_url: 'https://discord.com/api/webhooks/1/newsecret', site_name: 'New', admin_password: 'p2' },
    })
    const row = sqlite.prepare('SELECT before_json, after_json, entity_name FROM audit_changes').get() as Record<string, string>
    const all = JSON.stringify(row)
    for (const secret of ['secretpart', 'newsecret', 'p1', '"p2"']) assert.ok(!all.includes(secret), secret)
    assert.ok(all.includes('Old') && all.includes('New'))
    const listed = listAudit(sqlite).items[0]!
    assert.equal(listed.undoable, false)
  })
})

describe('diff', () => {
  it('produces a line diff and field changes', () => {
    assert.deepEqual(diffLines('a\nb\nc', 'a\nx\nc').map(l => `${l.type}:${l.text}`), ['same:a', 'del:b', 'add:x', 'same:c'])
    const changes = diffSnapshots({ title: 'Old', body: 'same', gone: 'x' }, { title: 'New', body: 'same', added: 'y' })
    assert.deepEqual(changes.map(c => [c.field, c.kind]), [['title', 'changed'], ['gone', 'removed'], ['added', 'added']])
    assert.deepEqual(diffSnapshots(null, { a: 1 }).map(c => c.kind), ['added'])
    assert.deepEqual(diffSnapshots({ a: 1 }, { a: 1 }), [])
  })
})

describe('record, list, retention', () => {
  it('skips no-op changes and filters the list', () => {
    const sqlite = freshDb()
    assert.equal(recordAuditChange(sqlite, { action: 'updated', entityType: 'faq', entityId: 1, entityName: 'Q', before: { a: 1 }, after: { a: 1 } }), null)
    recordAuditChange(sqlite, { action: 'created', entityType: 'faq', entityId: 1, entityName: 'How?', before: null, after: { a: 1 }, userId: 1 })
    recordAuditChange(sqlite, { action: 'deleted', entityType: 'changelog', entityId: 2, entityName: 'v1', before: { a: 1 }, after: null, userId: 1 })
    const all = listAudit(sqlite)
    assert.equal(all.total, 2)
    assert.equal(all.items[0]!.actorName, 'marco')
    assert.equal(listAudit(sqlite, { type: 'faq' }).total, 1)
    assert.equal(listAudit(sqlite, { action: 'deleted' }).total, 1)
    assert.equal(listAudit(sqlite, { search: 'How' }).total, 1)
    assert.equal(listAudit(sqlite, { actor: 'mar' }).total, 2)
    assert.equal(listAudit(sqlite, { actor: 'nobody' }).total, 0)
    assert.equal(listAudit(sqlite, { type: 'bogus' }).total, 2)
  })

  it('keeps only the newest N rows and drops rows older than the age cap', () => {
    const sqlite = freshDb()
    const ins = sqlite.prepare("INSERT INTO audit_changes (action, entity_type, entity_name, created_at) VALUES ('updated', 'faq', ?, ?)")
    const now = 2_000_000_000
    for (let i = 0; i < 12; i++) ins.run(`row${i}`, now - i)
    assert.equal(pruneAudit(sqlite, { maxRows: 5, now }), 7)
    assert.deepEqual(sqlite.prepare('SELECT entity_name AS e FROM audit_changes ORDER BY id').all().map(r => (r as { e: string }).e), ['row7', 'row8', 'row9', 'row10', 'row11'])
    ins.run('old', now - 91 * 86400)
    ins.run('fresh', now - 89 * 86400)
    pruneAudit(sqlite, { maxRows: 100, maxAgeDays: 90, now })
    const names = sqlite.prepare('SELECT entity_name AS e FROM audit_changes').all().map(r => (r as { e: string }).e)
    assert.ok(!names.includes('old') && names.includes('fresh'))
  })

  it('applies the cap on every insert', () => {
    const sqlite = freshDb()
    for (let i = 0; i < 5; i++) recordAuditChange(sqlite, { action: 'created', entityType: 'faq', entityId: i, entityName: `f${i}`, before: null, after: { i } })
    assert.equal(n(sqlite, 'SELECT count(*) AS n FROM audit_changes'), 5)
    // a row older than 90 days disappears with the next insert
    sqlite.prepare("INSERT INTO audit_changes (action, entity_type, entity_name, created_at) VALUES ('updated', 'faq', 'ancient', 1000)").run()
    recordAuditChange(sqlite, { action: 'created', entityType: 'faq', entityId: 9, entityName: 'f9', before: null, after: { i: 9 } })
    assert.equal(n(sqlite, "SELECT count(*) AS n FROM audit_changes WHERE entity_name = 'ancient'"), 0)
  })
})

describe('undo', () => {
  const addFaq = (sqlite: Database.Database) => {
    const info = sqlite.prepare("INSERT INTO faqs (category, question, answer) VALUES ('general', 'Q1', 'A1')").run()
    return Number(info.lastInsertRowid)
  }
  const faqRow = (sqlite: Database.Database, id: number) => sqlite.prepare('SELECT category, question, answer, sort_order AS sortOrder, is_visible AS isVisible, created_at AS createdAt FROM faqs WHERE id = ?').get(id) as Record<string, unknown> | undefined
  const entry = (sqlite: Database.Database, id: number) => listAudit(sqlite).items.find(i => i.id === id)!

  it('restores an updated FAQ as a new audited action and marks the original undone', () => {
    const sqlite = freshDb()
    const id = addFaq(sqlite)
    const before = faqSnapshot(faqRow(sqlite, id)!)
    sqlite.prepare("UPDATE faqs SET answer = 'A2' WHERE id = ?").run(id)
    const auditId = recordAuditChange(sqlite, { action: 'updated', entityType: 'faq', entityId: id, entityName: 'Q1', before, after: faqSnapshot(faqRow(sqlite, id)!), userId: 1 })!
    assert.equal(entry(sqlite, auditId).undoable, true)
    const undone = undoAuditChange(sqlite, auditId, 1)
    assert.equal(faqRow(sqlite, id)!.answer, 'A1')
    assert.equal(undone.undoOf, auditId)
    assert.equal(undone.action, 'updated')
    assert.equal(undone.undoable, false)
    assert.equal(entry(sqlite, auditId).undoneBy, undone.id)
    assert.equal(entry(sqlite, auditId).undoable, false)
    assert.throws(() => undoAuditChange(sqlite, auditId, 1), (e: unknown) => e instanceof AuditUndoError && e.status === 422)
    assert.throws(() => undoAuditChange(sqlite, undone.id, 1), (e: unknown) => e instanceof AuditUndoError && /undo cannot be undone/.test(e.message))
  })

  it('refuses with a conflict when the entity changed since, and changes nothing', () => {
    const sqlite = freshDb()
    const id = addFaq(sqlite)
    const before = faqSnapshot(faqRow(sqlite, id)!)
    sqlite.prepare("UPDATE faqs SET answer = 'A2' WHERE id = ?").run(id)
    const auditId = recordAuditChange(sqlite, { action: 'updated', entityType: 'faq', entityId: id, entityName: 'Q1', before, after: faqSnapshot(faqRow(sqlite, id)!), userId: 1 })!
    sqlite.prepare("UPDATE faqs SET answer = 'A3 (newer edit)' WHERE id = ?").run(id)
    const rows = n(sqlite, 'SELECT count(*) AS n FROM audit_changes')
    assert.throws(() => undoAuditChange(sqlite, auditId, 1), (e: unknown) => e instanceof AuditUndoError && e.code === 'conflict' && e.status === 409)
    assert.equal(faqRow(sqlite, id)!.answer, 'A3 (newer edit)')
    assert.equal(n(sqlite, 'SELECT count(*) AS n FROM audit_changes'), rows)
    assert.equal(entry(sqlite, auditId).undoneBy, null)
  })

  it('undoes a created entry (delete) and a deleted entry (re-insert with the same id)', () => {
    const sqlite = freshDb()
    const id = addFaq(sqlite)
    const created = recordAuditChange(sqlite, { action: 'created', entityType: 'faq', entityId: id, entityName: 'Q1', before: null, after: faqSnapshot(faqRow(sqlite, id)!), userId: 1 })!
    const undoCreate = undoAuditChange(sqlite, created, 1)
    assert.equal(faqRow(sqlite, id), undefined)
    assert.equal(undoCreate.action, 'deleted')

    const cid = Number(sqlite.prepare("INSERT INTO changelogs (version, content, is_published, published_at) VALUES ('v1', 'body', 1, 1700000000)").run().lastInsertRowid)
    const snap = changelogSnapshot(sqlite.prepare('SELECT version, content, content_en AS contentEn, is_published AS isPublished, published_at AS publishedAt, created_at AS createdAt FROM changelogs WHERE id = ?').get(cid) as Record<string, unknown>)
    sqlite.prepare('DELETE FROM changelogs WHERE id = ?').run(cid)
    const del = recordAuditChange(sqlite, { action: 'deleted', entityType: 'changelog', entityId: cid, entityName: 'v1', before: snap, after: null, userId: 1 })!
    const restored = undoAuditChange(sqlite, del, 1)
    assert.equal(restored.action, 'created')
    const row = sqlite.prepare('SELECT version, content, is_published AS p, published_at AS at FROM changelogs WHERE id = ?').get(cid) as Record<string, unknown>
    assert.deepEqual(row, { version: 'v1', content: 'body', p: 1, at: 1700000000 })
    // an entity re-created by someone else blocks a second restore attempt
    const del2 = recordAuditChange(sqlite, { action: 'deleted', entityType: 'changelog', entityId: 777, entityName: 'v9', before: snap, after: null })!
    sqlite.prepare("INSERT INTO changelogs (id, version, content) VALUES (777, 'other', 'x')").run()
    assert.throws(() => undoAuditChange(sqlite, del2, 1), (e: unknown) => e instanceof AuditUndoError && e.code === 'conflict')
  })

  it('restores content cells (including deleting cells that did not exist) and writes revisions', () => {
    const sqlite = freshDb()
    sqlite.prepare("INSERT INTO site_content (page, section, key, value) VALUES ('about', 'intro', 'title', 'Old')").run()
    const changes = applyContentItems(sqlite, [
      { page: 'about', section: 'intro', key: 'title', value: 'New' },
      { page: 'about', section: 'intro', key: 'lead', value: 'Fresh', type: 'text' },
    ], 1)
    const auditId = recordContentAudit(sqlite, changes, 'about published', 1)!
    assert.deepEqual(Object.keys(listAudit(sqlite).items[0]!.after!).sort(), ['about/intro/lead', 'about/intro/title'])
    const undone = undoAuditChange(sqlite, auditId, 1)
    const rows = sqlite.prepare("SELECT key, value FROM site_content WHERE page = 'about' ORDER BY key").all()
    assert.deepEqual(rows, [{ key: 'title', value: 'Old' }])
    assert.equal(undone.undoOf, auditId)
    assert.ok(n(sqlite, 'SELECT count(*) AS n FROM content_revisions') >= 4)
  })

  it('refuses content undo when a cell changed since', () => {
    const sqlite = freshDb()
    const changes = applyContentItems(sqlite, [{ page: 'about', section: 'intro', key: 'title', value: 'New' }], 1)
    const auditId = recordContentAudit(sqlite, changes, 'about published', 1)!
    applyContentItems(sqlite, [{ page: 'about', section: 'intro', key: 'title', value: 'Someone else' }], 1)
    assert.throws(() => undoAuditChange(sqlite, auditId, 1), (e: unknown) => e instanceof AuditUndoError && e.code === 'conflict')
    assert.equal((sqlite.prepare("SELECT value FROM site_content WHERE key = 'title'").get() as { value: string }).value, 'Someone else')
  })

  it('refuses types that are not safe to undo and before-states that lost data to redaction', () => {
    const sqlite = freshDb()
    const setting = recordAuditChange(sqlite, { action: 'updated', entityType: 'setting', entityName: 's', before: { a: '1' }, after: { a: '2' } })!
    assert.throws(() => undoAuditChange(sqlite, setting, 1), (e: unknown) => e instanceof AuditUndoError && e.status === 422)
    const id = addFaq(sqlite)
    const redacted = recordAuditChange(sqlite, {
      action: 'updated', entityType: 'faq', entityId: id, entityName: 'Q1',
      before: { ...faqSnapshot(faqRow(sqlite, id)!), answer: 'see https://discord.com/api/webhooks/1/abcdef' },
      after: faqSnapshot(faqRow(sqlite, id)!),
    })!
    assert.equal(entry(sqlite, redacted).undoable, false)
    assert.throws(() => undoAuditChange(sqlite, redacted, 1), (e: unknown) => e instanceof AuditUndoError && /redacted/.test(e.message))
    assert.throws(() => undoAuditChange(sqlite, 99999, 1), (e: unknown) => e instanceof AuditUndoError && e.status === 404)
  })

  it('parses and builds content cell ids', () => {
    assert.equal(cellId({ page: 'about', section: 'intro', key: 'title', locale: 'en' }), 'about/intro/title')
    assert.deepEqual(parseCellId('about/intro/title@de'), { page: 'about', section: 'intro', key: 'title', locale: 'de' })
    assert.equal(parseCellId('about/intro'), null)
  })
})
