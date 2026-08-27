/**
 * Database Seed Script
 *
 * Run with: npm run db:seed
 * Creates initial admin user and default site content.
 */

import { drizzle } from 'drizzle-orm/better-sqlite3'
import { eq } from 'drizzle-orm'
import Database from 'better-sqlite3'
import { join } from 'path'
import { mkdirSync } from 'fs'
import bcrypt from 'bcrypt'
import * as schema from './schema'
import { initializeDatabase } from './bootstrap'
import { DEFAULT_FAQS, DEFAULT_GUIDE_CONTENT, DEFAULT_HOME_CONTENT, DEFAULT_SITE_CONTENT } from './defaultContent'
import { SITE_SETTINGS_DEFAULTS } from '../../utils/siteSettingsDefaults'

const DB_PATH = join(process.cwd(), 'data', 'magguuui.db')
mkdirSync(join(process.cwd(), 'data'), { recursive: true })

const sqlite = new Database(DB_PATH)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')
initializeDatabase(sqlite)

const db = drizzle(sqlite, { schema })

async function seed() {
  console.log('Seeding database...\n')

  const shouldSyncSeededContent = process.env.NUXT_SYNC_SEEDED_CONTENT === 'true'

  const adminPassword = process.env.NUXT_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'changeme'
  if (adminPassword === 'changeme') {
    console.warn('  ! Using default seed admin password. Set NUXT_ADMIN_PASSWORD before seeding shared environments.')
  }
  const passwordHash = await bcrypt.hash(adminPassword, 12)

  db.insert(schema.users).values({
    username: 'admin',
    passwordHash,
    role: 'admin',
  }).onConflictDoNothing().run()

  console.log('  - Admin user ensured (username: admin)')

  for (const content of DEFAULT_SITE_CONTENT) {
    db.insert(schema.siteContent).values(content).onConflictDoNothing().run()
  }

  console.log(`  - ${DEFAULT_SITE_CONTENT.length} default content entries ensured`)

  if (shouldSyncSeededContent) {
    const syncPage = (page: 'home' | 'guide', entries: readonly typeof DEFAULT_SITE_CONTENT[number][]) => {
      const existingRows = db.select().from(schema.siteContent)
        .where(eq(schema.siteContent.page, page))
        .all()
      const byKey = new Map(existingRows.map((item) => [`${item.section}:${item.key}:${item.locale}`, item]))
      let inserted = 0
      let updated = 0
      for (const entry of entries) {
        const key = `${entry.section}:${entry.key}:${entry.locale}`
        const existing = byKey.get(key)
        if (!existing) {
          db.insert(schema.siteContent).values(entry).run()
          inserted++
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
          updated++
        }
      }
      console.log(`  - ${page} synced (${inserted} inserted, ${updated} updated)`)
    }

    syncPage('home', DEFAULT_HOME_CONTENT)
    syncPage('guide', DEFAULT_GUIDE_CONTENT)
  } else {
    console.log('  - Home/guide sync skipped (set NUXT_SYNC_SEEDED_CONTENT=true to force code-driven sync)')
  }

  const existingFaqs = db.select().from(schema.faqs).all()
  const faqByKey = new Map(existingFaqs.map((faq) => [`${faq.category}:${faq.sortOrder}`, faq]))

  let faqInserted = 0
  let faqUpdated = 0
  for (const faq of DEFAULT_FAQS) {
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

    if (shouldSyncSeededContent && (
      existing.question !== faq.question
      || existing.answer !== faq.answer
      || existing.isVisible !== true
    )) {
      db.update(schema.faqs).set({
        question: faq.question,
        answer: faq.answer,
        isVisible: true,
        updatedAt: new Date(),
      }).where(eq(schema.faqs.id, existing.id)).run()
      faqUpdated++
    }
  }

  if (shouldSyncSeededContent) {
    console.log(`  - FAQ synced (${faqInserted} inserted, ${faqUpdated} updated)`)
  } else {
    console.log(`  - FAQ ensured (${faqInserted} inserted, ${faqUpdated} updated while sync disabled)`)
  }

  const defaultSettings = Object.entries(SITE_SETTINGS_DEFAULTS).map(([key, value]) => ({ key, value }))

  for (const setting of defaultSettings) {
    db.insert(schema.settings).values(setting).onConflictDoNothing().run()
  }

  console.log(`  - ${defaultSettings.length} settings ensured`)

  if (shouldSyncSeededContent) {
    const publicCopyKeys = ['site_description', 'meta_description'] as const
    let settingsUpdated = 0
    for (const key of publicCopyKeys) {
      db.update(schema.settings)
        .set({ value: SITE_SETTINGS_DEFAULTS[key], updatedAt: new Date() })
        .where(eq(schema.settings.key, key))
        .run()
      settingsUpdated++
    }
    console.log(`  - ${settingsUpdated} public site settings aligned`)
  }

  console.log('\nSeed complete!')
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
