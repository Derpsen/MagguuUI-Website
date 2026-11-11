/**
 * Characterization tests for the website boot (server/plugins/init.ts split).
 * Records today's seed / migration / marker behaviour, call order, and
 * idempotency on a second start. Uses an in-memory database only — never
 * opens the process data file. Does not exercise admin seed, force-reset,
 * passkey or lockout.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { initializeDatabase } from '../../server/database/bootstrap'
import * as schema from '../../server/database/schema'
import { DEFAULT_FAQS, DEFAULT_SITE_CONTENT } from '../../server/database/defaultContent'
import { CURRENT_ADDON_CHANGELOG, PREVIOUS_ADDON_CHANGELOGS } from '../../server/database/defaultAddonChangelog'
import { SITE_SETTINGS_DEFAULTS } from '../../utils/siteSettingsDefaults'
import { DEFAULT_CONTENT_LOCALE } from '../../server/utils/contentLocales'
import { BOOT_INDEX_STATEMENTS } from '../../server/utils/bootMigrations'
import { LEGACY_CONTENT_MARKERS, LEGACY_FAQ_MARKERS } from '../../server/utils/bootContentMarkers'
import { runWebsiteBoot } from '../../server/utils/websiteBoot'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '../..')

function fresh() {
  const sqlite = new Database(':memory:')
  initializeDatabase(sqlite)
  const db = drizzle(sqlite, { schema })
  return { sqlite, db }
}

function boot(db: ReturnType<typeof fresh>['db'], sqlite: Database.Database, sync = false) {
  const logs: string[] = []
  const log = console.log
  console.log = (...args: unknown[]) => {
    logs.push(args.map(String).join(' '))
  }
  try {
    runWebsiteBoot(db, sqlite, { shouldSyncSeededContent: sync })
  } finally {
    console.log = log
  }
  return logs
}

function snapshot(sqlite: Database.Database) {
  return {
    content: sqlite.prepare(
      'SELECT page, section, key, locale, value, type, sort_order AS sortOrder FROM site_content ORDER BY page, section, key, locale',
    ).all(),
    settings: sqlite.prepare('SELECT key, value FROM settings ORDER BY key').all(),
    faqs: sqlite.prepare(
      'SELECT category, question, answer, sort_order AS sortOrder, is_visible AS isVisible FROM faqs ORDER BY category, sort_order',
    ).all(),
    changelogs: sqlite.prepare(
      'SELECT version, content, content_en AS contentEn, is_published AS isPublished FROM changelogs ORDER BY version',
    ).all(),
    news: sqlite.prepare(
      'SELECT slug, title, is_published AS isPublished FROM news_articles ORDER BY slug',
    ).all(),
    indexes: sqlite.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_%' ORDER BY name",
    ).all(),
  }
}

function indexNames() {
  return BOOT_INDEX_STATEMENTS.map((sql) => {
    const match = sql.match(/INDEX IF NOT EXISTS (\w+)/)
    assert.ok(match?.[1], sql)
    return match[1]
  }).sort()
}

function firstBootLogs(logs: string[]) {
  const idx = (prefix: string) => logs.findIndex(line => line.startsWith(prefix))
  return {
    indexes: idx('[Init] Ensured 12 performance indexes'),
    content: idx('[Init] Default site content seeded'),
    settings: idx('[Init] Added '),
    syncSkip: idx('[Init] Content sync skipped'),
    faqs: idx(`[Init] ${DEFAULT_FAQS.length} default FAQ entries seeded`),
    current: idx(`[Init] Added current addon changelog ${CURRENT_ADDON_CHANGELOG.version}`),
  }
}

describe('website boot characterization', () => {
  it('boot helpers do not import the process database module', () => {
    const dir = join(repoRoot, 'server/utils')
    for (const name of ['websiteBoot.ts', 'bootSeed.ts', 'bootNews.ts', 'bootMigrations.ts', 'bootContentMarkers.ts', 'websiteBootTypes.ts']) {
      const src = readFileSync(join(dir, name), 'utf8')
      assert.doesNotMatch(src, /from ['"]~\/server\/database['"]/)
      assert.doesNotMatch(src, /from ['"]\.\.\/database['"]/)
    }
  })

  it('seeds content, settings, FAQs, changelogs and indexes on an empty database, in order', () => {
    const { sqlite, db } = fresh()
    const logs = boot(db, sqlite)
    const n = (sql: string) => (sqlite.prepare(sql).get() as { n: number }).n

    assert.equal(n('SELECT count(*) AS n FROM site_content'), DEFAULT_SITE_CONTENT.length)
    assert.equal(n('SELECT count(*) AS n FROM faqs'), DEFAULT_FAQS.length)
    assert.equal(n('SELECT count(*) AS n FROM changelogs'), 1 + PREVIOUS_ADDON_CHANGELOGS.length)
    assert.equal(n('SELECT count(*) AS n FROM news_articles'), 5)
    assert.equal(n("SELECT count(*) AS n FROM news_articles WHERE slug = 'pouch-of-violet-dust-launch-celebration' AND is_published = 0"), 1)
    assert.equal(n('SELECT count(*) AS n FROM news_articles WHERE is_published = 1'), 4)
    const settingKeys = (sqlite.prepare('SELECT key FROM settings').all() as Array<{ key: string }>).map(row => row.key).sort()
    assert.deepEqual(settingKeys, Object.keys(SITE_SETTINGS_DEFAULTS).sort())

    const present = (sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_%'").all() as Array<{ name: string }>).map(row => row.name)
    for (const name of indexNames()) {
      assert.ok(present.includes(name), name)
    }

    const current = sqlite.prepare('SELECT content, is_published AS isPublished FROM changelogs WHERE version = ?').get(CURRENT_ADDON_CHANGELOG.version) as { content: string, isPublished: number }
    assert.equal(current.content, CURRENT_ADDON_CHANGELOG.content)
    assert.equal(current.isPublished, 1)

    const pos = firstBootLogs(logs)
    for (const [name, value] of Object.entries(pos)) {
      assert.ok(value >= 0, `missing log for ${name}`)
    }
    assert.ok(pos.indexes < pos.content)
    assert.ok(pos.content < pos.syncSkip)
    assert.ok(pos.syncSkip < pos.faqs)
    assert.ok(pos.faqs < pos.current)
    if (pos.settings >= 0) {
      assert.ok(pos.content < pos.settings)
      assert.ok(pos.settings < pos.syncSkip)
    }
    assert.ok(logs.every(line => !line.includes('[Init] Startup complete')))
    assert.ok(!logs.some(line => line.includes('Admin ')))
  })

  it('is idempotent on a second start (same rows, no extra seed logs)', () => {
    const { sqlite, db } = fresh()
    const first = boot(db, sqlite)
    const afterFirst = snapshot(sqlite)
    const second = boot(db, sqlite)
    const afterSecond = snapshot(sqlite)

    assert.deepEqual(afterSecond, afterFirst)
    assert.ok(first.some(line => line === '[Init] Default site content seeded'))
    assert.ok(first.some(line => line.startsWith(`[Init] ${DEFAULT_FAQS.length} default FAQ entries seeded`)))
    assert.ok(first.some(line => line.startsWith('[Init] Added current addon changelog')))
    assert.ok(!second.some(line => line === '[Init] Default site content seeded'))
    assert.ok(!second.some(line => line.includes('default FAQ entries seeded')))
    assert.ok(!second.some(line => line.startsWith('[Init] Added current addon changelog')))
    assert.ok(!second.some(line => line.startsWith('[Init] Added addon changelog')))
    assert.ok(first.some(line => line.startsWith('[Init] Seeded 5 news articles')))
    assert.ok(!second.some(line => line.startsWith('[Init] Seeded ')))
    // Today's changelog repair may still match a stale-text predicate on the
    // current default body, so a second start can log an update while writing
    // the same bytes (snapshot above must stay equal). Do not tighten this.
    assert.ok(!second.some(line => line.startsWith('[Init] Repaired ')))
    assert.equal(second.filter(line => line === '[Init] Ensured 12 performance indexes').length, 1)
    assert.ok(second.some(line => line.startsWith('[Init] Content sync skipped')))
    assert.ok(second.some(line => line.startsWith('[Init] FAQ sync skipped')))
  })

  it('repairs a known-stale content marker and leaves unmarked admin text alone', () => {
    const { sqlite, db } = fresh()
    boot(db, sqlite)
    const marker = LEGACY_CONTENT_MARKERS.find(item => item.page === 'home' && item.section === 'hero' && item.key === 'title' && !('locale' in item && item.locale) && !('exact' in item && item.exact))
    assert.ok(marker)
    const expected = DEFAULT_SITE_CONTENT.find(entry =>
      entry.page === 'home' && entry.section === 'hero' && entry.key === 'title' && entry.locale === DEFAULT_CONTENT_LOCALE,
    )
    assert.ok(expected)

    sqlite.prepare(
      "UPDATE site_content SET value = ? WHERE page = 'home' AND section = 'hero' AND key = 'title' AND locale = ?",
    ).run(`Intro ${marker.marker} close`, DEFAULT_CONTENT_LOCALE)
    sqlite.prepare(
      "UPDATE site_content SET value = ? WHERE page = 'home' AND section = 'features_heading' AND key = 'title' AND locale = ?",
    ).run('Our own heading', DEFAULT_CONTENT_LOCALE)

    const logs = boot(db, sqlite)
    assert.ok(logs.some(line => line === '[Init] Repaired 1 outdated default content entries'))

    const title = sqlite.prepare(
      "SELECT value FROM site_content WHERE page = 'home' AND section = 'hero' AND key = 'title' AND locale = ?",
    ).get(DEFAULT_CONTENT_LOCALE) as { value: string }
    const heading = sqlite.prepare(
      "SELECT value FROM site_content WHERE page = 'home' AND section = 'features_heading' AND key = 'title' AND locale = ?",
    ).get(DEFAULT_CONTENT_LOCALE) as { value: string }
    assert.equal(title.value, expected.value)
    assert.equal(heading.value, 'Our own heading')
  })

  it('exact markers replace only the verbatim old default', () => {
    const { sqlite, db } = fresh()
    boot(db, sqlite)
    const exact = LEGACY_CONTENT_MARKERS.find(item => 'exact' in item && item.exact && item.key === 'title2')
    assert.ok(exact)
    const locale = 'locale' in exact && exact.locale ? exact.locale : DEFAULT_CONTENT_LOCALE
    const expected = DEFAULT_SITE_CONTENT.find(entry =>
      entry.page === exact.page && entry.section === exact.section && entry.key === exact.key && entry.locale === locale,
    )
    assert.ok(expected)

    sqlite.prepare(
      'UPDATE site_content SET value = ? WHERE page = ? AND section = ? AND key = ? AND locale = ?',
    ).run(`prefix ${exact.marker}`, exact.page, exact.section, exact.key, locale)
    boot(db, sqlite)
    const kept = sqlite.prepare(
      'SELECT value FROM site_content WHERE page = ? AND section = ? AND key = ? AND locale = ?',
    ).get(exact.page, exact.section, exact.key, locale) as { value: string }
    assert.equal(kept.value, `prefix ${exact.marker}`)

    sqlite.prepare(
      'UPDATE site_content SET value = ? WHERE page = ? AND section = ? AND key = ? AND locale = ?',
    ).run(`  ${exact.marker}  `, exact.page, exact.section, exact.key, locale)
    boot(db, sqlite)
    const replaced = sqlite.prepare(
      'SELECT value FROM site_content WHERE page = ? AND section = ? AND key = ? AND locale = ?',
    ).get(exact.page, exact.section, exact.key, locale) as { value: string }
    assert.equal(replaced.value, expected.value)
  })

  it('repairs a FAQ marker and leaves an unmarked FAQ alone', () => {
    const { sqlite, db } = fresh()
    boot(db, sqlite)
    const marker = LEGACY_FAQ_MARKERS[0]
    assert.ok(marker)
    const replacement = DEFAULT_FAQS.find(faq => faq.category === marker.category && faq.sortOrder === marker.sortOrder)
    assert.ok(replacement)
    const other = DEFAULT_FAQS.find(faq => faq.category !== marker.category || faq.sortOrder !== marker.sortOrder)
    assert.ok(other)

    sqlite.prepare(
      'UPDATE faqs SET question = ?, answer = ? WHERE category = ? AND sort_order = ?',
    ).run(`Old ${marker.marker}`, 'old answer', marker.category, marker.sortOrder)
    sqlite.prepare(
      'UPDATE faqs SET question = ? WHERE category = ? AND sort_order = ?',
    ).run('Custom admin question', other.category, other.sortOrder)

    const logs = boot(db, sqlite)
    assert.ok(logs.some(line => line.startsWith('[Init] FAQ synced (inserted: 0, updated:')))

    const repaired = sqlite.prepare(
      'SELECT question, answer FROM faqs WHERE category = ? AND sort_order = ?',
    ).get(marker.category, marker.sortOrder) as { question: string, answer: string }
    const custom = sqlite.prepare(
      'SELECT question FROM faqs WHERE category = ? AND sort_order = ?',
    ).get(other.category, other.sortOrder) as { question: string }
    assert.equal(repaired.question, replacement.question)
    assert.equal(repaired.answer, replacement.answer)
    assert.equal(custom.question, 'Custom admin question')
  })

  it('NUXT_SYNC_SEEDED_CONTENT overwrites matching keys; without the flag unmarked copy stays', () => {
    const { sqlite, db } = fresh()
    boot(db, sqlite)
    sqlite.prepare(
      "UPDATE site_content SET value = 'Custom hero' WHERE page = 'home' AND section = 'hero' AND key = 'title' AND locale = ?",
    ).run(DEFAULT_CONTENT_LOCALE)

    boot(db, sqlite, false)
    const without = sqlite.prepare(
      "SELECT value FROM site_content WHERE page = 'home' AND section = 'hero' AND key = 'title' AND locale = ?",
    ).get(DEFAULT_CONTENT_LOCALE) as { value: string }
    assert.equal(without.value, 'Custom hero')

    const logs = boot(db, sqlite, true)
    assert.ok(logs.some(line => line.startsWith('[Init] home synced')))
    const expected = DEFAULT_SITE_CONTENT.find(entry =>
      entry.page === 'home' && entry.section === 'hero' && entry.key === 'title' && entry.locale === DEFAULT_CONTENT_LOCALE,
    )
    assert.ok(expected)
    const withSync = sqlite.prepare(
      "SELECT value FROM site_content WHERE page = 'home' AND section = 'hero' AND key = 'title' AND locale = ?",
    ).get(DEFAULT_CONTENT_LOCALE) as { value: string }
    assert.equal(withSync.value, expected.value)
  })

  it('drops retired imprint settings and repairs only the retired contact address', () => {
    const { sqlite, db } = fresh()
    boot(db, sqlite)
    sqlite.prepare("INSERT INTO settings (key, value) VALUES ('imprint_name', 'n'), ('imprint_city', 'c')").run()
    sqlite.prepare("UPDATE settings SET value = 'contact@magguui.com' WHERE key = 'contact_email'").run()
    const logs = boot(db, sqlite)
    assert.ok(logs.some(line => line === '[Init] Removed 2 retired imprint settings'))
    assert.ok(logs.some(line => line === '[Init] Updated retired contact email'))
    const leftover = (sqlite.prepare("SELECT count(*) AS n FROM settings WHERE key LIKE 'imprint_%'").get() as { n: number }).n
    assert.equal(leftover, 0)
    const email = sqlite.prepare("SELECT value FROM settings WHERE key = 'contact_email'").get() as { value: string }
    assert.equal(email.value, SITE_SETTINGS_DEFAULTS.contact_email)

    sqlite.prepare("UPDATE settings SET value = 'other@example.com' WHERE key = 'contact_email'").run()
    const again = boot(db, sqlite)
    assert.ok(!again.some(line => line === '[Init] Updated retired contact email'))
    const kept = sqlite.prepare("SELECT value FROM settings WHERE key = 'contact_email'").get() as { value: string }
    assert.equal(kept.value, 'other@example.com')
  })

  it('fills a blank CurseForge setting from the default and leaves a custom URL alone', () => {
    const { sqlite, db } = fresh()
    boot(db, sqlite)
    sqlite.prepare("UPDATE settings SET value = '   ' WHERE key = 'curseforge_url'").run()
    const logs = boot(db, sqlite)
    assert.ok(logs.some(line => line === '[Init] Added the default MagguuUI CurseForge link'))
    const filled = sqlite.prepare("SELECT value FROM settings WHERE key = 'curseforge_url'").get() as { value: string }
    assert.equal(filled.value, SITE_SETTINGS_DEFAULTS.curseforge_url)

    sqlite.prepare("UPDATE settings SET value = 'https://example.invalid/curse' WHERE key = 'curseforge_url'").run()
    const again = boot(db, sqlite)
    assert.ok(!again.some(line => line === '[Init] Added the default MagguuUI CurseForge link'))
    const custom = sqlite.prepare("SELECT value FROM settings WHERE key = 'curseforge_url'").get() as { value: string }
    assert.equal(custom.value, 'https://example.invalid/curse')
  })
})
