import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { describe, it } from 'node:test'
import Database from 'better-sqlite3'
import { initializeDatabase } from '../../server/database/bootstrap'
import { AUDIT_TYPES, recordAuditChange } from '../../server/utils/auditLog'
import {
  DAILY_CAP, MAX_FORM_AGE_SECONDS, MIN_FORM_SECONDS, NAME_MAX, NOTE_MAX, PENDING_CAP, PENDING_KEEP_DAYS, PresetError,
  REJECTED_KEEP_DAYS, STRING_MAX, STRING_MAX_LINES, STRING_MIN, cleanLine, contentHash, createReplayGuard, createWindowLimiter,
  deletePreset, getAdminPreset, getPublicPresetString, isKnownAddon, issueFormToken, labelEditSchema, listAdminPresets,
  listPublicPresets, presetCounts, presetSnapshot, prunePresets, submissionSchema, submitPreset, updatePreset,
  verifyFormToken, visibleAddonNames,
} from '../../server/utils/communityPresets'
import { isCopyTarget, recordCopy, anonymousKey } from '../../server/utils/analytics'
import { parseCopyTarget } from '../../utils/trackingRules'
import { PRIVACY_DEFAULTS, mergePageCopy } from '../../utils/pageCopyDefaults'

const DAY = 86400
const NOW = 1_800_000_000
const SECRET = 'unit-test-secret'
const STR = '!PLATER:2!Abcdefghijklmnopqrstuvwxyz0123456789+/='

function freshDb() {
  const sqlite = new Database(':memory:')
  initializeDatabase(sqlite)
  sqlite.prepare("INSERT INTO users (id, username, password_hash) VALUES (1, 'marco', 'x')").run()
  sqlite.prepare("INSERT INTO addons (slug, name, is_visible, is_available) VALUES ('plater', 'Plater', 1, 1), ('hidden', 'Hidden Addon', 0, 1), ('gone', 'Gone Addon', 1, 0)").run()
  return sqlite
}

const valid = (over: Record<string, unknown> = {}) => submissionSchema.parse({
  name: 'My tank nameplates', addon: 'Plater', presetString: STR, note: 'Works well in M+', testedVersion: 'Plater 12.0.4', token: 'x', ...over,
})
const submit = (sqlite: Database.Database, over: Record<string, unknown> = {}, now = NOW) => submitPreset(sqlite, valid(over), now)
const issues = (over: Record<string, unknown>) => {
  const r = submissionSchema.safeParse({ name: 'Nice name', addon: 'Plater', presetString: STR, token: 'x', ...over })
  return r.success ? [] : r.error.issues.map(i => i.message)
}

describe('community presets: migration', () => {
  it('is additive and idempotent, and stores no IP or user agent', () => {
    const sqlite = freshDb()
    initializeDatabase(sqlite)
    initializeDatabase(sqlite)
    const cols = (sqlite.prepare('PRAGMA table_info(community_presets)').all() as Array<{ name: string }>).map(c => c.name).sort()
    assert.deepEqual(cols, ['addon', 'content_hash', 'created_at', 'id', 'name', 'note', 'preset_string', 'reviewed_at', 'reviewed_by', 'status', 'tested_version'])
    assert.ok(!cols.some(c => /ip|agent|ua|email|contact/.test(c)))
  })
})

describe('validation', () => {
  it('accepts a normal submission and normalises whitespace', () => {
    const v = valid({ name: '  My   tank\tnameplates ', note: '', testedVersion: '' })
    assert.equal(v.name, 'My tank nameplates')
    assert.equal(v.note, '')
    assert.equal(v.testedVersion, '')
  })

  it('enforces strict size limits', () => {
    assert.ok(issues({ name: 'ab' }).length)
    assert.ok(issues({ name: 'x'.repeat(NAME_MAX + 1) }).length)
    assert.deepEqual(issues({ name: 'x'.repeat(NAME_MAX) }), [])
    assert.ok(issues({ note: 'n'.repeat(NOTE_MAX + 1) }).length)
    assert.ok(issues({ presetString: 'a'.repeat(STRING_MIN - 1) }).length)
    assert.ok(issues({ presetString: 'a'.repeat(STRING_MAX + 1) }).length)
    assert.deepEqual(issues({ presetString: 'a'.repeat(STRING_MAX) }), [])
    assert.ok(issues({ presetString: Array.from({ length: STRING_MAX_LINES + 1 }, () => 'abcdefghij').join('\n') }).length)
    assert.ok(issues({ addon: '' }).length)
    assert.ok(issues({ testedVersion: 'v'.repeat(41) }).length)
  })

  it('rejects unknown fields (strict)', () => {
    assert.ok(issues({ isAdmin: true, status: 'approved' }).length)
  })

  it('strips control and format characters from the short fields', () => {
    assert.equal(cleanLine('a\u0000b\u200Bc\u202Ed\r\ne\u2028f'), 'a bcd e f')
    assert.equal(cleanLine('\uFEFF  Tank  \u0007 '), 'Tank')
    assert.equal(cleanLine('lone \uD800 surrogate'), 'lone surrogate')
    assert.equal(valid({ name: 'Ti\u200Bde\u202E nameplates' }).name, 'Tide nameplates')
  })

  it('rejects, rather than edits, a preset string with hidden characters', () => {
    for (const bad of ['\u0000', '\u200B', '\u202E', '\u0007', '\uFEFF']) {
      assert.ok(issues({ presetString: `${STR}${bad}${STR}` }).some(m => /not allowed/.test(m)), JSON.stringify(bad))
    }
    // Line breaks and tabs are fine, CRLF is normalised.
    const ok = valid({ presetString: `${STR}\r\n${STR}\t${STR}` })
    assert.equal(ok.presetString, `${STR}\n${STR}\t${STR}`)
  })

  it('refuses links and addresses in the short fields', () => {
    for (const bad of ['see https://evil.example/x', 'http://x', 'www.evil.com', 'evil.ru/x', 'me@example.org', '//evil.example']) {
      assert.ok(issues({ name: bad }).length, `name: ${bad}`)
      assert.ok(issues({ note: bad }).length, `note: ${bad}`)
    }
    assert.deepEqual(issues({ note: 'Version 11.2.0 or newer, 1920x1080' }), [])
  })

  it('validates the tested version pattern', () => {
    for (const ok of ['', '12.0.4', 'Plater 12.0.4', 'v2.1 (beta)', 'r1234-release', 'Midnight 12.0.1 / TWW']) assert.deepEqual(issues({ testedVersion: ok }), [], ok)
    for (const bad of ['-1', '.5', '<b>1</b>', '1;DROP TABLE', 'x'.repeat(50), '1\u0000.2<']) assert.ok(issues({ testedVersion: bad }).length, bad)
  })

  it('keeps XSS payloads as inert text (escaping happens at render time)', () => {
    const payloads = ['<script>alert(1)</script>', '"><img src=x onerror=alert(1)>', '[x](javascript:alert(1))', '{{7*7}}', '<svg/onload=alert(1)>']
    for (const p of payloads) {
      const v = valid({ name: `Name ${p}`, note: p, presetString: `${STR} ${p}` })
      assert.ok(v.name.includes('<') || v.name.includes('{') || v.name.includes('['))
      // Stored verbatim: nothing is rewritten or interpreted as Markdown/HTML on the way in.
      assert.ok(v.presetString.includes(p))
    }
  })
})

describe('form token (time-trap)', () => {
  const t0 = NOW * 1000
  it('rejects a token that is too fresh, accepts it in the window, rejects it when old', () => {
    const token = issueFormToken(SECRET, t0)
    assert.deepEqual(verifyFormToken(SECRET, token, t0 + 1000), { ok: false, problem: 'too_fast' })
    assert.deepEqual(verifyFormToken(SECRET, token, t0 + (MIN_FORM_SECONDS - 1) * 1000), { ok: false, problem: 'too_fast' })
    const ok = verifyFormToken(SECRET, token, t0 + MIN_FORM_SECONDS * 1000)
    assert.equal(ok.ok, true)
    assert.equal(verifyFormToken(SECRET, token, t0 + MAX_FORM_AGE_SECONDS * 1000).ok, true)
    assert.deepEqual(verifyFormToken(SECRET, token, t0 + (MAX_FORM_AGE_SECONDS + 2) * 1000), { ok: false, problem: 'expired' })
  })

  it('detects tampering, another secret, and malformed values', () => {
    const token = issueFormToken(SECRET, t0)
    const [iat, nonce, sig] = token.split('.') as [string, string, string]
    const later = t0 + 60_000
    assert.equal(verifyFormToken(SECRET, `${Number(iat) - 600}.${nonce}.${sig}`, later).ok, false) // backdated to dodge the time-trap
    assert.deepEqual(verifyFormToken(SECRET, `${iat}.${nonce}.${'0'.repeat(40)}`, later), { ok: false, problem: 'signature' })
    assert.deepEqual(verifyFormToken('other-secret', token, later), { ok: false, problem: 'signature' })
    for (const bad of [undefined, null, 42, '', 'a.b.c', `${token}x`, 'x'.repeat(500), {}]) {
      assert.deepEqual(verifyFormToken(SECRET, bad, later), { ok: false, problem: 'malformed' })
    }
  })

  it('tokens are single-use through the replay guard', () => {
    const guard = createReplayGuard(3, 1000)
    assert.equal(guard.consume('a', 0), true)
    assert.equal(guard.consume('a', 10), false)
    assert.equal(guard.consume('b', 10), true)
    assert.equal(guard.consume('c', 10), true)
    assert.equal(guard.consume('d', 20), false) // full of live nonces: refuse, do not grow
    assert.equal(guard.size(), 3)
    assert.equal(guard.consume('d', 5000), true) // old nonces purged
  })
})

describe('rate limiting (in memory, opaque keys)', () => {
  it('limits per key within a window and resets afterwards', () => {
    const l = createWindowLimiter(3, 1000)
    assert.deepEqual([1, 2, 3, 4, 5].map(i => l.hit('k', i)), [true, true, true, false, false])
    assert.equal(l.hit('other', 6), true)
    assert.equal(l.hit('k', 1500), true)
  })
  it('is bounded in size', () => {
    const l = createWindowLimiter(1, 1000, 3)
    assert.deepEqual(['a', 'b', 'c'].map(k => l.hit(k, 1)), [true, true, true])
    assert.equal(l.hit('d', 2), true) // full: the oldest is evicted instead of refusing everybody
    assert.equal(l.size(), 3)
    assert.equal(l.hit('e', 5000), true) // expired windows are purged
    assert.ok(l.size() <= 3)
  })
  it('the visitor key is a salted hash, not the address', () => {
    const k = anonymousKey(Buffer.from('salt'), '203.0.113.9')
    assert.ok(!k.includes('203.0.113'))
    assert.notEqual(k, anonymousKey(Buffer.from('salt2'), '203.0.113.9'))
  })
})

describe('storage, duplicates and caps', () => {
  it('stores a pending row with no IP or UA and answers a duplicate without a second row', () => {
    const sqlite = freshDb()
    assert.equal(submit(sqlite), 'created')
    // Same addon, same string (different case of addon, extra whitespace, other label) is a duplicate.
    assert.equal(submit(sqlite, { addon: 'PLATER', name: 'Another name', presetString: ` ${STR.replace('Abc', 'A b c')} ` }), 'duplicate')
    assert.equal((sqlite.prepare('SELECT COUNT(*) AS c FROM community_presets').get() as { c: number }).c, 1)
    const row = sqlite.prepare('SELECT * FROM community_presets').get() as Record<string, unknown>
    assert.equal(row.status, 'pending')
    assert.equal(row.content_hash, contentHash('Plater', STR))
    assert.equal(submit(sqlite, { addon: 'Other' }), 'created') // same string for another addon is not a duplicate
  })

  it('applies the daily cap and the pending queue cap', () => {
    const sqlite = freshDb()
    for (let i = 0; i < DAILY_CAP; i++) assert.equal(submit(sqlite, { presetString: `${STR}-${i}` }), 'created')
    assert.equal(submit(sqlite, { presetString: `${STR}-next` }), 'daily_cap')
    assert.equal(submit(sqlite, { presetString: `${STR}-tomorrow` }, NOW + DAY), 'created')

    const q = freshDb()
    const ins = q.prepare("INSERT INTO community_presets (name, addon, preset_string, status, content_hash, created_at) VALUES ('n', 'Plater', 's', 'pending', ?, ?)")
    for (let i = 0; i < PENDING_CAP; i++) ins.run(`h${i}`, NOW - 5 * DAY - i)
    assert.equal(submit(q), 'queue_full')
  })

  it('knows which addons can be chosen (visible and available only)', () => {
    const sqlite = freshDb()
    assert.deepEqual(visibleAddonNames(sqlite), ['Plater'])
    assert.equal(isKnownAddon(sqlite, 'Plater'), true)
    assert.equal(isKnownAddon(sqlite, 'Hidden Addon'), false)
    assert.equal(isKnownAddon(sqlite, 'Gone Addon'), false)
    assert.equal(isKnownAddon(sqlite, 'Nope'), false)
  })
})

describe('moderation and the public list', () => {
  it('shows only approved rows, whitelisted, and serves the string only for approved ids', () => {
    const sqlite = freshDb()
    submit(sqlite, { presetString: `${STR}-1`, name: 'First one' })
    submit(sqlite, { presetString: `${STR}-2`, name: 'Second one' })
    submit(sqlite, { presetString: `${STR}-3`, name: 'Third one' })
    assert.deepEqual(listPublicPresets(sqlite), [])
    assert.equal(getPublicPresetString(sqlite, 1), null)

    updatePreset(sqlite, 1, { status: 'approved' }, 1, NOW + 10)
    updatePreset(sqlite, 2, { status: 'rejected' }, 1, NOW + 10)
    const list = listPublicPresets(sqlite)
    assert.equal(list.length, 1)
    assert.deepEqual(Object.keys(list[0]!).sort(), ['addon', 'id', 'name', 'note', 'stringLength', 'testedVersion'])
    assert.equal(getPublicPresetString(sqlite, 1)?.string, `${STR}-1`)
    assert.equal(getPublicPresetString(sqlite, 2), null)
    assert.equal(getPublicPresetString(sqlite, 3), null)
    assert.deepEqual(presetCounts(sqlite), { pending: 1, approved: 1, rejected: 1 })

    updatePreset(sqlite, 1, { status: 'pending' }, 1) // reopen hides it again
    assert.deepEqual(listPublicPresets(sqlite), [])
  })

  it('edits the label only, keeps the string, records the reviewer on a status change', () => {
    const sqlite = freshDb()
    submit(sqlite)
    const r1 = updatePreset(sqlite, 1, { name: 'Better name', note: 'Edited', testedVersion: '13.0' }, 1, NOW + 5)
    assert.equal(r1.after.name, 'Better name')
    assert.equal(r1.after.status, 'pending')
    assert.equal(r1.after.reviewedAt, null)
    assert.equal(getAdminPreset(sqlite, 1).presetString, STR)
    const r2 = updatePreset(sqlite, 1, { status: 'approved' }, 1, NOW + 60)
    assert.equal(new Date(r2.after.reviewedAt!).getTime() / 1000, NOW + 60)
    assert.equal((sqlite.prepare('SELECT reviewed_by FROM community_presets').get() as { reviewed_by: number }).reviewed_by, 1)
    assert.ok(labelEditSchema.safeParse({ presetString: 'new' }).success === false) // the string is not editable
    assert.ok(labelEditSchema.safeParse({}).success === false)
    assert.ok(labelEditSchema.safeParse({ name: 'see http://x.y' }).success === false)
    assert.ok(labelEditSchema.safeParse({ status: 'weird' }).success === false)
  })

  it('deletes, and reports missing ids as not found', () => {
    const sqlite = freshDb()
    submit(sqlite)
    assert.equal(deletePreset(sqlite, 1).name, 'My tank nameplates')
    assert.equal(listAdminPresets(sqlite).length, 0)
    for (const f of [() => deletePreset(sqlite, 1), () => getAdminPreset(sqlite, 9), () => updatePreset(sqlite, 9, { name: 'Nope' }, 1)]) {
      assert.throws(f, (e: unknown) => e instanceof PresetError && e.status === 404)
    }
    // After deletion the same string can be submitted again.
    assert.equal(submit(sqlite), 'created')
  })

  it('lists the queue pending-first, with a shortened string', () => {
    const sqlite = freshDb()
    submit(sqlite, { presetString: `${'a'.repeat(300)}-1` }, NOW)
    submit(sqlite, { presetString: `${'b'.repeat(300)}-2` }, NOW + 1)
    updatePreset(sqlite, 2, { status: 'approved' }, 1)
    const list = listAdminPresets(sqlite)
    assert.deepEqual(list.map(p => p.status), ['pending', 'approved'])
    assert.equal(list[0]!.stringPreview.length, 120)
    assert.equal(list[0]!.stringLength, 302)
    assert.deepEqual(listAdminPresets(sqlite, 'approved').map(p => p.id), [2])
  })
})

describe('audit', () => {
  it('knows the type and the snapshot never contains the string', () => {
    assert.ok((AUDIT_TYPES as readonly string[]).includes('community_preset'))
    const sqlite = freshDb()
    submit(sqlite)
    const { before, after } = updatePreset(sqlite, 1, { status: 'approved' }, 1)
    const snap = presetSnapshot(after)
    assert.ok(!JSON.stringify(snap).includes(STR))
    assert.deepEqual(Object.keys(snap).sort(), ['addon', 'hash', 'name', 'note', 'status', 'stringLength', 'testedVersion'])
    recordAuditChange(sqlite, { action: 'updated', entityType: 'community_preset', entityId: 1, entityName: after.name, before: presetSnapshot(before), after: snap, userId: 1 })
    const row = sqlite.prepare("SELECT entity_type, before_json, after_json FROM audit_changes WHERE entity_type = 'community_preset'").get() as { before_json: string, after_json: string }
    assert.ok(row.before_json.includes('pending') && row.after_json.includes('approved'))
  })
})

describe('retention', () => {
  it('prunes old pending and old rejected rows, never approved ones or young ones', () => {
    const sqlite = freshDb()
    const ins = sqlite.prepare("INSERT INTO community_presets (name, addon, preset_string, status, content_hash, created_at, reviewed_at) VALUES (?, 'Plater', 's', ?, ?, ?, ?)")
    const old = NOW - (PENDING_KEEP_DAYS + 1) * DAY
    ins.run('old pending', 'pending', 'h1', old, null)
    ins.run('young pending', 'pending', 'h2', NOW - (PENDING_KEEP_DAYS - 1) * DAY, null)
    ins.run('old rejected', 'rejected', 'h3', old - 50 * DAY, NOW - (REJECTED_KEEP_DAYS + 1) * DAY)
    ins.run('recently rejected (old submission)', 'rejected', 'h4', old - 50 * DAY, NOW - 2 * DAY)
    ins.run('old approved', 'approved', 'h5', old - 400 * DAY, old - 399 * DAY)
    assert.deepEqual(prunePresets(sqlite, NOW), { pending: 1, rejected: 1 })
    assert.deepEqual((sqlite.prepare('SELECT name FROM community_presets ORDER BY id').all() as Array<{ name: string }>).map(r => r.name),
      ['young pending', 'recently rejected (old submission)', 'old approved'])
    assert.deepEqual(prunePresets(sqlite, NOW), { pending: 0, rejected: 0 })
  })
})

describe('copy events for community presets', () => {
  it('counts only approved presets, through the existing allowlist', () => {
    const sqlite = freshDb()
    submit(sqlite)
    assert.deepEqual(parseCopyTarget('community', 1), { type: 'community', id: 1 })
    assert.equal(isCopyTarget(sqlite, 'community', 1), false)
    updatePreset(sqlite, 1, { status: 'approved' }, 1)
    assert.equal(isCopyTarget(sqlite, 'community', 1), true)
    assert.equal(isCopyTarget(sqlite, 'community', 2), false)
    recordCopy(sqlite, 'community', 1)
    assert.equal((sqlite.prepare("SELECT COUNT(*) AS c FROM copy_events WHERE string_type = 'community'").get() as { c: number }).c, 1)
  })
})

describe('privacy text', () => {
  it('has a new section that covers submissions, and keeps s7', () => {
    const s = PRIVACY_DEFAULTS
    assert.ok(s.s7)
    const text = JSON.stringify(s.s8)
    for (const needle of ['30 days', 'contact<span>&#64;</span>magguu.xyz', 'IP address', 'moderated', 'community-submitted']) assert.ok(text.includes(needle), needle)
    // Existing edits are never overwritten: a stored s7 body wins, and a missing s8 falls back to the default.
    const merged = mergePageCopy(PRIVACY_DEFAULTS, { s7: { body: '<p>My edited text</p>' } })
    assert.equal(merged.s7!.body, '<p>My edited text</p>')
    assert.equal(merged.s8!.body, PRIVACY_DEFAULTS.s8!.body)
  })
  it('s9 (temporary records and backups) is its own section, so edited s7 / s8 texts never hide it', () => {
    const body = PRIVACY_DEFAULTS.s9!.body!
    for (const needle of ['about ten minutes', 'first 64 bits', 'backups', 'before this clean-up', '24 hours']) assert.ok(body.toLowerCase().includes(needle.toLowerCase()), needle)
    const merged = mergePageCopy(PRIVACY_DEFAULTS, { s7: { body: '<p>edited</p>' }, s8: { body: '<p>edited too</p>' } })
    assert.equal(merged.s7!.body, '<p>edited</p>')
    assert.equal(merged.s8!.body, '<p>edited too</p>')
    assert.equal(merged.s9!.body, PRIVACY_DEFAULTS.s9!.body)
    // A stored edit of s9 itself is kept as well.
    assert.equal(mergePageCopy(PRIVACY_DEFAULTS, { s9: { body: '<p>mine</p>' } }).s9!.body, '<p>mine</p>')
  })
})

describe('source guards', () => {
  const root = new URL('../../server/api/v1/', import.meta.url)
  const read = (rel: string) => readFileSync(new URL(rel, root), 'utf8')
  it('every admin handler authenticates first', () => {
    const dir = new URL('admin/community-presets/', root)
    const files = readdirSync(dir)
    assert.deepEqual(files.sort(), ['[id].delete.ts', '[id].get.ts', '[id].patch.ts', 'index.get.ts'])
    for (const f of files) {
      assert.match(readFileSync(new URL(f, dir), 'utf8'), /defineEventHandler\((async )?\(event\) => \{\s*(const auth = )?requireAdminAccess\(event\)/, f)
    }
  })
  it('public handlers never set cookies, read the user agent, or log the visitor', () => {
    for (const f of ['index.get.ts', 'index.post.ts', '[id].get.ts', 'form-token.get.ts']) {
      const src = read(`community-presets/${f}`)
      assert.doesNotMatch(src, /setCookie|getCookie|user-agent|console\.|getClientIp|x-forwarded-for/i, f)
    }
    const code = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    assert.doesNotMatch(code('../../server/utils/communityPresetRuntime.ts'), /console\.|INSERT/i)
    assert.doesNotMatch(code('../../server/utils/presetSubmission.ts'), /setCookie|getCookie|user-agent|console\.|getClientIp|x-forwarded-for/i)
  })
  it('the storage code mentions no IP, cookie or user agent column', () => {
    const src = readFileSync(new URL('../../server/utils/communityPresets.ts', import.meta.url), 'utf8')
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    assert.doesNotMatch(code, /user_agent|cookie|\bip\b/i)
  })
})
