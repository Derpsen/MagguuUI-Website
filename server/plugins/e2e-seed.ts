/**
 * Playwright-only fixture: with NUXT_E2E_SEED=true (playwright.config.ts) and
 * outside production, make sure one visible WowUp pack exists so the lazy
 * WowUp string test runs in CI. Never runs in the Docker image.
 */
import { eq } from 'drizzle-orm'
import { db, sqlite } from '~/server/database'
import { changelogs, wowupStrings } from '~/server/database/schema'

const E2E_WOWUP_PACK = 'E2E Test Pack'

export default defineNitroPlugin(() => {
  if (process.env.NUXT_E2E_SEED !== 'true' || process.env.NODE_ENV === 'production') return
  seedWowupPack()
  seedAddon()
  seedChangelog()
})

function seedWowupPack() {
  try {
    const exists = db.select({ id: wowupStrings.id }).from(wowupStrings).where(eq(wowupStrings.name, E2E_WOWUP_PACK)).get()
    if (exists) return
    const string = Buffer.from(JSON.stringify({ addons: [{ name: 'Details' }, { name: 'BigWigs' }] })).toString('base64')
    db.insert(wowupStrings).values({ name: E2E_WOWUP_PACK, string, description: 'Playwright fixture', sortOrder: 999, isVisible: true }).run()
    console.info('[E2E] Seeded WowUp test pack')
  } catch (err) {
    console.error('[E2E] WowUp seed failed:', err)
  }
}

// Community preset form (tests/community-presets.spec.ts) needs one visible addon to choose.
function seedAddon() {
  try {
    sqlite.prepare("INSERT OR IGNORE INTO addons (slug, name, category, sort_order, is_visible, is_available, source) VALUES ('e2e-test-addon', 'E2E Test Addon', 'optional', 999, 1, 1, 'manual')").run()
  } catch (err) {
    console.error('[E2E] Addon seed failed:', err)
  }
}

// Changelog filter / "since my version" E2E (tests/changelog-filter.spec.ts).
// Versions sit far below the real ones (0.9.x) so they never collide.
const E2E_CHANGELOG = [
  { version: 'v0.9.3', content: '- E2E third release mentions Zebrafish.', at: 3 },
  { version: 'v0.9.2', content: '- E2E second release.', at: 2 },
  { version: 'v0.9.1', content: '- E2E first release mentions Zebrafish.', at: 1 },
  // Rows that must never reach a feed (tests/changelog-filter.spec.ts asserts it).
  { version: 'Unreleased', content: '- E2E unreleased sentinel UNRELEASEDMARK.', at: 4 },
  { version: 'v0.9.4', content: '- E2E draft sentinel DRAFTMARK.', at: 5, published: false },
]

function seedChangelog() {
  try {
    for (const row of E2E_CHANGELOG) {
      const exists = db.select({ id: changelogs.id }).from(changelogs).where(eq(changelogs.version, row.version)).get()
      if (exists) continue
      db.insert(changelogs).values({
        version: row.version,
        content: row.content,
        contentEn: row.content,
        isPublished: row.published ?? true,
        publishedAt: new Date(Date.UTC(2020, 0, row.at)),
      }).run()
    }
  } catch (err) {
    console.error('[E2E] Changelog seed failed:', err)
  }
}
