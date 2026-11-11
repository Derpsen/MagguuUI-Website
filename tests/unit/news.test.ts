import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { initializeDatabase } from '../../server/database/bootstrap'
import * as schema from '../../server/database/schema'
import { seedNewsArticlesIfMissing } from '../../server/utils/bootNews'
import { buildNewsRss, newsEntryUrl } from '../../server/utils/newsFeed'
import { NEWS_AUTHOR, NEWS_SUMMARY_MAX, NEWS_UNPUBLISHED_SEED_SLUG, hostnameMatches, isNewsSlug, sourceNameFromUrl } from '../../utils/news'
import { appendSourcesToBody, parseNewsMarkdown } from '../../utils/newsMarkdown'

const FIXTURES = join(process.cwd(), 'server/database/news-seed')

describe('news markdown and sources', () => {
  it('parses Buddy frontmatter, uses the first source, and keeps an existing Sources list', () => {
    const source = readFileSync(join(FIXTURES, 'discord-guild-chat-linking.md'), 'utf8')
    const parsed = parseNewsMarkdown(source)
    assert.ok(parsed)
    assert.equal(parsed.slug, 'discord-guild-chat-linking')
    assert.equal(parsed.author, NEWS_AUTHOR)
    assert.equal(parsed.isPublished, true)
    assert.equal(parsed.sourceUrl, 'https://news.blizzard.com/en-us/article/24296228/stay-connected-in-world-of-warcraft-with-discord')
    assert.equal(parsed.sourceName, 'Blizzard News')
    assert.equal(parsed.sources.length, 2)
    assert.match(parsed.body, /## Sources/)
    assert.equal((parsed.body.match(/## Sources/g) || []).length, 1)
    assert.ok(parsed.summary.length <= NEWS_SUMMARY_MAX)
  })

  it('seeds the pouch article unpublished because the drop ends after 2026-11-13 01:30 Europe/Berlin', () => {
    const source = readFileSync(join(FIXTURES, `${NEWS_UNPUBLISHED_SEED_SLUG}.md`), 'utf8')
    const parsed = parseNewsMarkdown(source)
    assert.ok(parsed)
    assert.equal(parsed.slug, NEWS_UNPUBLISHED_SEED_SLUG)
    assert.equal(parsed.isPublished, false)
    assert.equal(parsed.author, NEWS_AUTHOR)
  })

  it('rejects an overlong summary and a bad slug', () => {
    const overlong = '---\ntitle: "T"\nslug: good-slug\ndate: 2026-11-11\nsummary: "' + 'x'.repeat(161) + '"\n---\n\nBody\n'
    assert.equal(parseNewsMarkdown(overlong), null)
    const badSlug = '---\ntitle: "T"\nslug: Bad_Slug\ndate: 2026-11-11\nsummary: "A short summary."\n---\n\nBody\n'
    assert.equal(parseNewsMarkdown(badSlug), null)
    assert.equal(isNewsSlug('wow-forever-now-live'), true)
    assert.equal(isNewsSlug('Bad_Slug'), false)
  })

  it('appends leftover sources only when the body has no Sources heading', () => {
    const body = appendSourcesToBody('Hello.\n', [
      'https://news.blizzard.com/en-us/article/1',
      'https://www.wowhead.com/news/2',
    ])
    assert.match(body, /## Sources/)
    assert.match(body, /Wowhead/)
    const kept = appendSourcesToBody('Hello.\n\n## Sources\n\n- already here\n', [
      'https://news.blizzard.com/en-us/article/1',
      'https://www.wowhead.com/news/2',
    ])
    assert.equal(kept.includes('https://www.wowhead.com/news/2'), false)
  })

  it('names common hosts by exact domain or subdomain, not a suffix', () => {
    assert.equal(hostnameMatches('www.wowhead.com', 'wowhead.com'), true)
    assert.equal(hostnameMatches('ptr.wowhead.com', 'wowhead.com'), true)
    assert.equal(hostnameMatches('evilwowhead.com', 'wowhead.com'), false)
    assert.equal(hostnameMatches('wowhead.com.evil.com', 'wowhead.com'), false)
    assert.equal(hostnameMatches('noticy-veins.com', 'icy-veins.com'), false)
    assert.equal(sourceNameFromUrl('https://news.blizzard.com/en-us/article/1'), 'Blizzard News')
    assert.equal(sourceNameFromUrl('https://worldofwarcraft.blizzard.com/en-us/news/1'), 'Blizzard News')
    assert.equal(sourceNameFromUrl('https://www.wowhead.com/news/1'), 'Wowhead')
    assert.equal(sourceNameFromUrl('https://www.icy-veins.com/wow/'), 'Icy Veins')
    assert.equal(sourceNameFromUrl('https://evilwowhead.com/news/1'), 'evilwowhead.com')
    assert.equal(sourceNameFromUrl('https://wowhead.com.evil.com/news/1'), 'wowhead.com.evil.com')
    assert.equal(sourceNameFromUrl('https://noticy-veins.com/'), 'noticy-veins.com')
  })
})

describe('news seed and RSS', () => {
  it('inserts missing slugs only and never overwrites an admin edit', () => {
    const sqlite = new Database(':memory:')
    initializeDatabase(sqlite)
    const db = drizzle(sqlite, { schema })
    assert.equal(seedNewsArticlesIfMissing(db, FIXTURES), 5)
    assert.equal(seedNewsArticlesIfMissing(db, FIXTURES), 0)
    sqlite.prepare("UPDATE news_articles SET title = 'Edited' WHERE slug = 'wow-forever-now-live'").run()
    assert.equal(seedNewsArticlesIfMissing(db, FIXTURES), 0)
    const row = sqlite.prepare("SELECT title, is_published AS isPublished FROM news_articles WHERE slug = 'wow-forever-now-live'").get() as { title: string, isPublished: number }
    assert.equal(row.title, 'Edited')
    const pouch = sqlite.prepare("SELECT is_published AS isPublished FROM news_articles WHERE slug = ?").get(NEWS_UNPUBLISHED_SEED_SLUG) as { isPublished: number }
    assert.equal(pouch.isPublished, 0)
  })

  it('builds an RSS feed of published articles only', () => {
    const xml = buildNewsRss([
      {
        slug: 'wow-forever-now-live',
        title: 'World of Warcraft: Forever Is Now Live',
        summary: 'Launch.',
        body: 'Hello **there**.',
        publishedAt: 1794355200,
        author: NEWS_AUTHOR,
      },
      {
        slug: NEWS_UNPUBLISHED_SEED_SLUG,
        title: 'Should not appear when callers filter',
        summary: 'No.',
        body: 'No.',
        publishedAt: 1794355200,
        author: NEWS_AUTHOR,
      },
    ].filter(entry => entry.slug !== NEWS_UNPUBLISHED_SEED_SLUG))
    assert.match(xml, /<title>MagguuUI news<\/title>/)
    assert.match(xml, /World of Warcraft: Forever Is Now Live/)
    assert.match(xml, /<guid isPermaLink="true">https:\/\/ui\.magguu\.xyz\/news\/wow-forever-now-live<\/guid>/)
    assert.equal(newsEntryUrl({ slug: 'wow-forever-now-live', title: '', summary: '', body: '', publishedAt: 0, author: NEWS_AUTHOR }), 'https://ui.magguu.xyz/news/wow-forever-now-live')
    assert.doesNotMatch(xml, /Should not appear/)
    assert.match(xml, /&lt;strong&gt;there&lt;\/strong&gt;/)
  })
})
