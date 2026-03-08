/**
 * Database Seed Script
 *
 * Run with: npm run db:seed
 * Creates initial admin user and default site content.
 */

import { drizzle } from 'drizzle-orm/better-sqlite3'
import { and, eq } from 'drizzle-orm'
import Database from 'better-sqlite3'
import { join } from 'path'
import { mkdirSync } from 'fs'
import bcrypt from 'bcrypt'
import * as schema from './schema'

const DB_PATH = join(process.cwd(), 'data', 'magguuui.db')
mkdirSync(join(process.cwd(), 'data'), { recursive: true })

const sqlite = new Database(DB_PATH)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

const db = drizzle(sqlite, { schema })

const defaultGuideContent = [
  { page: 'guide', section: 'intro', key: 'title', value: 'Installation Guide', type: 'text', sortOrder: 0, locale: 'en' },
  { page: 'guide', section: 'intro', key: 'text', value: 'Set up MagguuUI once on your main character, then let alts load the same profiles automatically.', type: 'text', sortOrder: 1, locale: 'en' },

  { page: 'guide', section: 'steps', key: 'step_1_title', value: 'Install ElvUI', type: 'text', sortOrder: 10, locale: 'en' },
  { page: 'guide', section: 'steps', key: 'step_1', value: 'Download and install [ElvUI](https://www.tukui.org/download.php?ui=elvui). MagguuUI requires ElvUI and will not run without it.', type: 'markdown', sortOrder: 11, locale: 'en' },

  { page: 'guide', section: 'steps', key: 'step_2_title', value: 'Install MagguuUI and your addon pack', type: 'text', sortOrder: 20, locale: 'en' },
  { page: 'guide', section: 'steps', key: 'step_2', value: 'Install **MagguuUI** from CurseForge, Wago, or WowInterface. If you want the full package, use the **WowUp Required** and **Optional** import strings from the website or in-game settings.', type: 'markdown', sortOrder: 21, locale: 'en' },

  { page: 'guide', section: 'steps', key: 'step_3_title', value: 'Log in on your main character', type: 'text', sortOrder: 30, locale: 'en' },
  { page: 'guide', section: 'steps', key: 'step_3', value: 'Enter the game on the character you want to set up first. The installer opens automatically on first login. If you closed it, type `/mui install`.', type: 'markdown', sortOrder: 31, locale: 'en' },

  { page: 'guide', section: 'steps', key: 'step_4_title', value: 'Run Install All once', type: 'text', sortOrder: 40, locale: 'en' },
  { page: 'guide', section: 'steps', key: 'step_4', value: 'Click **Install All** on your first setup. MagguuUI applies supported addon profiles in the correct order, skips missing optional addons, and then asks for a reload.', type: 'markdown', sortOrder: 41, locale: 'en' },

  { page: 'guide', section: 'steps', key: 'step_5_title', value: 'Set up alts with Load Profiles', type: 'text', sortOrder: 50, locale: 'en' },
  { page: 'guide', section: 'steps', key: 'step_5', value: 'After one successful **Install All** on the account, new characters get the **Load Profiles** popup instead of the full first-install flow. You can also run `/mui load` manually.', type: 'markdown', sortOrder: 51, locale: 'en' },

  { page: 'guide', section: 'steps', key: 'step_6_title', value: 'Use settings, changelog, and minimap access', type: 'text', sortOrder: 60, locale: 'en' },
  { page: 'guide', section: 'steps', key: 'step_6', value: 'Open `/mui settings` to manage **Update Hint Mode**, WowUp strings, and profile status. Use `/mui changelog` anytime, or the minimap button for quick access.', type: 'markdown', sortOrder: 61, locale: 'en' },
]

async function seed() {
  console.log('🌱 Seeding database...\n')

  // ─── Admin User ────────────────────────────────
  const adminPassword = process.env.ADMIN_PASSWORD || 'changeme'
  const passwordHash = await bcrypt.hash(adminPassword, 12)

  db.insert(schema.users).values({
    username: 'admin',
    passwordHash,
    role: 'admin',
  }).onConflictDoNothing().run()

  console.log('  ✓ Admin user created (username: admin)')

  // ─── Default Site Content ──────────────────────
  const defaultContent = [
    // Hero Section
    { page: 'home', section: 'hero', key: 'title', value: 'MagguuUI', type: 'text', sortOrder: 0, locale: 'en' },
    { page: 'home', section: 'hero', key: 'subtitle', value: 'World of Warcraft UI — Ready to Play', type: 'text', sortOrder: 1, locale: 'en' },
    { page: 'home', section: 'hero', key: 'description', value: 'Pre-configured profiles for ElvUI, Plater, BigWigs, Details and more. One click — done.', type: 'text', sortOrder: 2, locale: 'en' },

    // Features
    { page: 'home', section: 'features', key: 'feature_1_title', value: 'One-Click Setup', type: 'text', sortOrder: 0, locale: 'en' },
    { page: 'home', section: 'features', key: 'feature_1_text', value: 'Import all profiles with one click. No manual configuration needed.', type: 'text', sortOrder: 1, locale: 'en' },
    { page: 'home', section: 'features', key: 'feature_1_icon', value: 'i-heroicons-rocket-launch', type: 'text', sortOrder: 2, locale: 'en' },

    { page: 'home', section: 'features', key: 'feature_2_title', value: 'Regularly Updated', type: 'text', sortOrder: 3, locale: 'en' },
    { page: 'home', section: 'features', key: 'feature_2_text', value: 'Profiles are reworked and optimized for every patch.', type: 'text', sortOrder: 4, locale: 'en' },
    { page: 'home', section: 'features', key: 'feature_2_icon', value: 'i-heroicons-arrow-path', type: 'text', sortOrder: 5, locale: 'en' },

    { page: 'home', section: 'features', key: 'feature_3_title', value: 'Complete Package', type: 'text', sortOrder: 6, locale: 'en' },
    { page: 'home', section: 'features', key: 'feature_3_text', value: 'ElvUI, Plater, BigWigs, Details, WeakAuras and more — all perfectly tuned.', type: 'text', sortOrder: 7, locale: 'en' },
    { page: 'home', section: 'features', key: 'feature_3_icon', value: 'i-heroicons-puzzle-piece', type: 'text', sortOrder: 8, locale: 'en' },

    ...defaultGuideContent,
  ]

  for (const content of defaultContent) {
    db.insert(schema.siteContent).values(content).onConflictDoNothing().run()
  }

  console.log(`  ✓ ${defaultContent.length} content entries created`)

  const existingGuideContent = db.select().from(schema.siteContent)
    .where(and(eq(schema.siteContent.page, 'guide'), eq(schema.siteContent.locale, 'en')))
    .all()
  const guideByKey = new Map(existingGuideContent.map((item) => [`${item.section}:${item.key}:${item.locale}`, item]))

  let guideInserted = 0
  let guideUpdated = 0
  for (const entry of defaultGuideContent) {
    const key = `${entry.section}:${entry.key}:${entry.locale}`
    const existing = guideByKey.get(key)

    if (!existing) {
      db.insert(schema.siteContent).values(entry).run()
      guideInserted++
      continue
    }

    if (existing.value !== entry.value
      || existing.sortOrder !== entry.sortOrder
      || existing.type !== entry.type) {
      db.update(schema.siteContent).set({
        value: entry.value,
        type: entry.type,
        sortOrder: entry.sortOrder,
        updatedAt: new Date(),
      }).where(eq(schema.siteContent.id, existing.id)).run()
      guideUpdated++
    }
  }

  console.log(`  ✓ Guide synced (${guideInserted} inserted, ${guideUpdated} updated)`)

  // ─── Default FAQs ───────────────────────────────
  const defaultFaqs = [
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

  const existingFaqs = db.select().from(schema.faqs).all()
  const faqByKey = new Map(existingFaqs.map((faq) => [`${faq.category}:${faq.sortOrder}`, faq]))

  let faqInserted = 0
  let faqUpdated = 0
  for (const faq of defaultFaqs) {
    const key = `${faq.category}:${faq.sortOrder}`
    const existing = faqByKey.get(key)

    if (!existing) {
      db.insert(schema.faqs).values({
        category: faq.category,
        question: faq.question,
        answer: faq.answer,
        sortOrder: faq.sortOrder,
        isVisible: true,
      }).run()
      faqInserted++
      continue
    }

    if (existing.question !== faq.question
      || existing.answer !== faq.answer
      || existing.isVisible !== true) {
      db.update(schema.faqs).set({
        question: faq.question,
        answer: faq.answer,
        isVisible: true,
        updatedAt: new Date(),
      }).where(eq(schema.faqs.id, existing.id)).run()
      faqUpdated++
    }
  }

  console.log(`  ✓ FAQ synced (${faqInserted} inserted, ${faqUpdated} updated)`)

  // ─── Default Settings ──────────────────────────
  const defaultSettings = [
    { key: 'site_title', value: 'MagguuUI' },
    { key: 'site_description', value: 'World of Warcraft UI Configuration' },
    { key: 'github_repo', value: 'Derpsen/MagguuUI' },
    { key: 'auto_sync', value: 'true' },
  ]

  for (const setting of defaultSettings) {
    db.insert(schema.settings).values(setting).onConflictDoNothing().run()
  }

  console.log(`  ✓ ${defaultSettings.length} settings created`)

  console.log('\n✅ Seed complete!')
  process.exit(0)
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
