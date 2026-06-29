/**
 * Startup Plugin - Admin User Init
 *
 * Runs on every server start:
 * 1. Creates admin user if none exists (first install)
 * 2. Force-resets password if NUXT_FORCE_PASSWORD_RESET=true
 * 3. Seeds default site content if empty
 */

import bcrypt from 'bcrypt'
import { and, eq, count } from 'drizzle-orm'
import { db, sqlite } from '~/server/database'
import { DEFAULT_FAQS, DEFAULT_GUIDE_CONTENT, DEFAULT_HOME_CONTENT, DEFAULT_SITE_CONTENT } from '~/server/database/defaultContent'
import { CURRENT_ADDON_CHANGELOG } from '~/server/database/defaultAddonChangelog'
import { users, siteContent, faqs, settings, changelogs, addons } from '~/server/database/schema'
import { DEFAULT_CONTENT_LOCALE } from '~/server/utils/contentLocales'
import { SITE_SETTINGS_DEFAULTS } from '~/utils/siteSettingsDefaults'
import { ensureAddonsSeeded } from '~/server/utils/syncAddons'
import { findAddonDefaultByTocName } from '~/server/database/addonMetadata'

type SeedContentEntry = typeof DEFAULT_SITE_CONTENT[number]

const LEGACY_CONTENT_MARKERS = [
  { page: 'home', section: 'hero', key: 'description', marker: 'MagguuUI is an in-game addon that installs and configures ElvUI' },
  { page: 'home', section: 'hero', key: 'description', marker: 'MagguuUI is a standalone in-game installer that configures ElvUI' },
  { page: 'home', section: 'hero', key: 'badge', marker: 'New: AutoRoll + Pack system' },
  { page: 'home', section: 'hero', key: 'badge', marker: 'New: MRT + ilvl tags' },
  { page: 'home', section: 'features', key: 'feature_1_text', marker: 'Every supported addon — from ElvUI and Plater' },
  { page: 'home', section: 'features', key: 'feature_1_text', marker: 'Every supported addon you have enabled gets its profile applied' },
  { page: 'home', section: 'features', key: 'feature_3_title', marker: 'Class layouts + custom tags' },
  { page: 'home', section: 'features', key: 'feature_3_text', marker: 'Cooldown layouts are pre-built for every class' },
  { page: 'home', section: 'features_heading', key: 'subtitle', marker: 'Everything you need — in one package' },
  { page: 'home', section: 'addons', key: 'subtitle', marker: 'Profiles for 30+ of the most popular WoW addons' },
  { page: 'home', section: 'addons', key: 'subtitle', marker: 'of the most popular WoW addons' },
  { page: 'guide', section: 'intro', key: 'text', marker: 'Install ElvUI, install MagguuUI' },
  { page: 'guide', section: 'intro', key: 'text', marker: 'Getting started takes about five minutes' },
  { page: 'guide', section: 'steps', key: 'step_1_title', marker: '1. Install ElvUI' },
  { page: 'guide', section: 'steps', key: 'step_1', marker: 'will not work without it' },
  { page: 'guide', section: 'steps', key: 'step_2_title', marker: '2. Install MagguuUI' },
  { page: 'guide', section: 'steps', key: 'step_2', marker: 'Get MagguuUI from any of these sources:' },
  { page: 'guide', section: 'steps', key: 'step_2', marker: 'MagguuUI runs on its own. Install only the supported addons' },
  { page: 'guide', section: 'steps', key: 'step_4', marker: 'MagguuUI applies the correct profile to every supported addon' },
  { page: 'guide', section: 'steps', key: 'step_6', marker: 'shift+left-click opens Settings' },
  { page: 'guide', section: 'steps', key: 'step_6', marker: 'Row direction, icon borders, visibility and banner position are configurable' },
  { page: 'guide', section: 'steps', key: 'step_6', marker: '**Custom ElvUI tags** (Settings → Tags, off by default)' },
] as const

const LEGACY_FAQ_MARKERS = [
  { category: 'general', sortOrder: 0, marker: 'Instead of spending hours tweaking ElvUI' },
  { category: 'general', sortOrder: 1, marker: 'https://www.curseforge.com/wow/addons)' },
  { category: 'general', sortOrder: 2, marker: 'only ElvUI is required' },
  { category: 'general', sortOrder: 2, marker: 'Do I need every supported addon?' },
  { category: 'installation', sortOrder: 0, marker: 'Install **ElvUI 15.12+**' },
  { category: 'installation', sortOrder: 0, marker: 'Five steps, takes about two minutes' },
  { category: 'installation', sortOrder: 3, marker: '**No.** ElvUI is the foundation' },
  { category: 'addons', sortOrder: 0, marker: 'BigWigs (or Northern Sky Raid Tools)' },
  { category: 'addons', sortOrder: 0, marker: '**Main integrations**' },
  { category: 'addons', sortOrder: 2, marker: 'Master toggle sits in **Settings → Tags**' },
  { category: 'addons', sortOrder: 4, marker: 'WowUp Required / Optional' },
  { category: 'addons', sortOrder: 4, marker: 'They are recommendations, not requirements.' },
  { category: 'addons', sortOrder: 5, marker: 'Can MagguuUI auto-roll on loot for me?' },
  { category: 'addons', sortOrder: 6, marker: 'What is MagguuUI Data' },
  { category: 'addons', sortOrder: 7, marker: 'What are the Dev Tools?' },
  { category: 'addons', sortOrder: 10, marker: 'Keystone List section in MagguuUI settings' },
  { category: 'troubleshooting', sortOrder: 0, marker: 'ElvUI enabled and version 15.12' },
  { category: 'troubleshooting', sortOrder: 0, marker: 'At least one supported addon is enabled' },
  { category: 'troubleshooting', sortOrder: 3, marker: 'Your ElvUI version' },
] as const

// Nitro's runNitroPlugins calls plugins without awaiting their promise.
// That means the HTTP server starts accepting requests while an async
// plugin is still in an `await`. On Linux CI, bcrypt.hash(password, 12)
// is slow enough that the first request (from Nuxt's SSR on /) arrives
// BEFORE the site_content seed runs, populating the SWR route cache
// with an empty response for the next 120 seconds. Keep this plugin
// synchronous: better-sqlite3 is sync, bcrypt offers hashSync.
export default defineNitroPlugin(() => {
  const config = useRuntimeConfig()
  const shouldSyncSeededContent = process.env.NUXT_SYNC_SEEDED_CONTENT === 'true'

  // ── Idempotent index ensure ─────────────────────────
  // The project uses `drizzle-kit push` rather than versioned migrations, so we
  // apply new indexes here on startup. `IF NOT EXISTS` makes each statement
  // safe to re-run, and SQLite handles index creation in a single pass.
  try {
    const indexStatements = [
      `CREATE INDEX IF NOT EXISTS idx_activity_log_entity_type_created_at ON activity_log (entity_type, created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_activity_log_user_id_created_at ON activity_log (user_id, created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_expires_at ON webauthn_challenges (expires_at)`,
      `CREATE INDEX IF NOT EXISTS idx_copy_events_string_type_string_id ON copy_events (string_type, string_id)`,
      `CREATE INDEX IF NOT EXISTS idx_copy_events_created_at ON copy_events (created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_page_views_path_created_at ON page_views (path, created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views (created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_logs (created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_passkeys_user_id ON passkeys (user_id)`,
    ]
    for (const stmt of indexStatements) sqlite.exec(stmt)
    console.log(`[Init] Ensured ${indexStatements.length} performance indexes`)
  } catch (err) {
    console.error('[Init] Index ensure failed:', err)
  }

  try {
    const adminCount = db.select({ count: count() }).from(users).get()
    const hasUsers = adminCount && adminCount.count > 0

    if (!hasUsers) {
      const password = config.adminPassword || 'changeme'

      if (process.env.NODE_ENV === 'production' && (!config.adminPassword || password === 'changeme')) {
        throw new Error('Refusing to create the first admin user in production with an empty or default password. Set NUXT_ADMIN_PASSWORD to a strong value first.')
      }

      const hash = bcrypt.hashSync(password, 12)

      db.insert(users).values({
        username: 'admin',
        passwordHash: hash,
        role: 'admin',
      }).run()

      console.log('[Init] Admin user created (username: admin)')
      if (password === 'changeme') {
        console.log('[Init] Using default password "changeme" - change it in the admin panel!')
      }
    } else {
      const forceReset = process.env.NUXT_FORCE_PASSWORD_RESET === 'true'
      if (forceReset && config.adminPassword) {
        const hash = bcrypt.hashSync(config.adminPassword, 12)
        db.update(users)
          .set({ passwordHash: hash, updatedAt: new Date() })
          .where(eq(users.username, 'admin'))
          .run()
        console.log('[Init] Admin password force-reset - set NUXT_FORCE_PASSWORD_RESET back to false!')
      } else {
        console.log('[Init] Admin user exists')
      }
    }
  } catch (err) {
    console.error('[Init] Admin user setup failed:', err)
    if (process.env.NODE_ENV === 'production') {
      throw err
    }
  }

  try {
    const contentCount = db.select({ count: count() }).from(siteContent).get()
    if (!contentCount || contentCount.count === 0) {
      for (const item of DEFAULT_SITE_CONTENT) {
        db.insert(siteContent).values(item).run()
      }
      console.log('[Init] Default site content seeded')
    }

    const existingSettings = db.select().from(settings).all()
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
    const curseForgeSetting = existingSettings.find(setting => setting.key === 'curseforge_url')
    if (curseForgeSetting && !curseForgeSetting.value.trim()) {
      db.update(settings)
        .set({ value: SITE_SETTINGS_DEFAULTS.curseforge_url, updatedAt: new Date() })
        .where(eq(settings.id, curseForgeSetting.id))
        .run()
      console.log('[Init] Added the default MagguuUI CurseForge link')
    }
    const legacySettingValues = [
      {
        key: 'site_description',
        value: 'World of Warcraft UI Configuration',
        replacement: SITE_SETTINGS_DEFAULTS.site_description,
      },
      {
        key: 'meta_description',
        value: 'High-quality import strings for ElvUI, Plater, BigWigs, Details and more. Simply copy and paste into WoW.',
        replacement: SITE_SETTINGS_DEFAULTS.meta_description,
      },
    ] as const
    let repairedSettings = 0
    for (const legacy of legacySettingValues) {
      const setting = existingSettings.find(item => item.key === legacy.key)
      if (!setting || setting.value !== legacy.value) continue
      db.update(settings)
        .set({ value: legacy.replacement, updatedAt: new Date() })
        .where(eq(settings.id, setting.id))
        .run()
      repairedSettings++
    }
    if (repairedSettings > 0) {
      console.log(`[Init] Repaired ${repairedSettings} outdated default site settings`)
    }

    // Repair only known outdated seed text. Admin-authored content that does
    // not contain one of these obsolete claims remains untouched even when
    // full NUXT_SYNC_SEEDED_CONTENT syncing is disabled.
    let repairedContent = 0
    for (const legacy of LEGACY_CONTENT_MARKERS) {
      const replacement = DEFAULT_SITE_CONTENT.find(entry =>
        entry.page === legacy.page
        && entry.section === legacy.section
        && entry.key === legacy.key
        && entry.locale === DEFAULT_CONTENT_LOCALE,
      )
      if (!replacement) continue

      const row = db.select().from(siteContent)
        .where(and(
          eq(siteContent.page, legacy.page),
          eq(siteContent.section, legacy.section),
          eq(siteContent.key, legacy.key),
          eq(siteContent.locale, DEFAULT_CONTENT_LOCALE),
        ))
        .get()
      if (!row || !row.value.includes(legacy.marker)) continue

      db.update(siteContent)
        .set({
          value: replacement.value,
          type: replacement.type,
          sortOrder: replacement.sortOrder,
          updatedAt: new Date(),
        })
        .where(eq(siteContent.id, row.id))
        .run()
      repairedContent++
    }
    if (repairedContent > 0) {
      console.log(`[Init] Repaired ${repairedContent} outdated default content entries`)
    }

    if (shouldSyncSeededContent) {
      const syncSection = (page: 'home' | 'guide', entries: readonly SeedContentEntry[]) => {
        const existing = db.select().from(siteContent)
          .where(and(eq(siteContent.page, page), eq(siteContent.locale, DEFAULT_CONTENT_LOCALE)))
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
  } catch (err) {
    console.error('[Init] Site content seeding failed:', err)
  }

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
    }
  } catch (err) {
    console.error('[Init] Current addon changelog seed failed:', err)
  }

  try {
    const addonResult = ensureAddonsSeeded()
    const legacyElvUI = db.select().from(addons).where(eq(addons.slug, 'elvui')).get()
    const elvUIDefault = findAddonDefaultByTocName('ElvUI')
    if (legacyElvUI && elvUIDefault && (
      legacyElvUI.category === 'required'
      || legacyElvUI.description?.includes('Required version: 15.12')
    )) {
      db.update(addons)
        .set({
          category: 'core',
          description: elvUIDefault.description,
          updatedAt: new Date(),
        })
        .where(eq(addons.id, legacyElvUI.id))
        .run()
      console.log('[Init] Updated ElvUI optional status in the addon catalogue')
    }
    if (addonResult.inserted > 0 || addonResult.updated > 0) {
      console.log(`[Init] Addons seeded (inserted: ${addonResult.inserted}, completed metadata: ${addonResult.updated})`)
    } else {
      console.log('[Init] Addons table already populated')
    }
  } catch (err) {
    console.error('[Init] Addon seed failed:', err)
  }

  console.log('[Init] Startup complete')
})
