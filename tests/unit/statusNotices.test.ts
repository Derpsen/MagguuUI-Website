import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { afterEach, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'
import { DATABASE_BOOTSTRAP_SQL, initializeDatabase } from '../../server/database/bootstrap'
import { recordAuditChange } from '../../server/utils/auditLog'
import { buildPublicStatus, clearPublicStatusCache } from '../../server/utils/siteStatus'
import {
  HISTORY_DAYS, MAX_NOTICE_ROWS, MAX_UPDATES_PER_NOTICE, NOTICE_BODY_MAX, NOTICE_TITLE_MAX, NoticeError, RESOLVED_KEEP_DAYS,
  appendStatusNoticeUpdate, canTransition, createStatusNotice, deleteStatusNotice, getStatusNotice, initialStatus,
  listAdminStatusNotices, noticeCreateSchema, noticeEditSchema, noticeEntrySchema, noticeSnapshot, pruneStatusNotices,
  publicNoticeRows, updateStatusNotice,
} from '../../server/utils/statusNoticeStore'
import { listActiveStatusNotices, listStatusHistory, registerStatusNoticeSource, resetStatusNoticeSources, toPublicNotice } from '../../server/utils/statusNotices'
import { renderNoticeMarkdown } from '../../utils/noticeMarkdown'

const DAY = 86400
const NOW = 1_800_000_000
const iso = (sec: number) => new Date(sec * 1000).toISOString()

function freshDb() {
  const sqlite = new Database(':memory:')
  initializeDatabase(sqlite)
  sqlite.prepare("INSERT INTO users (id, username, password_hash) VALUES (1, 'marco', 'x')").run()
  return sqlite
}
const create = (sqlite: Database.Database, over: Record<string, unknown> = {}, now = NOW) =>
  createStatusNotice(sqlite, noticeCreateSchema.parse({ kind: 'incident', title: 'Slow responses', startsAt: iso(now - 600), ...over }), 1, now)

afterEach(() => { resetStatusNoticeSources(); clearPublicStatusCache() })

describe('status notice migration', () => {
  it('is additive and idempotent on a production-like database', () => {
    const sqlite = new Database(':memory:')
    // The schema as production had it before item B: everything except the two new tables.
    sqlite.exec(DATABASE_BOOTSTRAP_SQL.replace(/-- Admin-written maintenance[\s\S]*?idx_status_notice_updates_notice ON status_notice_updates\(notice_id, id\);/, ''))
    const has = (name: string) => (sqlite.prepare('SELECT count(*) AS n FROM sqlite_master WHERE name = ?').get(name) as { n: number }).n
    assert.equal(has('status_notices'), 0)
    assert.equal(has('status_notice_updates'), 0)
    sqlite.prepare("INSERT INTO faqs (category, question, answer) VALUES ('general', 'Q', 'A')").run()
    sqlite.prepare("INSERT INTO status_samples (slot) VALUES (1800000000)").run()
    initializeDatabase(sqlite)
    initializeDatabase(sqlite)
    assert.equal(has('status_notices'), 1)
    assert.equal(has('status_notice_updates'), 1)
    assert.equal((sqlite.prepare('SELECT count(*) AS n FROM faqs').get() as { n: number }).n, 1)
    assert.equal((sqlite.prepare('SELECT count(*) AS n FROM status_samples').get() as { n: number }).n, 1)
    create(sqlite)
    initializeDatabase(sqlite)
    assert.equal(listAdminStatusNotices(sqlite).length, 1) // data survives another boot
  })
})

describe('validation', () => {
  it('accepts a minimal notice and applies defaults', () => {
    const v = noticeCreateSchema.parse({ kind: 'maintenance', title: '  Planned   work ', startsAt: '2026-10-26T08:00:00Z' })
    assert.equal(v.title, 'Planned work')
    assert.equal(v.body, '')
    assert.equal(v.component, null)
    assert.equal(v.endsAt, null)
    assert.equal(typeof v.startsAt, 'number')
  })

  it('enforces length limits, enums and date sanity', () => {
    const ok = { kind: 'incident', title: 'x', startsAt: '2026-10-26T08:00:00Z' }
    assert.ok(noticeCreateSchema.safeParse({ ...ok, title: 'x'.repeat(NOTICE_TITLE_MAX) }).success)
    assert.ok(!noticeCreateSchema.safeParse({ ...ok, title: 'x'.repeat(NOTICE_TITLE_MAX + 1) }).success)
    assert.ok(!noticeCreateSchema.safeParse({ ...ok, title: '   ' }).success)
    assert.ok(!noticeCreateSchema.safeParse({ ...ok, body: 'x'.repeat(NOTICE_BODY_MAX + 1) }).success)
    assert.ok(noticeCreateSchema.safeParse({ ...ok, body: 'x'.repeat(NOTICE_BODY_MAX) }).success)
    assert.ok(!noticeCreateSchema.safeParse({ ...ok, kind: 'outage' }).success)
    assert.ok(!noticeCreateSchema.safeParse({ ...ok, component: 'plex' }).success)
    assert.ok(!noticeCreateSchema.safeParse({ ...ok, status: 'done' }).success)
    assert.ok(!noticeCreateSchema.safeParse({ ...ok, startsAt: 'tomorrow' }).success)
    assert.ok(!noticeCreateSchema.safeParse({ ...ok, startsAt: '1999-01-01T00:00:00Z' }).success)
    assert.ok(!noticeCreateSchema.safeParse({ ...ok, startsAt: '2200-01-01T00:00:00Z' }).success)
    assert.ok(!noticeCreateSchema.safeParse({ ...ok, extra: 1 }).success, 'unknown keys are rejected')
    for (const c of ['website', 'database', 'content', null]) assert.ok(noticeCreateSchema.safeParse({ ...ok, component: c }).success, String(c))
  })

  it('strips control characters; titles stay on one line, bodies keep newlines', () => {
    const v = noticeCreateSchema.parse({ kind: 'incident', title: 'a\nb\u0000c\u0007', body: 'l1\r\nl2\u0000\tx', startsAt: '2026-10-26T08:00:00Z' })
    assert.equal(v.title, 'a b c')
    assert.equal(v.body, 'l1\nl2 \tx')
  })

  it('edit and entry schemas are partial and strict', () => {
    assert.deepEqual(noticeEditSchema.parse({}), {})
    assert.ok(!noticeEditSchema.safeParse({ status: 'resolved' }).success, 'status changes go through timeline entries')
    assert.ok(!noticeEntrySchema.safeParse({ body: 'x'.repeat(1001) }).success)
    assert.equal(noticeEntrySchema.parse({ status: 'resolved' }).body, '')
  })

  it('rejects an end that is not after the start, on create and on edit', () => {
    const sqlite = freshDb()
    assert.throws(() => create(sqlite, { endsAt: iso(NOW - 600) }), (e: unknown) => e instanceof NoticeError && e.status === 422)
    const n = create(sqlite)
    assert.throws(() => updateStatusNotice(sqlite, n.id, noticeEditSchema.parse({ endsAt: iso(NOW - 3600) }), NOW), NoticeError)
  })
})

describe('state transitions', () => {
  it('allows only the documented moves', () => {
    const ok: Array<[string, string]> = [['scheduled', 'in_progress'], ['scheduled', 'resolved'], ['in_progress', 'monitoring'], ['in_progress', 'resolved'], ['monitoring', 'in_progress'], ['monitoring', 'resolved'], ['resolved', 'in_progress']]
    for (const [a, b] of ok) assert.ok(canTransition(a as never, b as never), `${a} -> ${b}`)
    for (const [a, b] of [['in_progress', 'scheduled'], ['monitoring', 'scheduled'], ['resolved', 'monitoring'], ['resolved', 'scheduled'], ['scheduled', 'monitoring'], ['in_progress', 'in_progress']]) {
      assert.ok(!canTransition(a as never, b as never), `${a} -> ${b}`)
    }
  })

  it('picks a sensible initial status and never schedules an incident', () => {
    assert.equal(initialStatus('maintenance', NOW + 3600, NOW), 'scheduled')
    assert.equal(initialStatus('maintenance', NOW - 60, NOW), 'in_progress')
    assert.equal(initialStatus('incident', NOW + 3600, NOW), 'in_progress')
    assert.equal(initialStatus('incident', NOW, NOW, 'monitoring'), 'monitoring')
    assert.throws(() => initialStatus('incident', NOW, NOW, 'scheduled'), NoticeError)
  })

  it('walks a notice through its life and records resolved_at only while resolved', () => {
    const sqlite = freshDb()
    const n = create(sqlite)
    assert.equal(n.status, 'in_progress')
    const step = (status: string | undefined, body = '', at = NOW) =>
      appendStatusNoticeUpdate(sqlite, n.id, noticeEntrySchema.parse({ status, body }), 1, at).after
    assert.equal(step('monitoring', 'Fix deployed', NOW + 60).status, 'monitoring')
    const done = step('resolved', '', NOW + 120)
    assert.equal(done.status, 'resolved')
    assert.equal(done.resolvedAt, iso(NOW + 120))
    const reopened = step('in_progress', 'Back again', NOW + 180)
    assert.equal(reopened.status, 'in_progress')
    assert.equal(reopened.resolvedAt, null)
    assert.deepEqual(reopened.updates.map(u => [u.status, u.body]), [['monitoring', 'Fix deployed'], ['resolved', ''], ['in_progress', 'Back again']])
    assert.throws(() => step('scheduled'), NoticeError)
  })

  it('a text-only update keeps the status; an empty update is rejected', () => {
    const sqlite = freshDb()
    const n = create(sqlite)
    const after = appendStatusNoticeUpdate(sqlite, n.id, noticeEntrySchema.parse({ body: 'Still looking' }), 1, NOW).after
    assert.equal(after.status, 'in_progress')
    assert.equal(after.updates.length, 1)
    assert.throws(() => appendStatusNoticeUpdate(sqlite, n.id, noticeEntrySchema.parse({}), 1, NOW), (e: unknown) => e instanceof NoticeError && e.status === 422)
    assert.throws(() => appendStatusNoticeUpdate(sqlite, n.id, noticeEntrySchema.parse({ status: 'in_progress' }), 1, NOW), NoticeError, 'same status without text')
    assert.throws(() => appendStatusNoticeUpdate(sqlite, 999, noticeEntrySchema.parse({ body: 'x' }), 1, NOW), (e: unknown) => e instanceof NoticeError && e.status === 404)
  })

  it('the timeline is append-only and capped', () => {
    const sqlite = freshDb()
    const n = create(sqlite)
    for (let i = 0; i < MAX_UPDATES_PER_NOTICE; i++) appendStatusNoticeUpdate(sqlite, n.id, noticeEntrySchema.parse({ body: `u${i}` }), 1, NOW + i)
    assert.throws(() => appendStatusNoticeUpdate(sqlite, n.id, noticeEntrySchema.parse({ body: 'one too many' }), 1, NOW), (e: unknown) => e instanceof NoticeError && e.status === 409)
    // editing the notice never touches the timeline
    updateStatusNotice(sqlite, n.id, noticeEditSchema.parse({ title: 'Renamed' }), NOW + 100)
    const after = getStatusNotice(sqlite, n.id)!
    assert.equal(after.updates.length, MAX_UPDATES_PER_NOTICE)
    assert.equal(after.updates[0]!.body, 'u0')
    // there is no code path that edits or deletes a single entry
    const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../server/utils/statusNoticeStore.ts'), 'utf8')
    assert.doesNotMatch(src, /UPDATE status_notice_updates/)
    assert.equal((src.match(/DELETE FROM status_notice_updates/g) ?? []).length, 2, 'only the notice delete and the retention prune remove timeline rows')
  })

  it('an incident cannot be edited into a scheduled state, and the table is capped', () => {
    const sqlite = freshDb()
    const m = create(sqlite, { kind: 'maintenance', startsAt: iso(NOW + DAY) })
    assert.equal(m.status, 'scheduled')
    assert.throws(() => updateStatusNotice(sqlite, m.id, noticeEditSchema.parse({ kind: 'incident' }), NOW), (e: unknown) => e instanceof NoticeError && e.status === 422)
    const ins = sqlite.prepare("INSERT INTO status_notices (kind, status, title, starts_at) VALUES ('incident', 'in_progress', 't', ?)")
    for (let i = 0; i < MAX_NOTICE_ROWS - 1; i++) ins.run(NOW)
    assert.throws(() => create(sqlite), (e: unknown) => e instanceof NoticeError && e.status === 409)
  })
})

describe('markdown sanitization', () => {
  it('renders the limited subset', () => {
    assert.match(renderNoticeMarkdown('**bold** and _italic_ and `code`'), /<strong>bold<\/strong> and <em>italic<\/em> and <code>code<\/code>/)
    assert.match(renderNoticeMarkdown('- a\n- b'), /<ul>\s*<li>a<\/li>\s*<li>b<\/li>\s*<\/ul>/)
    assert.match(renderNoticeMarkdown('line1\nline2'), /line1<br ?\/>line2/)
    assert.equal(renderNoticeMarkdown('   '), '')
  })

  it('never lets markup, scripts, handlers or dangerous URLs through', () => {
    const payloads = [
      '<script>alert(1)</script>',
      '<img src=x onerror=alert(1)>',
      '<svg onload=alert(1)></svg>',
      '<iframe src="https://evil.test"></iframe>',
      '<a href="javascript:alert(1)">x</a>',
      '[x](javascript:alert(1))',
      '[x](JaVaScRiPt:alert(1))',
      '[x](data:text/html;base64,PHNjcmlwdD4=)',
      '[x](vbscript:msgbox(1))',
      '[x](//evil.test/path)',
      '![i](https://evil.test/x.png)',
      '<style>body{display:none}</style>',
      '<div onclick="x()">d</div>',
      '"><script>alert(1)</script>',
      '<a href="https://ok.test" onclick="x()">y</a>',
      '[a](https://ok.test "t\\" onmouseover=\\"alert(1)")',
      '<details open ontoggle=alert(1)>',
      '&lt;script&gt;alert(1)&lt;/script&gt;',
    ]
    for (const p of payloads) {
      const html = renderNoticeMarkdown(p)
      // Escaped text such as "&lt;img onerror=..." is harmless; what matters is the REAL tags in the output.
      for (const tag of html.match(/<[^>]*>/g) ?? []) {
        const name = /^<\/?([a-z0-9]+)/i.exec(tag)?.[1]?.toLowerCase()
        assert.ok(name && ['p', 'br', 'strong', 'em', 'del', 'code', 'pre', 'ul', 'ol', 'li', 'blockquote', 'a'].includes(name), `${p} -> ${tag}`)
        if (name === 'a' && !tag.startsWith('</')) {
          assert.match(tag, /^<a href="(https?:\/\/|mailto:)[^"]*" rel="noopener noreferrer nofollow" target="_blank">$/, `${p} -> ${tag}`)
        } else {
          assert.doesNotMatch(tag, /\s[a-z-]+=/i, `${p} -> ${tag} carries an attribute`)
        }
      }
    }
  })

  it('shows raw HTML as text, escaped', () => {
    const html = renderNoticeMarkdown('Use <b>care</b> & <script>x</script>')
    assert.match(html, /&lt;b&gt;care&lt;\/b&gt;/)
    assert.match(html, /&lt;script&gt;x&lt;\/script&gt;/)
    assert.doesNotMatch(html, /<b>|<script/)
  })

  it('external links are safe: https/mailto only, rel and target forced', () => {
    const html = renderNoticeMarkdown('[ok](https://example.org) [mail](mailto:a@example.org) <a href="https://x.test" target="_self" rel="opener">raw</a>')
    assert.match(html, /<a href="https:\/\/example\.org" rel="noopener noreferrer nofollow" target="_blank">ok<\/a>/)
    assert.match(html, /<a href="mailto:a@example\.org" rel="noopener noreferrer nofollow" target="_blank">mail<\/a>/)
    const anchors = html.match(/<a\b[^>]*>/g) ?? []
    assert.equal(anchors.length, 2, 'the raw anchor is text, not a link')
    for (const a of anchors) assert.doesNotMatch(a, /rel="opener"|target="_self"/)
    assert.equal(renderNoticeMarkdown('[x](javascript:alert(1))'), '<p>x</p>', 'a rejected link keeps its text, not the link')
  })

  it('caps the work done for oversized input', () => {
    const html = renderNoticeMarkdown('a'.repeat(1_000_000))
    assert.ok(html.length < 6000)
  })
})

describe('public registry, history window and whitelist', () => {
  const asSource = (sqlite: Database.Database) => registerStatusNoticeSource(now => publicNoticeRows(sqlite, now))

  it('splits active and history, newest resolution first, 90 days only', () => {
    const sqlite = freshDb()
    const upcoming = create(sqlite, { kind: 'maintenance', title: 'Upcoming', startsAt: iso(NOW + DAY) })
    const ongoing = create(sqlite, { title: 'Ongoing incident' })
    const monitoring = create(sqlite, { kind: 'maintenance', title: 'Window', startsAt: iso(NOW - 3600), status: 'monitoring' })
    const recent = create(sqlite, { title: 'Recent', startsAt: iso(NOW - 5 * DAY) }, NOW - 5 * DAY)
    appendStatusNoticeUpdate(sqlite, recent.id, noticeEntrySchema.parse({ status: 'resolved', body: 'Fixed' }), 1, NOW - 4 * DAY)
    const older = create(sqlite, { title: 'Older', startsAt: iso(NOW - 40 * DAY) }, NOW - 40 * DAY)
    appendStatusNoticeUpdate(sqlite, older.id, noticeEntrySchema.parse({ status: 'resolved' }), 1, NOW - 30 * DAY)
    const edge = create(sqlite, { title: 'Just inside', startsAt: iso(NOW - 95 * DAY) }, NOW - 95 * DAY)
    appendStatusNoticeUpdate(sqlite, edge.id, noticeEntrySchema.parse({ status: 'resolved' }), 1, NOW - HISTORY_DAYS * DAY + 60)
    const old = create(sqlite, { title: 'Too old', startsAt: iso(NOW - 120 * DAY) }, NOW - 120 * DAY)
    appendStatusNoticeUpdate(sqlite, old.id, noticeEntrySchema.parse({ status: 'resolved' }), 1, NOW - HISTORY_DAYS * DAY - 60)
    asSource(sqlite)

    assert.deepEqual(listActiveStatusNotices(NOW).map(n => n.title), ['Ongoing incident', 'Window', 'Upcoming'])
    assert.deepEqual(listStatusHistory(NOW).map(n => n.title), ['Recent', 'Older', 'Just inside'])
    const status = buildPublicStatus(sqlite, NOW)
    assert.equal(status.notices.length, 3)
    assert.equal(status.history.length, 3)
    void upcoming; void ongoing; void monitoring
  })

  it('exposes the timeline oldest first and renders each entry as sanitized HTML', () => {
    const sqlite = freshDb()
    const n = create(sqlite, { body: 'We are **investigating**.' })
    appendStatusNoticeUpdate(sqlite, n.id, noticeEntrySchema.parse({ status: 'monitoring', body: 'Fix is out.' }), 1, NOW)
    appendStatusNoticeUpdate(sqlite, n.id, noticeEntrySchema.parse({ status: 'resolved', body: '<script>alert(1)</script>All good' }), 1, NOW + 60)
    asSource(sqlite)
    const [h] = listStatusHistory(NOW + 120)
    assert.match(h!.bodyHtml, /<strong>investigating<\/strong>/)
    assert.deepEqual(h!.updates.map(u => u.status), ['monitoring', 'resolved'])
    assert.match(h!.updates[1]!.bodyHtml, /&lt;script&gt;/)
    assert.doesNotMatch(JSON.stringify(h), /<script/)
  })

  it('whitelist: only public fields leave, with nothing internal, even for hostile content', () => {
    const sqlite = freshDb()
    const n = create(sqlite, { title: 'Database maintenance', body: '[docs](https://example.org) <img src=x onerror=alert(1)>', component: 'database' })
    appendStatusNoticeUpdate(sqlite, n.id, noticeEntrySchema.parse({ body: 'Update text' }), 1, NOW)
    create(sqlite, { kind: 'maintenance', title: 'Planned', startsAt: iso(NOW + DAY) })
    asSource(sqlite)
    const status = buildPublicStatus(sqlite, NOW)
    assert.deepEqual(Object.keys(status).sort(), ['checkedAt', 'components', 'history', 'notices', 'status', 'uptime'])
    const noticeKeys = ['bodyHtml', 'component', 'endsAt', 'id', 'kind', 'resolvedAt', 'startsAt', 'status', 'title', 'updates']
    for (const x of [...status.notices, ...status.history]) {
      assert.deepEqual(Object.keys(x).sort(), noticeKeys)
      for (const u of x.updates) assert.deepEqual(Object.keys(u).sort(), ['at', 'bodyHtml', 'status'])
    }
    const json = JSON.stringify(status)
    for (const bad of [/created_?by/i, /updated_?at|createdAt/i, /userId|user_id|username|marco/i, /unraid|docker|container|plex|discord|bot\b/i, /localhost|127\.0\.0\.1/i, /<(img|script|iframe)\b/i, /uptimeSeconds|startedAt|version|sha\b/i]) {
      assert.doesNotMatch(json, bad, String(bad))
    }
  })

  it('a raw row with extra columns is cut down by toPublicNotice', () => {
    const out = toPublicNotice({ id: 7, kind: 'incident', status: 'in_progress', title: 'T', body: 'b', startsAt: NOW, createdBy: 1, token: 'secret', updates: [{ at: NOW, status: 'monitoring', body: 'u', createdBy: 1 }, 'junk'] })!
    assert.deepEqual(Object.keys(out).sort(), ['bodyHtml', 'component', 'endsAt', 'id', 'kind', 'resolvedAt', 'startsAt', 'status', 'title', 'updates'])
    assert.deepEqual(Object.keys(out.updates[0]!).sort(), ['at', 'bodyHtml', 'status'])
    assert.equal(out.updates.length, 1)
    assert.equal(out.component, null)
    assert.equal(toPublicNotice({ id: 1, kind: 'incident', status: 'resolved', title: 'T', startsAt: NOW }), null, 'resolved needs a resolution time')
    assert.equal(toPublicNotice({ id: 1, kind: 'incident', status: 'bogus', title: 'T', startsAt: NOW }), null)
  })

  it('a database failure in the source never breaks the page payload', () => {
    registerStatusNoticeSource(() => { throw new Error('db gone') })
    const status = buildPublicStatus(freshDb(), NOW)
    assert.deepEqual([status.notices, status.history], [[], []])
  })
})

describe('retention and deletion', () => {
  it('prunes resolved notices after a year, with their timelines; open ones stay', () => {
    const sqlite = freshDb()
    const old = create(sqlite, {}, NOW - 400 * DAY)
    appendStatusNoticeUpdate(sqlite, old.id, noticeEntrySchema.parse({ status: 'resolved', body: 'done' }), 1, NOW - (RESOLVED_KEEP_DAYS + 5) * DAY)
    const fresh = create(sqlite, {}, NOW - 10 * DAY)
    appendStatusNoticeUpdate(sqlite, fresh.id, noticeEntrySchema.parse({ status: 'resolved' }), 1, NOW - 9 * DAY)
    const open = create(sqlite, {}, NOW - 500 * DAY)
    assert.equal(pruneStatusNotices(sqlite, NOW), 1)
    assert.deepEqual(listAdminStatusNotices(sqlite).map(n => n.id).sort(), [fresh.id, open.id].sort())
    assert.equal((sqlite.prepare('SELECT count(*) AS n FROM status_notice_updates WHERE notice_id = ?').get(old.id) as { n: number }).n, 0)
    assert.equal(pruneStatusNotices(sqlite, NOW), 0)
  })

  it('delete removes the notice and its timeline and returns the before-state', () => {
    const sqlite = freshDb()
    const n = create(sqlite)
    appendStatusNoticeUpdate(sqlite, n.id, noticeEntrySchema.parse({ body: 'x' }), 1, NOW)
    const before = deleteStatusNotice(sqlite, n.id)
    assert.equal(before.updates.length, 1)
    assert.equal(getStatusNotice(sqlite, n.id), null)
    assert.equal((sqlite.prepare('SELECT count(*) AS n FROM status_notice_updates').get() as { n: number }).n, 0)
    assert.throws(() => deleteStatusNotice(sqlite, n.id), (e: unknown) => e instanceof NoticeError && e.status === 404)
  })
})

describe('audit', () => {
  it('writes redacted snapshots: secrets in the text never reach audit_changes', () => {
    const sqlite = freshDb()
    const n = create(sqlite, { body: 'Contact via https://hooks.slack.com/services/T000/B000/XXXX or https://example.org/x?token=abc123def456 and Bearer abcdefghijklmnop' })
    const id = recordAuditChange(sqlite, { action: 'created', entityType: 'status_notice', entityId: n.id, entityName: n.title, before: null, after: noticeSnapshot(n), userId: 1 })
    assert.ok(id)
    const row = sqlite.prepare('SELECT entity_type, after_json FROM audit_changes WHERE id = ?').get(id) as { entity_type: string, after_json: string }
    assert.equal(row.entity_type, 'status_notice')
    assert.doesNotMatch(row.after_json, /hooks\.slack\.com|abc123def456|abcdefghijklmnop/)
    assert.match(row.after_json, /\[redacted\]/)
    assert.match(row.after_json, /"title":"Slow responses"/)
  })

  it('snapshots include the timeline, so an appended update shows up as a diff', () => {
    const sqlite = freshDb()
    const n = create(sqlite)
    const { before, after } = appendStatusNoticeUpdate(sqlite, n.id, noticeEntrySchema.parse({ body: 'Looking' }), 1, NOW)
    assert.notDeepEqual(noticeSnapshot(before), noticeSnapshot(after))
    assert.equal(noticeSnapshot(after).updates.length, 1)
    assert.ok(recordAuditChange(sqlite, { action: 'updated', entityType: 'status_notice', entityId: n.id, entityName: n.title, before: noticeSnapshot(before), after: noticeSnapshot(after), userId: 1 }))
  })
})

describe('admin endpoints', () => {
  const dir = join(dirname(fileURLToPath(import.meta.url)), '../../server/api/v1/admin/status-notices')
  const files = (d: string): string[] => readdirSync(d).flatMap(f => statSync(join(d, f)).isDirectory() ? files(join(d, f)) : [join(d, f)])

  it('every handler requires admin access first, and every write audits and clears the public cache', () => {
    const all = files(dir)
    assert.equal(all.length, 5)
    for (const f of all) {
      const src = readFileSync(f, 'utf8')
      const body = src.slice(src.indexOf('defineEventHandler'))
      assert.match(body, /defineEventHandler\((async )?\(event\) => \{\s*(const auth = )?requireAdminAccess\(event\)/, `${f} authenticates in the handler`)
      if (!f.endsWith('.get.ts')) {
        assert.match(src, /recordAuditSafe\(sqlite, \{[^}]*entityType: 'status_notice'/, `${f} audits`)
        assert.match(src, /clearPublicStatusCache\(\)/, `${f} clears the public cache`)
        assert.match(src, /userId: auth\.userId/, `${f} records the actor`)
      }
    }
  })
})
