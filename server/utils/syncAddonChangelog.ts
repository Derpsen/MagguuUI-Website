import { eq } from 'drizzle-orm'
import { db, sqlite } from '~/server/database'
import { changelogs } from '~/server/database/schema'
import { parseAddonChangelog, pickLatestAddonChangelog } from '~/server/utils/parseAddonChangelog'

export interface AddonChangelogSyncStats {
  inserted: number
  updated: number
  skipped: number
}

/**
 * Upsert only the newest CHANGELOG.md heading.
 * Older ## versions stay on GitHub; admin can still keep historical rows.
 */
export function syncAddonChangelog(markdown: string): AddonChangelogSyncStats {
  const entries = parseAddonChangelog(markdown)
  const latest = pickLatestAddonChangelog(entries)
  const historical = Math.max(0, entries.length - (latest ? 1 : 0))
  const stats: AddonChangelogSyncStats = { inserted: 0, updated: 0, skipped: historical }

  if (!latest) return stats

  sqlite.transaction(() => {
    const existing = db.select().from(changelogs).where(eq(changelogs.version, latest.version)).get()
    if (existing) {
      if (existing.content !== latest.content) {
        db.update(changelogs)
          .set({
            content: latest.content,
            contentEn: latest.content,
            isPublished: true,
            publishedAt: latest.publishedAt,
            updatedAt: new Date(),
          })
          .where(eq(changelogs.id, existing.id))
          .run()
        stats.updated++
      } else {
        stats.skipped++
      }
    } else {
      db.insert(changelogs).values({
        version: latest.version,
        content: latest.content,
        contentEn: latest.content,
        isPublished: true,
        publishedAt: latest.publishedAt,
      }).run()
      stats.inserted++
    }
  })()

  return stats
}
