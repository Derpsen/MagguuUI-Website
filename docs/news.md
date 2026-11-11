# News

Public Magguu notes at `/news` and `/news/[slug]`. Articles live in SQLite and
are edited in the admin at `/admin/content/news`. There are no ad slots in this
scaffold, and the site does not auto-publish from any feed.

## Schema (`news_articles`)

| Column | API field | Notes |
| --- | --- | --- |
| `id` | `id` | Integer primary key |
| `slug` | `slug` | Unique, lowercase `[a-z0-9]+(-[a-z0-9]+)*` |
| `title` | `title` | Required |
| `summary` | `summary` | Required, max 160 characters |
| `body` | `body` | Markdown. Public pages render it through `SafeHtml` / `displayRichText` (sanitized). Never raw unsanitized `v-html`. |
| `source_url` | `sourceUrl` | Optional canonical source |
| `source_name` | `sourceName` | Optional; derived from the URL host when empty (`news.blizzard.com` → "Blizzard News") |
| `published_at` | `publishedAt` | Unix seconds (UTC). The admin date field stores midnight UTC for that calendar day. |
| `author` | `author` | Always `Magguu` (the API and admin ignore other values) |
| `tags` | `tags` | JSON string array in SQLite, string array in the API |
| `is_published` | `isPublished` | Only published rows appear on `/news`, the sitemap, the RSS feed, and the public API |
| `created_at` / `updated_at` | — | Timestamps |

Extra sources from the seed Markdown are **not** a separate column. The first
`sources:` URL becomes `sourceUrl` / `sourceName`. Any further URLs are appended
as a `## Sources` list in the body when that heading is not already present.

## Seed

First boot inserts missing slugs from `server/database/news-seed/*.md` (Buddy
YAML frontmatter + body). Admin edits are never overwritten.

`pouch-of-violet-dust-launch-celebration` is always seeded **unpublished**. The
Twitch drop it describes ends 2026-11-13 01:30 Europe/Berlin, so it must not go
live automatically. Publish it from the admin only if you still want it public
after that cutoff.

## Public surface

- SSR `/news` (index) and `/news/[slug]` (404 when unpublished or unknown)
- `NewsArticle` JSON-LD on the article page
- Open Graph images through the existing Takumi `MagguuOg` card (`usePublicPageSeo`)
- Sitemap: `/news` plus published slugs (never the feed, never unpublished rows)
- RSS: `/news/feed.xml`
- Retail header + footer link, site search group "News", visitor tracking counts `/news` and `/news/[slug]` as `/news`
- Edge cache for `/news` and `/news/[slug]` (not `/news/feed.xml`)
- Internal "Also on this site" links to `/guide` and `/meta`. `/meta` lands with the Meta PRs; the link check is advisory, so a temporary 404 there does not block the build
- English copy, the plain site style, dark and light, axe-covered in Playwright

## Admin

`/admin/content/news` can create, edit, and delete articles (slug, title,
summary, body, source, tags, published flag, published date). Author is locked
to Magguu. Writes are audit-logged (`entityType: 'news'`) but are not undoable
from the audit log.

## Not in this PR

- Ad slots / `NUXT_ADS` / `AdSlot` (reserved for the later ads PR)
- Admin notice for new official Blizzard news RSS items (title + link only).
  **TODO:** a cheap poll of the official Blizzard news RSS that shows unseen
  titles and links in the admin, without auto-publishing.

## Environment

No new required env vars. Public listing is driven only by `isPublished`.
