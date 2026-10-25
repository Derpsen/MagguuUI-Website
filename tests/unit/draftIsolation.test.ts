/**
 * Drafts are admin-only. Three guards:
 *  1. only admin files (and the storage/migration/audit helpers) may mention the draft storage or draft endpoints,
 *  2. the public content endpoint reads published content only, also while a draft of the same cell exists,
 *  3. the built public pages and their initial scripts are checked in scripts/verify-build.mjs (verifyDraftsNotPublic).
 */
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, it } from 'node:test'
import Database from 'better-sqlite3'
import { and, asc, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { initializeDatabase } from '../../server/database/bootstrap'
import { siteContent } from '../../server/database/schema'
import { publishDrafts, replaceDrafts } from '../../server/utils/contentDrafts'

const root = new URL('../../', import.meta.url).pathname
const SCAN_DIRS = ['server', 'pages', 'components', 'composables', 'layouts', 'plugins', 'middleware', 'utils', 'app.vue', 'error.vue']
const MARKERS = /content_drafts|contentDrafts|contentDraftPages|useContentDraft|DraftBar|admin\/content\/drafts|admin\/content\/publish|listDrafts|replaceDrafts|publishDrafts/

/** Files that may mention drafts: everything under an admin path, plus the shared helpers listed here. */
const ALLOWED = new Set([
  'composables/useContentDraft.ts', // used by admin pages only (checked below)
  'server/utils/contentDrafts.ts',
  'server/utils/validation.ts', // request schemas of the admin endpoints
  'server/utils/auditLog.ts', // audit entries of publish/discard
  'server/utils/adminOverview.ts', // admin dashboard counter
  'server/database/schema.ts',
  'server/database/bootstrap.ts',
])
const isAdminPath = (p: string) => /(^|\/)admin(\/|\.|$)/.test(p) || p.startsWith('components/admin/')

function walk(path: string, out: string[] = []): string[] {
  const abs = join(root, path)
  let st
  try { st = statSync(abs) } catch { return out }
  if (st.isFile()) { if (/\.(ts|vue)$/.test(path)) out.push(path); return out }
  for (const name of readdirSync(abs)) walk(join(path, name), out)
  return out
}

describe('drafts stay out of public code', () => {
  const files = SCAN_DIRS.flatMap(d => walk(d))
  it('scans a meaningful number of files', () => assert.ok(files.length > 150, String(files.length)))

  it('only admin files and the listed helpers mention the draft storage or endpoints', () => {
    const offenders = files.filter(f => MARKERS.test(readFileSync(join(root, f), 'utf8')) && !isAdminPath(f) && !ALLOWED.has(f))
    assert.deepEqual(offenders, [])
  })

  it('the allow-list has no stale entries (every listed helper still mentions drafts)', () => {
    for (const f of ALLOWED) assert.ok(MARKERS.test(readFileSync(join(root, f), 'utf8')), f)
  })

  it('composables/useContentDraft.ts is imported by admin pages only', () => {
    const users = files.filter(f => /useContentDraft/.test(readFileSync(join(root, f), 'utf8')) && f !== 'composables/useContentDraft.ts')
    assert.ok(users.length > 0)
    assert.deepEqual(users.filter(f => !isAdminPath(f)), [])
  })

  it('no public server route or page is under an admin path while mentioning drafts by accident', () => {
    const publicApi = files.filter(f => f.startsWith('server/api/') && !isAdminPath(f))
    for (const f of publicApi) assert.doesNotMatch(readFileSync(join(root, f), 'utf8'), MARKERS, relative(root, join(root, f)))
  })

  it('the draft endpoints exist only below /api/v1/admin (which the admin middleware guards)', () => {
    const all = walk('server/api')
    const draftRoutes = all.filter(f => /drafts|publish\.post/.test(f))
    assert.ok(draftRoutes.length >= 4)
    for (const f of draftRoutes) assert.ok(f.startsWith('server/api/v1/admin/'), f)
  })
})

describe('the public content endpoint serves published content only', () => {
  it('reads site_content and nothing else', () => {
    const src = readFileSync(join(root, 'server/api/v1/content/[page].get.ts'), 'utf8')
    assert.match(src, /from\(siteContent\)/)
    assert.doesNotMatch(src, /draft/i)
  })

  it('a draft of a cell never changes what the public query returns until it is published', () => {
    const sqlite = new Database(':memory:')
    initializeDatabase(sqlite)
    const db = drizzle(sqlite)
    sqlite.prepare("INSERT INTO site_content (page, section, key, locale, value, type) VALUES ('home', 'hero', 'title', 'en', 'Published title', 'text')").run()
    const pub = () => db.select().from(siteContent)
      .where(and(eq(siteContent.page, 'home'), eq(siteContent.locale, 'en')))
      .orderBy(asc(siteContent.sortOrder)).all().map(r => r.value)

    replaceDrafts(sqlite, ['home'], [{ page: 'home', section: 'hero', key: 'title', locale: 'en', value: 'SECRET DRAFT', type: 'text' }])
    replaceDrafts(sqlite, ['home'], [
      { page: 'home', section: 'hero', key: 'title', locale: 'en', value: 'SECRET DRAFT', type: 'text' },
      { page: 'home', section: 'hero', key: 'new-cell', locale: 'en', value: 'SECRET NEW CELL', type: 'text' },
    ])
    assert.deepEqual(pub(), ['Published title'])
    assert.ok(!JSON.stringify(pub()).includes('SECRET'))

    publishDrafts(sqlite, ['home'])
    assert.ok(pub().includes('SECRET DRAFT'))
  })
})
