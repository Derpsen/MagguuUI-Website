/**
 * Orchestrates the behavior-neutral website boot (except admin/force-reset,
 * route-cache clear, and addon-catalogue seed — those stay in init.ts).
 *
 * Call order is the historical init.ts order after the admin block:
 * site content / settings seed, then markers, then FAQs, changelogs, news,
 * imprint cleanup, contact-email repair.
 */
import { settings } from '~/server/database/schema'
import { ensureBootIndexes, removeRetiredImprintSettings } from './bootMigrations'
import {
  repairEmptyCurseforgeUrl,
  seedAndRepairChangelogs,
  seedAndRepairFaqs,
  seedMissingSettings,
  seedSiteContentIfEmpty,
  syncSeededPageContent,
} from './bootSeed'
import { seedNewsArticlesIfMissing } from './bootNews'
import {
  applyLegacyContentMarkers,
  clearPrivateGithubSetting,
  repairLegacySettingValues,
  repairRetiredContactEmail,
  rewritePrivateRepoLinksInDb,
} from './bootContentMarkers'
import type { WebsiteBootDb, WebsiteBootSqlite } from './websiteBootTypes'

export type WebsiteBootOptions = {
  shouldSyncSeededContent: boolean
}

/** Index ensure runs before the admin/force-reset block in init.ts. */
export { ensureBootIndexes }

/**
 * Remaining boot work after admin setup. Try/catch groups match init.ts
 * so a failure in one group still lets the later groups run.
 */
export function runWebsiteBootContent(db: WebsiteBootDb, sqlite: WebsiteBootSqlite, options: WebsiteBootOptions): void {
  const shouldSyncSeededContent = options.shouldSyncSeededContent

  try {
    seedSiteContentIfEmpty(db)

    const existingSettings = db.select().from(settings).all()
    seedMissingSettings(db, existingSettings)
    repairEmptyCurseforgeUrl(db, existingSettings)

    let repairedSettings = repairLegacySettingValues(db, existingSettings)
    repairedSettings += clearPrivateGithubSetting(db, existingSettings)
    const repoLinkRewrites = rewritePrivateRepoLinksInDb(sqlite)
    if (repoLinkRewrites > 0) {
      console.log(`[Init] Rewrote ${repoLinkRewrites} private MagguuUI repo links`)
    }
    if (repairedSettings > 0) {
      console.log(`[Init] Repaired ${repairedSettings} outdated default site settings`)
    }

    // Repair only known outdated seed text. Admin-authored content that does
    // not contain one of these obsolete claims remains untouched even when
    // full NUXT_SYNC_SEEDED_CONTENT syncing is disabled.
    const repairedContent = applyLegacyContentMarkers(db)
    if (repairedContent > 0) {
      console.log(`[Init] Repaired ${repairedContent} outdated default content entries`)
    }

    syncSeededPageContent(db, shouldSyncSeededContent)
  } catch (err) {
    console.error('[Init] Site content seeding failed:', err)
  }

  seedAndRepairFaqs(db, shouldSyncSeededContent)
  seedAndRepairChangelogs(db)
  seedNewsArticlesIfMissing(db)
  removeRetiredImprintSettings(sqlite)
  repairRetiredContactEmail(db)
}

/** Indexes + content/settings/FAQ/changelog boot, for characterization tests. */
export function runWebsiteBoot(db: WebsiteBootDb, sqlite: WebsiteBootSqlite, options: WebsiteBootOptions): void {
  ensureBootIndexes(sqlite)
  runWebsiteBootContent(db, sqlite, options)
}
