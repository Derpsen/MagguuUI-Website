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
import { RETIRED_ADDON_SLUGS } from '~/server/database/addonMetadata'

type SeedContentEntry = typeof DEFAULT_SITE_CONTENT[number]

const LEGACY_CONTENT_MARKERS = [
  { page: 'home', section: 'hero', key: 'description', marker: 'MagguuUI is an in-game addon that installs and configures ElvUI' },
  { page: 'home', section: 'hero', key: 'description', marker: 'MagguuUI is a standalone in-game installer that configures ElvUI' },
  { page: 'home', section: 'hero', key: 'description', marker: 'MagguuUI is a standalone installer for WoW Retail' },
  { page: 'home', section: 'hero', key: 'description', marker: 'Install **EllesmereUI**' },
  { page: 'home', section: 'hero', key: 'description', marker: 'open `/mui`' },
  { page: 'home', section: 'hero', key: 'badge', marker: 'New: AutoRoll + Pack system' },
  { page: 'home', section: 'hero', key: 'badge', marker: 'New: MRT + ilvl tags' },
  { page: 'home', section: 'hero', key: 'badge', marker: 'Ready for WoW 12.0.7' },
  { page: 'home', section: 'hero', key: 'badge', marker: 'Ready for WoW 12.0' },
  { page: 'home', section: 'features', key: 'feature_1_text', marker: 'Every supported addon — from ElvUI and Plater' },
  { page: 'home', section: 'features', key: 'feature_1_text', marker: 'Every supported addon you have enabled gets its profile applied' },
  { page: 'home', section: 'features', key: 'feature_1_text', marker: 'MagguuUI** and **MagguuUI_Data' },
  { page: 'home', section: 'features', key: 'feature_1_text', marker: 'Setup, Skinning, and QoL' },
  { page: 'home', section: 'features', key: 'feature_1_text', marker: 'individual profiles, presets' },
  { page: 'home', section: 'features', key: 'feature_1_text', marker: 'Profile imports Magguu strings' },
  { page: 'home', section: 'features', key: 'feature_1_text', marker: 'Setup runs the 4K install, Magguu-Look, and Magguu profile imports' },
  { page: 'home', section: 'features', key: 'feature_1_text', marker: 'WowUp copy popups. Werkzeuge exports your live profiles.' },
  { page: 'home', section: 'features', key: 'feature_2_text', marker: 'copies an Edit Mode layout' },
  { page: 'home', section: 'features', key: 'feature_2_text', marker: 'never writes Blizzard Edit Mode itself' },
  { page: 'home', section: 'features', key: 'feature_1_text', marker: 'Setup runs the 4K install, Magguu-Look, and Magguu profile imports' },
  { page: 'guide', section: 'steps', key: 'step_4', marker: 'Per-addon Magguu imports live on the **Profile** tab' },
  { page: 'guide', section: 'steps', key: 'step_6', marker: 'Profile tab (import)' },
  { page: 'guide', section: 'steps', key: 'step_6', marker: 'reloads immediately so the layouts stick' },
  { page: 'home', section: 'features', key: 'feature_1_title', marker: 'One-click setup' },
  { page: 'home', section: 'features', key: 'feature_2_text', marker: 'the in-game changelog shows you exactly what changed' },
  { page: 'home', section: 'features', key: 'feature_2_text', marker: 'import as **Magguu - Class Spec**' },
  { page: 'home', section: 'features', key: 'feature_2_text', marker: 'copies an Edit Mode layout' },
  { page: 'home', section: 'features', key: 'feature_2_text', marker: 'never writes protected Blizzard layout state' },
  { page: 'home', section: 'features', key: 'feature_3_title', marker: 'Class layouts + custom tags' },
  { page: 'home', section: 'features', key: 'feature_3_title', marker: 'Useful extras built in' },
  { page: 'home', section: 'features', key: 'feature_3_text', marker: 'Cooldown layouts are pre-built for every class' },
  { page: 'home', section: 'features', key: 'feature_3_text', marker: 'AutoRoll, audio switching' },
  { page: 'home', section: 'hero', key: 'description', marker: 'Northern Sky Raid Tools stay optional' },
  { page: 'home', section: 'hero', key: 'description', marker: 'native EllesmereUI module for WoW Retail. Install <strong>EllesmereUI</strong> and the single' },
  { page: 'home', section: 'features', key: 'feature_1_text', marker: 'Tooltips stay at Magguu' },
  { page: 'home', section: 'features', key: 'feature_1_text', marker: 'required and optional Magguu imports, and WowUp copy popups' },
  { page: 'home', section: 'features', key: 'feature_1_text', marker: 'Werkzeuge exports your live profiles' },
  { page: 'home', section: 'features', key: 'feature_2_text', marker: 'After a successful import MagguuUI asks you to reload so the layouts stick' },
  { page: 'home', section: 'features', key: 'feature_2_text', marker: 'Cooldown Viewer class layouts import as' },
  { page: 'home', section: 'features', key: 'feature_3_text', marker: 'Split unit and group names, class-colored keybind modifiers' },
  { page: 'home', section: 'features', key: 'feature_3_text', marker: 'audio device switcher on the Ellesmere speaker icon live in the MagguuUI profile' },
  { page: 'home', section: 'features_heading', key: 'subtitle', marker: 'Everything you need — in one package' },
  { page: 'home', section: 'features_heading', key: 'subtitle', marker: 'A complete setup without forced external dependencies' },
  { page: 'home', section: 'addons', key: 'subtitle', marker: 'Profiles for 30+ of the most popular WoW addons' },
  { page: 'home', section: 'addons', key: 'subtitle', marker: 'of the most popular WoW addons' },
  { page: 'home', section: 'addons', key: 'subtitle', marker: 'Every external integration is optional' },
  { page: 'guide', section: 'intro', key: 'text', marker: 'Install ElvUI, install MagguuUI' },
  { page: 'guide', section: 'intro', key: 'text', marker: 'Getting started takes about five minutes' },
  { page: 'guide', section: 'intro', key: 'text', marker: 'Install the two included MagguuUI folders' },
  { page: 'guide', section: 'intro', key: 'text', marker: 'then open /mui and run the 4K setup. BigWigs, LittleWigs, and Northern Sky Raid Tools are optional.' },
  { page: 'guide', section: 'intro', key: 'text', marker: 'open /mui and run the 4K setup. BigWigs, LittleWigs' },
  { page: 'guide', section: 'steps', key: 'step_1_title', marker: '1. Install ElvUI' },
  { page: 'guide', section: 'steps', key: 'step_1_title', marker: '1. Install MagguuUI' },
  { page: 'guide', section: 'steps', key: 'step_1', marker: 'will not work without it' },
  { page: 'guide', section: 'steps', key: 'step_1', marker: 'MagguuUI` and `MagguuUI_Data' },
  { page: 'guide', section: 'steps', key: 'step_1', marker: 'from CurseForge, Wago, or WoWInterface.\n\nWithout EllesmereUI' },
  { page: 'guide', section: 'steps', key: 'step_2_title', marker: '2. Install MagguuUI' },
  { page: 'guide', section: 'steps', key: 'step_2_title', marker: '2. Add the addons you want' },
  { page: 'guide', section: 'steps', key: 'step_2', marker: 'Get MagguuUI from any of these sources:' },
  { page: 'guide', section: 'steps', key: 'step_2', marker: 'MagguuUI runs on its own. Install only the supported addons' },
  { page: 'guide', section: 'steps', key: 'step_2', marker: 'ElvUI is optional too' },
  { page: 'guide', section: 'steps', key: 'step_2', marker: 'WoW does not load nested TOC files' },
  { page: 'guide', section: 'steps', key: 'step_3_title', marker: '3. Log in and open the installer' },
  { page: 'guide', section: 'steps', key: 'step_3', marker: 'MagguuUI Installer' },
  { page: 'guide', section: 'steps', key: 'step_4_title', marker: '4. Click Install All' },
  { page: 'guide', section: 'steps', key: 'step_4', marker: 'MagguuUI applies the correct profile to every supported addon' },
  { page: 'guide', section: 'steps', key: 'step_4', marker: 'click **Install All**' },
  { page: 'guide', section: 'steps', key: 'step_3', marker: 'WowUp starter pack on the Strings page' },
  { page: 'guide', section: 'steps', key: 'step_3', marker: 'A WowUp starter pack on the Strings page' },
  { page: 'guide', section: 'steps', key: 'step_4', marker: 'copy the Edit Mode layout' },
  { page: 'guide', section: 'steps', key: 'step_4', marker: 'Run the **4K install**. MagguuUI imports the Ellesmere profile' },
  { page: 'guide', section: 'steps', key: 'step_4', marker: 'On the same tab you can apply **Magguu-Look**' },
  { page: 'guide', section: 'steps', key: 'step_4', marker: 'protected actions wait until combat ends' },
  { page: 'guide', section: 'steps', key: 'step_4', marker: 'Setup has no Edit Mode action' },
  { page: 'guide', section: 'steps', key: 'step_4', marker: 'Ellesmere QoL/Shifter defaults' },
  { page: 'guide', section: 'steps', key: 'step_5', marker: 'The Magguu accent-color toggle is no longer in the UI' },
  { page: 'guide', section: 'steps', key: 'step_4', marker: 'Run the **4K install**. MagguuUI imports the Ellesmere profile' },
  { page: 'guide', section: 'steps', key: 'step_5', marker: 'Load Profiles** popup' },
  { page: 'guide', section: 'steps', key: 'step_6', marker: 'shift+left-click opens Settings' },
  { page: 'guide', section: 'steps', key: 'step_6', marker: 'Row direction, icon borders, visibility and banner position are configurable' },
  { page: 'guide', section: 'steps', key: 'step_6', marker: '**Custom ElvUI tags**' },
  { page: 'guide', section: 'steps', key: 'step_6', marker: 'reloads immediately so the layouts stick' },
] as const

const LEGACY_FAQ_MARKERS = [
  { category: 'general', sortOrder: 0, marker: 'Instead of spending hours tweaking ElvUI' },
  { category: 'general', sortOrder: 0, marker: 'standalone World of Warcraft Retail installer' },
  { category: 'general', sortOrder: 1, marker: 'https://www.curseforge.com/wow/addons)' },
  { category: 'general', sortOrder: 2, marker: 'only ElvUI is required' },
  { category: 'general', sortOrder: 2, marker: 'Do I need every supported addon?' },
  { category: 'general', sortOrder: 2, marker: 'two folders included with every MagguuUI download' },
  { category: 'general', sortOrder: 4, marker: '11 localizations' },
  { category: 'general', sortOrder: 4, marker: 'WoW Retail 12.0' },
  { category: 'general', sortOrder: 4, marker: 'TOC interfaces 120000' },
  { category: 'installation', sortOrder: 0, marker: 'Install **ElvUI 15.12+**' },
  { category: 'installation', sortOrder: 0, marker: 'Five steps, takes about two minutes' },
  { category: 'installation', sortOrder: 0, marker: 'click **Install All**' },
  { category: 'installation', sortOrder: 0, marker: 'run the **4K install** on the Setup tab' },
  { category: 'installation', sortOrder: 1, marker: '/mui install' },
  { category: 'installation', sortOrder: 2, marker: 'Load Profiles** popup' },
  { category: 'installation', sortOrder: 2, marker: 're-run class layouts if you want' },
  { category: 'installation', sortOrder: 2, marker: 're-run class layouts if you want' },
  { category: 'installation', sortOrder: 0, marker: 'run the **4K install** on the Setup tab' },
  { category: 'installation', sortOrder: 3, marker: '**No.** ElvUI is the foundation' },
  { category: 'installation', sortOrder: 3, marker: 'without ElvUI' },
  { category: 'installation', sortOrder: 3, marker: 'hard dependency' },
  { category: 'installation', sortOrder: 1, marker: 'in this build' },
  { category: 'addons', sortOrder: 0, marker: 'BigWigs (or Northern Sky Raid Tools)' },
  { category: 'addons', sortOrder: 0, marker: '**Main integrations**' },
  { category: 'addons', sortOrder: 0, marker: 'Plater or Platynator' },
  { category: 'addons', sortOrder: 2, marker: 'Master toggle sits in **Settings → Tags**' },
  { category: 'addons', sortOrder: 2, marker: '[mui:ilvl]' },
  { category: 'addons', sortOrder: 3, marker: 'Install All** — full first-time setup' },
  { category: 'addons', sortOrder: 0, marker: 'profile and alerts, if NSRT is present' },
  { category: 'addons', sortOrder: 0, marker: 'then an immediate reload' },
  { category: 'addons', sortOrder: 0, marker: 'then an immediate reload' },
  { category: 'addons', sortOrder: 3, marker: 'from the **Profile** tab' },
  { category: 'addons', sortOrder: 1, marker: 'reloads immediately so Blizzard' },
  { category: 'addons', sortOrder: 1, marker: 'Addon code never writes Blizzard Edit Mode' },
  { category: 'addons', sortOrder: 1, marker: 'left tainted' },
  { category: 'addons', sortOrder: 1, marker: "Setup tab's copy action" },
  { category: 'addons', sortOrder: 3, marker: 'from the Setup tab' },
  { category: 'addons', sortOrder: 3, marker: '**4K install** — Ellesmere, then BigWigs if present' },
  { category: 'addons', sortOrder: 9, marker: 'Profile (import)' },
  { category: 'addons', sortOrder: 4, marker: 'WowUp Required / Optional' },
  { category: 'addons', sortOrder: 4, marker: 'They are recommendations, not requirements.' },
  { category: 'addons', sortOrder: 4, marker: 'WowUp](https://wowup.io/)' },
  { category: 'addons', sortOrder: 4, marker: 'MagguuUI no longer ships a WowUp package file' },
  { category: 'addons', sortOrder: 4, marker: 'The Strings page has two' },
  { category: 'addons', sortOrder: 1, marker: "Setup tab's copy action" },
  { category: 'addons', sortOrder: 1, marker: 'reloads immediately so Blizzard' },
  { category: 'addons', sortOrder: 3, marker: '**Magguu-Look** and a standalone **4K scale**' },
  { category: 'addons', sortOrder: 3, marker: 'Setup has no Edit Mode action' },
  { category: 'addons', sortOrder: 3, marker: 'Ellesmere QoL/Shifter defaults' },
  { category: 'addons', sortOrder: 7, marker: 'does not proxy EllesmereUI' },
  { category: 'addons', sortOrder: 8, marker: 'Nested TOC files' },
  { category: 'addons', sortOrder: 8, marker: 'LoadOnDemand MagguuUI_Data' },
  { category: 'addons', sortOrder: 9, marker: '/mui changelog' },
  { category: 'troubleshooting', sortOrder: 0, marker: 'protected setup waits until combat ends' },
  { category: 'troubleshooting', sortOrder: 2, marker: 'MagguuDB.toolsUnlocked' },
  { category: 'addons', sortOrder: 5, marker: 'Can MagguuUI auto-roll on loot for me?' },
  { category: 'addons', sortOrder: 5, marker: 'ColorModifiers' },
  { category: 'addons', sortOrder: 6, marker: 'What is MagguuUI Data' },
  { category: 'addons', sortOrder: 6, marker: 'audio output switcher' },
  { category: 'addons', sortOrder: 7, marker: 'What are the Dev Tools?' },
  { category: 'addons', sortOrder: 7, marker: 'AutoRoll' },
  { category: 'addons', sortOrder: 8, marker: 'MagguuUI Data' },
  { category: 'addons', sortOrder: 9, marker: 'Dev Tools tab' },
  { category: 'addons', sortOrder: 10, marker: 'Keystone List section in MagguuUI settings' },
  { category: 'addons', sortOrder: 10, marker: 'Keystone List' },
  { category: 'addons', sortOrder: 11, marker: '[mui:ilvl]' },
  { category: 'troubleshooting', sortOrder: 0, marker: 'ElvUI enabled and version 15.12' },
  { category: 'troubleshooting', sortOrder: 0, marker: 'At least one supported addon is enabled' },
  { category: 'troubleshooting', sortOrder: 0, marker: 'MagguuUI_Data is installed and enabled' },
  { category: 'troubleshooting', sortOrder: 0, marker: 'You confirmed Ellesmere and BigWigs popups' },
  { category: 'troubleshooting', sortOrder: 1, marker: 'Update Hint Mode' },
  { category: 'troubleshooting', sortOrder: 2, marker: 'Hard Reset' },
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
        key: 'site_description',
        value: 'Standalone World of Warcraft Retail UI installer',
        replacement: SITE_SETTINGS_DEFAULTS.site_description,
      },
      {
        key: 'meta_description',
        value: 'High-quality import strings for ElvUI, Plater, BigWigs, Details and more. Simply copy and paste into WoW.',
        replacement: SITE_SETTINGS_DEFAULTS.meta_description,
      },
      {
        key: 'meta_description',
        value: 'Standalone WoW Retail setup with no required external addons. Install MagguuUI, choose the integrations you want, and apply their profiles with one click.',
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
  } catch (err) {
    console.error('[Init] Current addon changelog seed failed:', err)
  }

  try {
    const addonResult = ensureAddonsSeeded()
    const retired = db.select().from(addons).all()
      .filter(row => (RETIRED_ADDON_SLUGS as readonly string[]).includes(row.slug)
        && (row.isAvailable || row.isVisible))
    let retiredCount = 0
    for (const row of retired) {
      db.update(addons)
        .set({ isAvailable: false, isVisible: false, updatedAt: new Date() })
        .where(eq(addons.id, row.id))
        .run()
      retiredCount++
    }
    if (retiredCount > 0) {
      console.log(`[Init] Hid ${retiredCount} retired addon catalogue entries`)
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
