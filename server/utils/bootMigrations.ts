/**
 * Idempotent schema/settings cleanup run on every website boot.
 * Index list and imprint-key deletion stay byte-for-byte as in init.ts
 * (including passkey/webauthn index names — do not retune those here).
 */
import type { WebsiteBootSqlite } from './websiteBootTypes'

/** Same 12 statements and order as the former init.ts index ensure. */
export const BOOT_INDEX_STATEMENTS = [
  `CREATE INDEX IF NOT EXISTS idx_activity_log_entity_type_created_at ON activity_log (entity_type, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_activity_log_user_id_created_at ON activity_log (user_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_expires_at ON webauthn_challenges (expires_at)`,
  `CREATE INDEX IF NOT EXISTS idx_copy_events_string_type_string_id ON copy_events (string_type, string_id)`,
  `CREATE INDEX IF NOT EXISTS idx_copy_events_created_at ON copy_events (created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_page_views_path_created_at ON page_views (path, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views (created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_passkeys_user_id ON passkeys (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_profiles_visible_sort ON profiles (is_visible, sort_order)`,
  `CREATE INDEX IF NOT EXISTS idx_wowup_strings_visible_sort ON wowup_strings (is_visible, sort_order)`,
  `CREATE INDEX IF NOT EXISTS idx_character_layouts_visible_sort ON character_layouts (is_visible, sort_order)`,
  `CREATE INDEX IF NOT EXISTS idx_faqs_visible_sort ON faqs (is_visible, sort_order)`,
] as const

export function ensureBootIndexes(sqlite: WebsiteBootSqlite): void {
  try {
    for (const stmt of BOOT_INDEX_STATEMENTS) sqlite.exec(stmt)
    console.log(`[Init] Ensured ${BOOT_INDEX_STATEMENTS.length} performance indexes`)
  }
  catch (err) {
    console.error('[Init] Index ensure failed:', err)
  }
}

/** Legal notice no longer shows a name/address: drop the retired imprint_* keys. */
export function removeRetiredImprintSettings(sqlite: WebsiteBootSqlite): void {
  try {
    const removed = sqlite.prepare("DELETE FROM settings WHERE key IN ('imprint_name', 'imprint_street', 'imprint_city', 'imprint_country')").run()
    if (removed.changes > 0) console.log(`[Init] Removed ${removed.changes} retired imprint settings`)
  }
  catch (err) {
    console.error('[Init] Imprint settings cleanup failed:', err)
  }
}
