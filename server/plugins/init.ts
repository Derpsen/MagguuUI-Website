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
import { users, siteContent, faqs, settings } from '~/server/database/schema'
import { DEFAULT_CONTENT_LOCALE } from '~/server/utils/contentLocales'
import { SITE_SETTINGS_DEFAULTS } from '~/utils/siteSettingsDefaults'
import { ensureAddonsSeeded } from '~/server/utils/syncAddons'

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
      `CREATE INDEX IF NOT EXISTS idx_addons_category_sort ON addons (category, sort_order)`,
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

    if (shouldSyncSeededContent) {
      const syncSection = (page: 'home' | 'guide', entries: readonly typeof DEFAULT_GUIDE_CONTENT[number][]) => {
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
    const addonResult = ensureAddonsSeeded()
    if (addonResult.inserted > 0) {
      console.log(`[Init] Addons seeded (inserted: ${addonResult.inserted})`)
    } else {
      console.log('[Init] Addons table already populated')
    }
  } catch (err) {
    console.error('[Init] Addon seed failed:', err)
  }

  console.log('[Init] Startup complete')
})
