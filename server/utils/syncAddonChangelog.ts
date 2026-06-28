import { eq } from 'drizzle-orm'
import { db, sqlite } from '~/server/database'
import { changelogs } from '~/server/database/schema'
import { parseAddonChangelog } from '~/server/utils/parseAddonChangelog'

export interface AddonChangelogSyncStats {
  inserted: number
  updated: number
  skipped: number
}

export function syncAddonChangelog(markdown: string): AddonChangelogSyncStats {
  const entries = parseAddonChangelog(markdown)
  const stats: AddonChangelogSyncStats = { inserted: 0, updated: 0, skipped: 0 }

  sqlite.transaction(() => {
    for (const entry of entries) {
      const existing = db.select().from(changelogs).where(eq(changelogs.version, entry.version)).get()
      if (existing) {
        if (existing.content !== entry.content) {
          db.update(changelogs)
            .set({
              content: entry.content,
              contentEn: entry.content,
              isPublished: true,
              publishedAt: entry.publishedAt,
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
          version: entry.version,
          content: entry.content,
          contentEn: entry.content,
          isPublished: true,
          publishedAt: entry.publishedAt,
        }).run()
        stats.inserted++
      }
    }
  })()

  return stats
}
