/**
 * Startup Plugin — Admin User Init
 *
 * Runs on every server start:
 * 1. Creates admin user if none exists (first install)
 * 2. Force-resets password if NUXT_FORCE_PASSWORD_RESET=true
 * 3. Seeds default site content if empty
 */

import bcrypt from 'bcrypt'
import { and, eq, count } from 'drizzle-orm'
import { db } from '~/server/database'
import { users, siteContent, faqs } from '~/server/database/schema'

const DEFAULT_GUIDE_CONTENT = [
  { page: 'guide', section: 'intro', key: 'title', value: 'Installation Guide', locale: 'en', type: 'text', sortOrder: 0 },
  { page: 'guide', section: 'intro', key: 'text', value: 'Set up MagguuUI once on your main character, then let alts load the same profiles automatically.', locale: 'en', type: 'text', sortOrder: 1 },

  { page: 'guide', section: 'steps', key: 'step_1_title', value: 'Install ElvUI', locale: 'en', type: 'text', sortOrder: 10 },
  { page: 'guide', section: 'steps', key: 'step_1', value: 'Download and install [ElvUI](https://www.tukui.org/download.php?ui=elvui). MagguuUI requires ElvUI and will not run without it.', locale: 'en', type: 'markdown', sortOrder: 11 },

  { page: 'guide', section: 'steps', key: 'step_2_title', value: 'Install MagguuUI and your addon pack', locale: 'en', type: 'text', sortOrder: 20 },
  { page: 'guide', section: 'steps', key: 'step_2', value: 'Install **MagguuUI** from CurseForge, Wago, or WowInterface. If you want the full package, use the **WowUp Required** and **Optional** import strings from the website or in-game settings.', locale: 'en', type: 'markdown', sortOrder: 21 },

  { page: 'guide', section: 'steps', key: 'step_3_title', value: 'Log in on your main character', locale: 'en', type: 'text', sortOrder: 30 },
  { page: 'guide', section: 'steps', key: 'step_3', value: 'Enter the game on the character you want to set up first. The installer opens automatically on first login. If you closed it, type `/mui install`.', locale: 'en', type: 'markdown', sortOrder: 31 },

  { page: 'guide', section: 'steps', key: 'step_4_title', value: 'Run Install All once', locale: 'en', type: 'text', sortOrder: 40 },
  { page: 'guide', section: 'steps', key: 'step_4', value: 'Click **Install All** on your first setup. MagguuUI applies supported addon profiles in the correct order, skips missing optional addons, and then asks for a reload.', locale: 'en', type: 'markdown', sortOrder: 41 },

  { page: 'guide', section: 'steps', key: 'step_5_title', value: 'Set up alts with Load Profiles', locale: 'en', type: 'text', sortOrder: 50 },
  { page: 'guide', section: 'steps', key: 'step_5', value: 'After one successful **Install All** on the account, new characters get the **Load Profiles** popup instead of the full first-install flow. You can also run `/mui load` manually.', locale: 'en', type: 'markdown', sortOrder: 51 },

  { page: 'guide', section: 'steps', key: 'step_6_title', value: 'Use settings, changelog, and minimap access', locale: 'en', type: 'text', sortOrder: 60 },
  { page: 'guide', section: 'steps', key: 'step_6', value: 'Open `/mui settings` to manage **Update Hint Mode**, WowUp strings, and profile status. Use `/mui changelog` anytime, or the minimap button for quick access.', locale: 'en', type: 'markdown', sortOrder: 61 },
]

const DEFAULT_FAQS = [
  // General
  {
    category: 'general',
    question: 'What is MagguuUI?',
    answer: 'MagguuUI is a guided WoW UI setup addon. It applies ready-to-use profiles for ElvUI and supported addons, plus class-specific layouts, so your UI is ready in minutes.',
    sortOrder: 0,
  },
  {
    category: 'general',
    question: 'Do I need all supported addons?',
    answer: 'No. Only ElvUI is required. All other supported addons are optional and are skipped automatically if they are not installed.',
    sortOrder: 1,
  },
  {
    category: 'general',
    question: 'Will MagguuUI replace my existing setup?',
    answer: 'MagguuUI uses a separate profile named "MagguuUI" per addon. Your other profiles stay available, and overwriting an existing MagguuUI profile requires confirmation.',
    sortOrder: 2,
  },
  {
    category: 'general',
    question: 'How are updates shown in-game?',
    answer: 'Update hints can be configured as Chat Message, Popup, or Disabled. When enabled, MagguuUI shows a hint and opens the changelog in settings.',
    sortOrder: 3,
  },

  // Installation
  {
    category: 'installation',
    question: 'What is the recommended first setup?',
    answer: 'Install ElvUI and MagguuUI, log in, open the installer, and run Install All once on your main character. Then reload when prompted.',
    sortOrder: 0,
  },
  {
    category: 'installation',
    question: 'What happens on alts/new characters?',
    answer: 'After one successful Install All on the account, alts get the Load Profiles popup. This applies existing MagguuUI profiles without repeating full first-install steps.',
    sortOrder: 1,
  },
  {
    category: 'installation',
    question: 'How do I open installer and settings manually?',
    answer: 'Use /mui install to open the installer and /mui settings to open MagguuUI settings. You can also use /mui changelog and /mui status.',
    sortOrder: 2,
  },
  {
    category: 'installation',
    question: 'Can I use MagguuUI without ElvUI?',
    answer: 'No. ElvUI is required. MagguuUI depends on ElvUI as the base framework for profile setup and settings integration.',
    sortOrder: 3,
  },

  // Addons & Profiles
  {
    category: 'addons',
    question: 'Which profiles are applied by Install All?',
    answer: 'Install All applies MagguuUI profiles in the correct order for ElvUI, BetterCooldownManager, Blizzard EditMode, Details, Plater, and optional supported addons when present.',
    sortOrder: 0,
  },
  {
    category: 'addons',
    question: 'What is the difference between Install All and Load Profiles?',
    answer: 'Install All is the full initial setup flow. Load Profiles checks and activates existing MagguuUI profiles (mainly for alts or after addon/profile changes).',
    sortOrder: 1,
  },
  {
    category: 'addons',
    question: 'How do class layouts work?',
    answer: 'Class layouts are preconfigured per class/spec and are selected automatically where supported. You can reapply them anytime from MagguuUI.',
    sortOrder: 2,
  },
  {
    category: 'addons',
    question: 'How do WowUp Required and Optional lists work?',
    answer: 'Required contains the core addon set for MagguuUI. Optional contains extra integrations and quality-of-life addons. You can copy both import strings from the WowUp tab.',
    sortOrder: 3,
  },

  // Troubleshooting
  {
    category: 'troubleshooting',
    question: 'I updated but got no update hint in chat/popup',
    answer: 'Check Update Hint Mode in settings. If set to Disabled, no hint is shown. Also, once a version is acknowledged with "Got it", that version will not notify again.',
    sortOrder: 0,
  },
  {
    category: 'troubleshooting',
    question: 'Installer or Load Profiles popup did not appear',
    answer: 'Use /mui install or /mui load manually. If you are in combat, try again out of combat. Also verify ElvUI and MagguuUI are enabled.',
    sortOrder: 1,
  },
  {
    category: 'troubleshooting',
    question: 'How can I troubleshoot conflicts quickly?',
    answer: 'Use /mui debug to temporarily disable non-essential addons, then retest. Use /mui report to create a copyable diagnostic report for support.',
    sortOrder: 2,
  },
  {
    category: 'troubleshooting',
    question: 'How do I reset and reinstall profiles?',
    answer: 'Open /mui settings and use Reset All Profiles, or run /mui install and re-apply the setup. Finish with a reload when prompted.',
    sortOrder: 3,
  },
]

export default defineNitroPlugin(async () => {
  const config = useRuntimeConfig()

  // ─── 1. Admin User ────────────────────────────────
  try {
    const adminCount = db.select({ count: count() }).from(users).get()
    const hasUsers = adminCount && adminCount.count > 0

    if (!hasUsers) {
      // First install — create admin user
      const password = config.adminPassword || 'changeme'
      const hash = await bcrypt.hash(password, 12)

      db.insert(users).values({
        username: 'admin',
        passwordHash: hash,
        role: 'admin',
      }).run()

      console.log('[Init] ✓ Admin user created (username: admin)')
      if (password === 'changeme') {
        console.log('[Init] ⚠ Using default password "changeme" — change it in the admin panel!')
      }
    } else {
      // Check for force password reset
      const forceReset = process.env.NUXT_FORCE_PASSWORD_RESET === 'true'
      if (forceReset && config.adminPassword) {
        const hash = await bcrypt.hash(config.adminPassword, 12)
        db.update(users)
          .set({ passwordHash: hash, updatedAt: new Date() })
          .where(eq(users.username, 'admin'))
          .run()
        console.log('[Init] ✓ Admin password force-reset — set NUXT_FORCE_PASSWORD_RESET back to false!')
      } else {
        console.log('[Init] ✓ Admin user exists')
      }
    }
  } catch (err) {
    console.error('[Init] ✗ Admin user setup failed:', err)
  }

  // ─── 2. Default Site Content ──────────────────────
  try {
    const contentCount = db.select({ count: count() }).from(siteContent).get()
    if (!contentCount || contentCount.count === 0) {
      const defaults = [
        { page: 'home', section: 'hero', key: 'title', value: 'MagguuUI', locale: 'en' },
        { page: 'home', section: 'hero', key: 'subtitle', value: 'World of Warcraft UI — Ready to Play', locale: 'en' },
        { page: 'home', section: 'hero', key: 'description', value: 'Pre-configured profiles for ElvUI, Plater, BigWigs, Details and more. One click — done.', locale: 'en' },
        { page: 'home', section: 'features', key: 'feature_1_title', value: 'One-Click Setup', locale: 'en' },
        { page: 'home', section: 'features', key: 'feature_1_text', value: 'Import all profiles with one click. No manual configuration needed.', locale: 'en' },
        { page: 'home', section: 'features', key: 'feature_1_icon', value: 'i-heroicons-cursor-arrow-rays', locale: 'en' },
        { page: 'home', section: 'features', key: 'feature_2_title', value: 'Regularly Updated', locale: 'en' },
        { page: 'home', section: 'features', key: 'feature_2_text', value: 'All profiles are regularly updated and adapted for new patches.', locale: 'en' },
        { page: 'home', section: 'features', key: 'feature_2_icon', value: 'i-heroicons-arrow-path', locale: 'en' },
        { page: 'home', section: 'features', key: 'feature_3_title', value: 'Complete Package', locale: 'en' },
        { page: 'home', section: 'features', key: 'feature_3_text', value: 'ElvUI, Plater, BigWigs, Details, WeakAuras — all perfectly tuned.', locale: 'en' },
        { page: 'home', section: 'features', key: 'feature_3_icon', value: 'i-heroicons-cube-transparent', locale: 'en' },
        ...DEFAULT_GUIDE_CONTENT,
      ]

      for (const item of defaults) {
        db.insert(siteContent).values(item).run()
      }
      console.log('[Init] ✓ Default site content seeded')
    }

    const existingGuideContent = db.select().from(siteContent)
      .where(and(eq(siteContent.page, 'guide'), eq(siteContent.locale, 'en')))
      .all()
    const guideByKey = new Map(existingGuideContent.map((item) => [`${item.section}:${item.key}:${item.locale}`, item]))

    let guideInserted = 0
    let guideUpdated = 0

    for (const entry of DEFAULT_GUIDE_CONTENT) {
      const key = `${entry.section}:${entry.key}:${entry.locale}`
      const existing = guideByKey.get(key)

      if (!existing) {
        db.insert(siteContent).values(entry).run()
        guideInserted++
        continue
      }

      if (existing.value !== entry.value
        || existing.sortOrder !== entry.sortOrder
        || existing.type !== entry.type) {
        db.update(siteContent)
          .set({
            value: entry.value,
            type: entry.type,
            sortOrder: entry.sortOrder,
            updatedAt: new Date(),
          })
          .where(eq(siteContent.id, existing.id))
          .run()
        guideUpdated++
      }
    }

    if (guideInserted > 0 || guideUpdated > 0) {
      console.log(`[Init] ✓ Guide synced (inserted: ${guideInserted}, updated: ${guideUpdated})`)
    } else {
      console.log('[Init] ✓ Guide already up to date')
    }
  } catch (err) {
    console.error('[Init] ✗ Site content seeding failed:', err)
  }

  // ─── 3. Default FAQ Entries ──────────────────────
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

      if (existing.question !== faq.question
        || existing.answer !== faq.answer
        || existing.isVisible !== true) {
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
      console.log(`[Init] ✓ ${DEFAULT_FAQS.length} default FAQ entries seeded`)
    } else if (inserted > 0 || updated > 0) {
      console.log(`[Init] ✓ FAQ synced (inserted: ${inserted}, updated: ${updated})`)
    } else {
      console.log('[Init] ✓ FAQ already up to date')
    }
  } catch (err) {
    console.error('[Init] ✗ FAQ sync failed:', err)
  }

  console.log('[Init] ✓ Startup complete')
})
