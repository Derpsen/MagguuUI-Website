/**
 * First-run and missing-row seeds for site content, settings, FAQs and changelogs.
 * FAQ/changelog repair of known-stale rows stays in the same functions because
 * they share one snapshot of existing rows with the insert loop.
 */
import { count, eq } from 'drizzle-orm'
import { DEFAULT_FAQS, DEFAULT_GUIDE_CONTENT, DEFAULT_HOME_CONTENT, DEFAULT_SITE_CONTENT } from '~/server/database/defaultContent'
import { CURRENT_ADDON_CHANGELOG, PREVIOUS_ADDON_CHANGELOGS, scrubPublishedChangelog } from '~/server/database/defaultAddonChangelog'
import { UNRELEASED_CHANGELOG_VERSION, isUnreleasedAddonVersion } from '~/server/utils/parseAddonChangelog'
import { siteContent, faqs, settings, changelogs } from '~/server/database/schema'
import { SITE_SETTINGS_DEFAULTS } from '~/utils/siteSettingsDefaults'
import { LEGACY_FAQ_MARKERS } from './bootContentMarkers'
import type { WebsiteBootDb, WebsiteBootSetting } from './websiteBootTypes'

type SeedContentEntry = typeof DEFAULT_SITE_CONTENT[number]

export function seedSiteContentIfEmpty(db: WebsiteBootDb): void {
  const contentCount = db.select({ count: count() }).from(siteContent).get()
  if (!contentCount || contentCount.count === 0) {
    for (const item of DEFAULT_SITE_CONTENT) {
      db.insert(siteContent).values(item).run()
    }
    console.log('[Init] Default site content seeded')
  }
}

export function seedMissingSettings(db: WebsiteBootDb, existingSettings: WebsiteBootSetting[]): number {
  const existingSettingKeys = new Set(existingSettings.map(setting => setting.key))
  let insertedSettings = 0
  for (const [key, value] of Object.entries(SITE_SETTINGS_DEFAULTS)) {
    if (existingSettingKeys.has(key)) continue
    db.insert(settings).values({ key, value }).run()
    insertedSettings++
  }
  if (insertedSettings > 0) {
    console.log(`[Init] Added ${insertedSettings} missing default site settings`)
  }
  return insertedSettings
}

export function repairEmptyCurseforgeUrl(db: WebsiteBootDb, existingSettings: WebsiteBootSetting[]): void {
  const curseForgeSetting = existingSettings.find(setting => setting.key === 'curseforge_url')
  if (curseForgeSetting && !curseForgeSetting.value.trim()) {
    db.update(settings)
      .set({ value: SITE_SETTINGS_DEFAULTS.curseforge_url, updatedAt: new Date() })
      .where(eq(settings.id, curseForgeSetting.id))
      .run()
    console.log('[Init] Added the default MagguuUI CurseForge link')
  }
}

export function syncSeededPageContent(db: WebsiteBootDb, shouldSyncSeededContent: boolean): void {
  if (shouldSyncSeededContent) {
    const syncSection = (page: 'home' | 'guide', entries: readonly SeedContentEntry[]) => {
      const existing = db.select().from(siteContent)
        .where(eq(siteContent.page, page))
        .all()
      const byKey = new Map(existing.map((item) => [`${item.section}:${item.key}:${item.locale}`, item]))

      let inserted = 0
      let updated = 0

      for (const entry of entries) {
        const key = `${entry.section}:${entry.key}:${entry.locale}`
        const row = byKey.get(key)

        if (!row) {
          db.insert(siteContent).values(entry).run()
          inserted++
          continue
        }

        if (row.value !== entry.value
          || row.sortOrder !== entry.sortOrder
          || row.type !== entry.type) {
          db.update(siteContent)
            .set({
              value: entry.value,
              type: entry.type,
              sortOrder: entry.sortOrder,
              updatedAt: new Date(),
            })
            .where(eq(siteContent.id, row.id))
            .run()
          updated++
        }
      }

      if (inserted > 0 || updated > 0) {
        console.log(`[Init] ${page} synced (inserted: ${inserted}, updated: ${updated})`)
      } else {
        console.log(`[Init] ${page} already up to date`)
      }
    }

    syncSection('home', DEFAULT_HOME_CONTENT)
    syncSection('guide', DEFAULT_GUIDE_CONTENT)
  } else {
    console.log('[Init] Content sync skipped (set NUXT_SYNC_SEEDED_CONTENT=true to force code-driven sync)')
  }
}

export function seedAndRepairFaqs(db: WebsiteBootDb, shouldSyncSeededContent: boolean): void {
  try {
    const existingFaqs = db.select().from(faqs).all()
    const faqByKey = new Map(existingFaqs.map((faq) => [`${faq.category}:${faq.sortOrder}`, faq]))

    let inserted = 0
    let updated = 0

    for (const faq of DEFAULT_FAQS) {
      const key = `${faq.category}:${faq.sortOrder}`
      const existing = faqByKey.get(key)

      if (!existing) {
        db.insert(faqs).values({
          category: faq.category,
          question: faq.question,
          answer: faq.answer,
          sortOrder: faq.sortOrder,
          isVisible: true,
        }).run()
        inserted++
        continue
      }

      if (shouldSyncSeededContent && (
        existing.question !== faq.question
        || existing.answer !== faq.answer
        || existing.isVisible !== true
      )) {
        db.update(faqs)
          .set({
            question: faq.question,
            answer: faq.answer,
            isVisible: true,
            updatedAt: new Date(),
          })
          .where(eq(faqs.id, existing.id))
          .run()
        updated++
      }
    }

    if (!shouldSyncSeededContent) {
      for (const legacy of LEGACY_FAQ_MARKERS) {
        const key = `${legacy.category}:${legacy.sortOrder}`
        const existing = faqByKey.get(key)
        const replacement = DEFAULT_FAQS.find(faq =>
          faq.category === legacy.category && faq.sortOrder === legacy.sortOrder,
        )
        if (!existing || !replacement) continue
        if (existing.question === replacement.question
          && existing.answer === replacement.answer
          && existing.isVisible === true) continue
        if (!existing.question.includes(legacy.marker) && !existing.answer.includes(legacy.marker)) continue

        db.update(faqs)
          .set({
            question: replacement.question,
            answer: replacement.answer,
            isVisible: true,
            updatedAt: new Date(),
          })
          .where(eq(faqs.id, existing.id))
          .run()
        updated++
      }
    }

    if (existingFaqs.length === 0) {
      console.log(`[Init] ${DEFAULT_FAQS.length} default FAQ entries seeded`)
    } else if (inserted > 0 || updated > 0) {
      console.log(`[Init] FAQ synced (inserted: ${inserted}, updated: ${updated})`)
    } else if (!shouldSyncSeededContent) {
      console.log('[Init] FAQ sync skipped (set NUXT_SYNC_SEEDED_CONTENT=true to force code-driven sync)')
    } else {
      console.log('[Init] FAQ already up to date')
    }
  } catch (err) {
    console.error('[Init] FAQ sync failed:', err)
  }
}

export function seedAndRepairChangelogs(db: WebsiteBootDb): void {
  try {
    const currentRelease = db.select().from(changelogs)
      .where(eq(changelogs.version, CURRENT_ADDON_CHANGELOG.version))
      .get()
    if (!currentRelease) {
      db.insert(changelogs).values({
        version: CURRENT_ADDON_CHANGELOG.version,
        content: CURRENT_ADDON_CHANGELOG.content,
        contentEn: CURRENT_ADDON_CHANGELOG.content,
        isPublished: true,
        publishedAt: CURRENT_ADDON_CHANGELOG.publishedAt,
      }).run()
      console.log(`[Init] Added current addon changelog ${CURRENT_ADDON_CHANGELOG.version}`)
    } else if (
      currentRelease.content.includes('three tabs')
      || currentRelease.content.includes('Four tabs')
      || currentRelease.content.includes('profile and alerts')
      || currentRelease.content.includes('individual profiles, presets')
      || currentRelease.content.includes('Giant options panel, and 4K scale in one click')
      || currentRelease.content.includes('copies an Edit Mode')
      || currentRelease.content.includes('TOC interfaces')
      || currentRelease.content.includes('UI strings for every Blizzard client locale')
      || currentRelease.content.includes('accepts the Magguu consent popup automatically')
      || currentRelease.content.includes('Ellesmere QoL/Shifter defaults')
      || currentRelease.content.includes('7.9.5')
      || currentRelease.content.includes('Set scale only')
      || currentRelease.content.includes('one folder')
      || currentRelease.content.includes('All Bosses merge')
      || currentRelease.content.includes('Dual ring/trinket')
      || currentRelease.content.includes('Premade Groups Filter, KeystoneLoot.')
      || currentRelease.content.includes('KeystoneLoot, Auctionator')
      || currentRelease.content.includes('third-party KeystoneLoot')
      || currentRelease.content.includes('KeystoneLoot Best in Slot')
      || currentRelease.content.includes('Archon Best in Slot')
      || currentRelease.content.includes('KeystoneLoot')
      || currentRelease.content.includes('split EXBoss names')
      || currentRelease.content.includes('Ellesmere 9.0.7')
      || currentRelease.content.includes('bake 9.0.8')
      || currentRelease.content.includes('Ellesmere 9.0.8')
      || currentRelease.content.includes('Gold Setup is **Install All**')
      || currentRelease.content.includes('### Setup')
      || currentRelease.content.includes('Magguu Look')
      || currentRelease.content.includes('TopBar, Hearth-Picker')
      || currentRelease.content.includes('Fresh Magguu bake **2026-09-09**')
      || currentRelease.content.includes('Fresh Magguu bake **2026-09-11**')
      || currentRelease.content.includes('no Magguu profile bake yet')
      || currentRelease.content.includes('reimport the bake')
      || currentRelease.content.includes('dump addons')
      || currentRelease.content.includes('**Tools → Exports**')
      || currentRelease.content.includes('EllesmereUI (full), BigWigs, Northern Sky, EXBoss, WIM, and Waypoint UI')
      || currentRelease.content.includes('Ellesmere WIM Skin')
      || !currentRelease.content.includes('HandyNotes')
      || !currentRelease.content.includes('HandyNotes MapNotes')
      || !currentRelease.content.includes('keystone viewer')
    ) {
      db.update(changelogs)
        .set({
          content: CURRENT_ADDON_CHANGELOG.content,
          contentEn: CURRENT_ADDON_CHANGELOG.content,
          publishedAt: CURRENT_ADDON_CHANGELOG.publishedAt,
          updatedAt: new Date(),
        })
        .where(eq(changelogs.id, currentRelease.id))
        .run()
      console.log(`[Init] Updated current addon changelog ${CURRENT_ADDON_CHANGELOG.version}`)
    }

    for (const entry of PREVIOUS_ADDON_CHANGELOGS) {
      const older = db.select().from(changelogs)
        .where(eq(changelogs.version, entry.version))
        .get()
      if (!older) {
        db.insert(changelogs).values({
          version: entry.version,
          content: entry.content,
          contentEn: entry.content,
          isPublished: true,
          publishedAt: entry.publishedAt,
        }).run()
        console.log(`[Init] Added addon changelog ${entry.version}`)
      } else if (
        older.content.includes('leave EXBoss MythicCast')
        || older.content.includes('Leave **EXBoss MythicCast')
        || older.content.includes('Leave EXBoss MythicCast')
      ) {
        db.update(changelogs)
          .set({
            content: entry.content,
            contentEn: entry.content,
            publishedAt: entry.publishedAt,
            isPublished: true,
            updatedAt: new Date(),
          })
          .where(eq(changelogs.id, older.id))
          .run()
        console.log(`[Init] Updated addon changelog ${entry.version}`)
      }
    }

    // Rows synced from a not-yet-released heading (v12.1.9, v12.1.9-Dev) become
    // "Unreleased"; the newest of them wins if there are several.
    const pending = db.select().from(changelogs).all()
      .filter(row => row.version.startsWith('v') && isUnreleasedAddonVersion(row.version, CURRENT_ADDON_CHANGELOG.version))
      .sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0))
    if (pending.length) {
      const hasUnreleased = db.select().from(changelogs).where(eq(changelogs.version, UNRELEASED_CHANGELOG_VERSION)).get()
      pending.forEach((row, index) => {
        if (index === 0 && !hasUnreleased) {
          db.update(changelogs).set({ version: UNRELEASED_CHANGELOG_VERSION, updatedAt: new Date() }).where(eq(changelogs.id, row.id)).run()
          console.log(`[Init] Renamed changelog ${row.version} to ${UNRELEASED_CHANGELOG_VERSION}`)
        }
        else {
          db.delete(changelogs).where(eq(changelogs.id, row.id)).run()
          console.log(`[Init] Removed duplicate unreleased changelog ${row.version}`)
        }
      })
    }

    const publishedNotes = db.select().from(changelogs).all()
    for (const note of publishedNotes) {
      const content = scrubPublishedChangelog(note.content)
      const contentEn = note.contentEn == null ? null : scrubPublishedChangelog(note.contentEn)
      if (content === note.content && contentEn === note.contentEn) continue
      db.update(changelogs)
        .set({ content, contentEn, updatedAt: new Date() })
        .where(eq(changelogs.id, note.id))
        .run()
      console.log(`[Init] Scrubbed public changelog ${note.version}`)
    }
  } catch (err) {
    console.error('[Init] Current addon changelog seed failed:', err)
  }
}
