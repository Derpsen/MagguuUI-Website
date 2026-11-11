/**
 * Startup Plugin - Admin User Init
 *
 * Runs on every server start:
 * 1. Creates admin user if none exists (first install)
 * 2. Force-resets password if NUXT_FORCE_PASSWORD_RESET=true
 * 3. Seeds default site content if empty
 *
 * Seed, index/imprint migrations and exact-text content markers live in
 * `server/utils/bootSeed.ts`, `bootMigrations.ts` and `bootContentMarkers.ts`.
 * This file keeps the admin / force-reset path, the route-cache clear, and
 * the addon-catalogue seed (those last two use process-global db helpers).
 */

import bcrypt from 'bcrypt'
import { eq, count } from 'drizzle-orm'
import { db, sqlite } from '~/server/database'
import { users } from '~/server/database/schema'
import { purgeRetiredAddonProfiles } from '~/server/utils/addonProfileSync'
import { ensureAddonsSeeded } from '~/server/utils/syncAddons'
import { ensureBootIndexes, runWebsiteBootContent } from '~/server/utils/websiteBoot'

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
  ensureBootIndexes(sqlite)

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

  runWebsiteBootContent(db, sqlite, { shouldSyncSeededContent })

  // SWR-cached HTML from the previous build/seed (e.g. WIM chips, old contact
  // email) must not outlive a restart. Fire-and-forget; the plugin stays sync.
  const routeCache = useStorage('cache')
  routeCache.getKeys('nitro:routes')
    .then(keys => Promise.all(keys.map(key => routeCache.removeItem(key))))
    .then((done) => { if (done.length) console.log(`[Init] Cleared ${done.length} cached routes`) })
    .catch(err => console.error('[Init] Route cache clear failed:', err))

  try {
    const retiredProfiles = purgeRetiredAddonProfiles()
    if (retiredProfiles > 0) {
      console.log(`[Init] Purged ${retiredProfiles} retired addon profiles`)
    }
    const addonResult = ensureAddonsSeeded()
    if (addonResult.unavailable > 0) {
      console.log(`[Init] Purged ${addonResult.unavailable} retired addon catalogue entries`)
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
