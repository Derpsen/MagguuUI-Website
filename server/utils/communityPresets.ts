/**
 * Community presets (item A): visitor-submitted import strings in a moderation queue.
 *
 * PUBLIC INPUT, so everything here is defensive:
 *  - plain text only. Nothing is ever interpreted as Markdown or HTML; the pages render it with
 *    Vue text interpolation (escaped). Short fields are stripped of control and format characters,
 *    the preset string is REJECTED if it contains any (silently editing a string would corrupt it);
 *  - links are refused in the short text fields (spam and phishing carrier);
 *  - a cookie-less signed form token carries the time-trap (minimum seconds between render and
 *    submit, maximum age) and is single-use (in-memory replay guard);
 *  - in-memory limiters keyed by a daily-salted hash of the IP: the IP is never stored or logged;
 *  - a global daily cap and a cap on the pending queue (counted in the database);
 *  - duplicates are detected by a content hash and answered like a success (nothing leaks).
 * No IP, no user agent, no account, no personal data is stored (see the `community_presets` table).
 *
 * Plain better-sqlite3 (a handle is passed in) and relative imports only, so unit tests run it
 * against an in-memory database (`node --import tsx --test`, no Nitro auto-imports).
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import type Database from 'better-sqlite3'
import { z } from 'zod'

type Sqlite = Pick<Database.Database, 'prepare' | 'transaction'>

export const PRESET_STATUSES = ['pending', 'approved', 'rejected'] as const
export type PresetStatus = typeof PRESET_STATUSES[number]

// ─── Limits ────────────────────────────────────────────────────────────

export const NAME_MIN = 3
export const NAME_MAX = 60
export const STRING_MIN = 20
export const STRING_MAX = 16_000
export const STRING_MAX_LINES = 400
export const NOTE_MAX = 200
export const VERSION_MAX = 40
export const ADDON_MAX = 80
/** Request bodies above this are refused before parsing. */
export const BODY_MAX_BYTES = 48_000

export const MIN_FORM_SECONDS = 5
export const MAX_FORM_AGE_SECONDS = 2 * 3600
/** New submissions accepted per UTC day, all visitors together. */
export const DAILY_CAP = 40
/** Pending items waiting for review; the form pauses beyond this. */
export const PENDING_CAP = 200
/** Pending and rejected items are deleted after this many days. Approved ones stay until an admin deletes them. */
export const PENDING_KEEP_DAYS = 30
export const REJECTED_KEEP_DAYS = 30
export const PUBLIC_LIST_MAX = 100
export const ADMIN_LIST_MAX = 300

const DAY = 86400

export class PresetError extends Error {
  constructor(public code: 'not_found' | 'invalid' | 'conflict', message: string, public status: number) {
    super(message)
  }
}

// ─── Text cleaning ─────────────────────────────────────────────────────

/** Control, format (zero-width, bidi), line/paragraph separators, surrogates, private use, unassigned. */
const HIDDEN = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}\p{Cs}\p{Co}\p{Cn}]/gu
const HIDDEN_NO_NL = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}\p{Cs}\p{Co}\p{Cn}]/u

/** One-line text: hidden characters removed, whitespace collapsed. */
export function cleanLine(raw: string): string {
  return raw.normalize('NFC')
    .replace(/[\p{Cc}\p{Zl}\p{Zp}]/gu, ' ')
    .replace(HIDDEN, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Links and addresses are not accepted in the short fields. */
const LINKISH = /(https?:|ftp:|www\.|\/\/|\S@\S+\.\S|\b[a-z0-9-]{2,}\.(?:com|net|org|io|gg|xyz|ru|cn|top|info|biz|link|click|site|online)\b)/i

const shortText = (label: string, min: number, max: number) => z.string().max(max * 4)
  .transform(cleanLine)
  .refine(s => s.length >= min, min > 0 ? `${label} must be at least ${min} characters` : `${label} is invalid`)
  .refine(s => s.length <= max, `${label} must be at most ${max} characters`)
  .refine(s => !LINKISH.test(s), `${label} must not contain links or addresses`)

const nameField = shortText('Name', NAME_MIN, NAME_MAX)
  .refine(s => /[\p{L}\p{N}]/u.test(s), 'Name must contain a letter or a number')

const noteField = shortText('Note', 0, NOTE_MAX)

const VERSION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 .,+_()/#:-]{0,39}$/
const versionField = z.string().max(VERSION_MAX * 4)
  .transform(cleanLine)
  .refine(s => s === '' || VERSION_PATTERN.test(s), 'Tested version may only use letters, digits and . , + _ ( ) / # : -')

const addonField = z.string().max(ADDON_MAX * 4)
  .transform(cleanLine)
  .refine(s => s.length >= 1 && s.length <= ADDON_MAX, 'Choose an addon')

/** The preset itself: plain text, no hidden characters at all, line endings normalised. */
const stringField = z.string().max(STRING_MAX * 2)
  .transform(s => s.replace(/\r\n?/g, '\n').trim())
  .superRefine((s, ctx) => {
    if (s.length < STRING_MIN) ctx.addIssue({ code: 'custom', message: `The preset string must be at least ${STRING_MIN} characters` })
    else if (s.length > STRING_MAX) ctx.addIssue({ code: 'custom', message: `The preset string must be at most ${STRING_MAX} characters` })
    else if (s.split('\n').length > STRING_MAX_LINES) ctx.addIssue({ code: 'custom', message: `The preset string must have at most ${STRING_MAX_LINES} lines` })
    else if (HIDDEN_NO_NL.test(s.replace(/[\n\t]/g, ''))) ctx.addIssue({ code: 'custom', message: 'The preset string contains characters that are not allowed (control, invisible or unassigned characters)' })
  })

export const submissionSchema = z.object({
  name: nameField,
  addon: addonField,
  presetString: stringField,
  note: noteField.optional().default(''),
  testedVersion: versionField.optional().default(''),
  token: z.string().max(200),
  // Honeypot: a real visitor never sees this field. Checked before validation.
  website: z.string().max(500).optional().default(''),
}).strict()

export type Submission = z.infer<typeof submissionSchema>

export const labelEditSchema = z.object({
  name: nameField.optional(),
  note: noteField.optional(),
  testedVersion: versionField.optional(),
  status: z.enum(PRESET_STATUSES).optional(),
}).strict().refine(v => Object.keys(v).length > 0, 'Nothing to change')

// ─── Content hash ──────────────────────────────────────────────────────

/** Same addon + same string (ignoring case of the addon and any whitespace) is a duplicate. */
export function contentHash(addon: string, presetString: string): string {
  return createHash('sha256').update(`${addon.toLowerCase()}\n${presetString.replace(/\s+/g, '')}`).digest('hex')
}

// ─── Form token (time-trap) ────────────────────────────────────────────

export type TokenProblem = 'malformed' | 'signature' | 'too_fast' | 'expired'

const sign = (secret: string, payload: string) =>
  createHmac('sha256', `community-preset-form|${secret}`).update(payload).digest('hex').slice(0, 40)

/** `<issuedAtSeconds>.<nonce>.<signature>`; no cookie, no server-side state needed to check it. */
export function issueFormToken(secret: string, nowMs = Date.now(), nonce = randomBytes(12).toString('hex')): string {
  const iat = Math.floor(nowMs / 1000)
  return `${iat}.${nonce}.${sign(secret, `${iat}.${nonce}`)}`
}

export function verifyFormToken(
  secret: string,
  token: unknown,
  nowMs = Date.now(),
  minSeconds = MIN_FORM_SECONDS,
  maxSeconds = MAX_FORM_AGE_SECONDS,
): { ok: true, nonce: string } | { ok: false, problem: TokenProblem } {
  if (typeof token !== 'string' || token.length > 200) return { ok: false, problem: 'malformed' }
  const m = /^(\d{9,11})\.([a-f0-9]{8,64})\.([a-f0-9]{40})$/.exec(token)
  if (!m) return { ok: false, problem: 'malformed' }
  const [, iatText = '', nonce = '', sig = ''] = m
  const expected = sign(secret, `${iatText}.${nonce}`)
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return { ok: false, problem: 'signature' }
  const age = Math.floor(nowMs / 1000) - Number(iatText)
  if (age < minSeconds) return { ok: false, problem: 'too_fast' }
  if (age > maxSeconds) return { ok: false, problem: 'expired' }
  return { ok: true, nonce }
}

/** Single-use tokens: remembers consumed nonces until they could no longer verify anyway. */
export function createReplayGuard(maxEntries = 5000, ttlMs = (MAX_FORM_AGE_SECONDS + 60) * 1000) {
  const seen = new Map<string, number>()
  const purge = (now: number) => {
    for (const [k, t] of seen) if (now - t > ttlMs) seen.delete(k)
  }
  return {
    /** True the first time a nonce is seen, false afterwards. */
    consume(nonce: string, now = Date.now()): boolean {
      if (seen.size >= maxEntries) purge(now)
      if (seen.has(nonce)) return false
      // Full of live nonces: refuse rather than grow (the per-IP limits make this unreachable in practice).
      if (seen.size >= maxEntries) return false
      seen.set(nonce, now)
      return true
    },
    size: () => seen.size,
  }
}

// ─── In-memory limiter ─────────────────────────────────────────────────

/** Fixed-window counter per key, bounded in size. Keys are opaque salted hashes (never an IP). */
export function createWindowLimiter(max: number, windowMs: number, maxKeys = 10_000) {
  const hits = new Map<string, { count: number, start: number }>()
  return {
    /** Counts one attempt; false when the key is over the limit for the current window. */
    hit(key: string, now = Date.now()): boolean {
      const e = hits.get(key)
      if (!e || now - e.start >= windowMs) {
        if (!e && hits.size >= maxKeys) {
          for (const [k, v] of hits) if (now - v.start >= windowMs) hits.delete(k)
          if (hits.size >= maxKeys) return false
        }
        hits.set(key, { count: 1, start: now })
        return true
      }
      e.count++
      return e.count <= max
    },
    size: () => hits.size,
  }
}

// ─── Storage ───────────────────────────────────────────────────────────

export type SubmitResult = 'created' | 'duplicate' | 'queue_full' | 'daily_cap'

export function isKnownAddon(sqlite: Sqlite, name: string): boolean {
  return !!sqlite.prepare('SELECT 1 AS ok FROM addons WHERE name = ? AND is_visible = 1 AND is_available = 1').get(name)
}

export function visibleAddonNames(sqlite: Sqlite): string[] {
  return (sqlite.prepare('SELECT name FROM addons WHERE is_visible = 1 AND is_available = 1 ORDER BY category, sort_order, name').all() as Array<{ name: string }>).map(r => r.name)
}

export function submitPreset(sqlite: Sqlite, input: Pick<Submission, 'name' | 'addon' | 'presetString' | 'note' | 'testedVersion'>, nowSeconds = Math.floor(Date.now() / 1000)): SubmitResult {
  const hash = contentHash(input.addon, input.presetString)
  const run = sqlite.transaction((): SubmitResult => {
    if (sqlite.prepare('SELECT 1 AS ok FROM community_presets WHERE content_hash = ?').get(hash)) return 'duplicate'
    const pending = sqlite.prepare("SELECT COUNT(*) AS c FROM community_presets WHERE status = 'pending'").get() as { c: number }
    if (pending.c >= PENDING_CAP) return 'queue_full'
    const dayStart = Math.floor(nowSeconds / DAY) * DAY
    const today = sqlite.prepare('SELECT COUNT(*) AS c FROM community_presets WHERE created_at >= ?').get(dayStart) as { c: number }
    if (today.c >= DAILY_CAP) return 'daily_cap'
    sqlite.prepare(`INSERT INTO community_presets (name, addon, preset_string, note, tested_version, status, content_hash, created_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`).run(input.name, input.addon, input.presetString, input.note, input.testedVersion, hash, nowSeconds)
    return 'created'
  })
  return run()
}

interface Row {
  id: number, name: string, addon: string, preset_string: string, note: string, tested_version: string,
  status: PresetStatus, content_hash: string, created_at: number, reviewed_at: number | null, reviewed_by: number | null
}

const iso = (s: number | null) => (s === null ? null : new Date(s * 1000).toISOString())

export interface AdminPreset {
  id: number, name: string, addon: string, note: string, testedVersion: string, status: PresetStatus,
  createdAt: string, reviewedAt: string | null, stringLength: number, stringPreview: string, hash: string
}

function toAdmin(r: Row): AdminPreset {
  return {
    id: r.id, name: r.name, addon: r.addon, note: r.note, testedVersion: r.tested_version, status: r.status,
    createdAt: iso(r.created_at)!, reviewedAt: iso(r.reviewed_at), stringLength: r.preset_string.length,
    stringPreview: r.preset_string.slice(0, 120), hash: r.content_hash.slice(0, 12),
  }
}

export function listAdminPresets(sqlite: Sqlite, status?: string): AdminPreset[] {
  const rows = (PRESET_STATUSES as readonly string[]).includes(status ?? '')
    ? sqlite.prepare('SELECT * FROM community_presets WHERE status = ? ORDER BY created_at DESC, id DESC LIMIT ?').all(status, ADMIN_LIST_MAX)
    : sqlite.prepare(`SELECT * FROM community_presets
        ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, created_at DESC, id DESC LIMIT ?`).all(ADMIN_LIST_MAX)
  return (rows as Row[]).map(toAdmin)
}

export function presetCounts(sqlite: Sqlite): Record<PresetStatus, number> {
  const out: Record<PresetStatus, number> = { pending: 0, approved: 0, rejected: 0 }
  for (const r of sqlite.prepare('SELECT status, COUNT(*) AS c FROM community_presets GROUP BY status').all() as Array<{ status: PresetStatus, c: number }>) {
    if (r.status in out) out[r.status] = r.c
  }
  return out
}

function getRow(sqlite: Sqlite, id: number): Row {
  const row = sqlite.prepare('SELECT * FROM community_presets WHERE id = ?').get(id) as Row | undefined
  if (!row) throw new PresetError('not_found', 'Preset not found', 404)
  return row
}

/** Full row for the review screen (includes the string). */
export function getAdminPreset(sqlite: Sqlite, id: number): AdminPreset & { presetString: string } {
  const r = getRow(sqlite, id)
  return { ...toAdmin(r), presetString: r.preset_string }
}

/** Audit snapshot: never the string itself, only its size and hash. */
export function presetSnapshot(p: AdminPreset) {
  return { name: p.name, addon: p.addon, note: p.note, testedVersion: p.testedVersion, status: p.status, stringLength: p.stringLength, hash: p.hash }
}

export function updatePreset(
  sqlite: Sqlite, id: number,
  patch: { name?: string, note?: string, testedVersion?: string, status?: PresetStatus },
  userId: number | null, nowSeconds = Math.floor(Date.now() / 1000),
): { before: AdminPreset, after: AdminPreset } {
  const run = sqlite.transaction(() => {
    const raw = getRow(sqlite, id)
    const before = toAdmin(raw)
    const status = patch.status ?? raw.status
    const changedStatus = status !== raw.status
    sqlite.prepare('UPDATE community_presets SET name = ?, note = ?, tested_version = ?, status = ?, reviewed_at = ?, reviewed_by = ? WHERE id = ?')
      .run(patch.name ?? raw.name, patch.note ?? raw.note, patch.testedVersion ?? raw.tested_version, status,
        changedStatus ? nowSeconds : raw.reviewed_at, changedStatus ? userId : raw.reviewed_by, id)
    return { before, after: toAdmin(getRow(sqlite, id)) }
  })
  return run()
}

export function deletePreset(sqlite: Sqlite, id: number): AdminPreset {
  const run = sqlite.transaction(() => {
    const before = toAdmin(getRow(sqlite, id))
    sqlite.prepare('DELETE FROM community_presets WHERE id = ?').run(id)
    return before
  })
  return run()
}

/** Retention: pending and rejected items go after their keep time; approved ones are never pruned here. */
export function prunePresets(sqlite: Sqlite, nowSeconds = Math.floor(Date.now() / 1000)): { pending: number, rejected: number } {
  const pending = sqlite.prepare("DELETE FROM community_presets WHERE status = 'pending' AND created_at < ?").run(nowSeconds - PENDING_KEEP_DAYS * DAY).changes
  const rejected = sqlite.prepare("DELETE FROM community_presets WHERE status = 'rejected' AND COALESCE(reviewed_at, created_at) < ?").run(nowSeconds - REJECTED_KEEP_DAYS * DAY).changes
  return { pending, rejected }
}

// ─── Public output (the whitelist) ─────────────────────────────────────

export interface PublicPreset {
  id: number
  name: string
  addon: string
  testedVersion: string
  note: string
  stringLength: number
}

/** Only approved rows. Whitelist: no status, hash, dates, reviewer. The string has its own endpoint. */
export function listPublicPresets(sqlite: Sqlite): PublicPreset[] {
  const rows = sqlite.prepare("SELECT * FROM community_presets WHERE status = 'approved' ORDER BY addon COLLATE NOCASE, id DESC LIMIT ?").all(PUBLIC_LIST_MAX) as Row[]
  return rows.map(r => ({ id: r.id, name: r.name, addon: r.addon, testedVersion: r.tested_version, note: r.note, stringLength: r.preset_string.length }))
}

export function getPublicPresetString(sqlite: Sqlite, id: number): { id: number, string: string } | null {
  const r = sqlite.prepare("SELECT id, preset_string FROM community_presets WHERE id = ? AND status = 'approved'").get(id) as { id: number, preset_string: string } | undefined
  return r ? { id: r.id, string: r.preset_string } : null
}
