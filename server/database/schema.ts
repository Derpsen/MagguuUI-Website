/**
 * MagguuUI v3 — Database Schema
 *
 * All tables for the application defined with Drizzle ORM.
 * Database: SQLite (WAL mode)
 */

import { sqliteTable, text, integer, uniqueIndex, index, primaryKey } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// ─── Helper: Timestamps ────────────────────────────

const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
}

// ─── Addon Profiles ────────────────────────────────
// Import strings for EllesmereUI, BigWigs, Northern Sky Raid Tools, etc.

export const profiles = sqliteTable('profiles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  addon: text('addon').notNull(),
  profile: text('profile').notNull(),
  string: text('string').notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').notNull().default(0),
  isVisible: integer('is_visible', { mode: 'boolean' }).notNull().default(true),
  customFields: text('custom_fields'), // JSON: { fieldName: value }
  ...timestamps,
}, (table) => ({
  addonProfileIdx: uniqueIndex('idx_profiles_addon_profile').on(table.addon, table.profile),
  visibleSortIdx: index('idx_profiles_visible_sort').on(table.isVisible, table.sortOrder),
}))

// ─── WowUp Import Strings ─────────────────────────
// Starter (legacy storage key: Required) + Optional addon package strings

export const wowupStrings = sqliteTable('wowup_strings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  string: text('string').notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').notNull().default(0),
  isVisible: integer('is_visible', { mode: 'boolean' }).notNull().default(true),
  customFields: text('custom_fields'), // JSON
  ...timestamps,
}, (table) => ({
  visibleSortIdx: index('idx_wowup_strings_visible_sort').on(table.isVisible, table.sortOrder),
}))

// ─── Character Layouts ─────────────────────────────
// UI layouts per class/spec with screenshots

export const characterLayouts = sqliteTable('character_layouts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  className: text('class_name'),
  spec: text('spec'),
  description: text('description'),
  screenshot: text('screenshot'),
  importString: text('import_string'),
  sortOrder: integer('sort_order').notNull().default(0),
  isVisible: integer('is_visible', { mode: 'boolean' }).notNull().default(true),
  customFields: text('custom_fields'), // JSON
  ...timestamps,
}, (table) => ({
  classSpecIdx: index('idx_character_layouts_class_spec').on(table.className, table.spec),
  visibleSortIdx: index('idx_character_layouts_visible_sort').on(table.isVisible, table.sortOrder),
}))

// ─── Field Definitions ─────────────────────────────
// Dynamic field schema per entity type

export const fieldDefinitions = sqliteTable('field_definitions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entityType: text('entity_type').notNull(), // 'profiles' | 'wowup' | 'layouts'
  fieldName: text('field_name').notNull(),
  fieldLabel: text('field_label').notNull(),
  fieldType: text('field_type').notNull().default('text'), // text | textarea | number | toggle | select
  fieldOptions: text('field_options'), // JSON array for select options
  isRequired: integer('is_required', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0),
  ...timestamps,
}, (table) => ({
  entityFieldIdx: uniqueIndex('idx_field_defs_entity_field').on(table.entityType, table.fieldName),
}))

// ─── Changelogs ────────────────────────────────────
// Version history entries (Markdown content)

export const changelogs = sqliteTable('changelogs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  version: text('version').notNull(),
  content: text('content').notNull(),
  contentEn: text('content_en'),
  isPublished: integer('is_published', { mode: 'boolean' }).notNull().default(false),
  publishedAt: integer('published_at', { mode: 'timestamp' }),
  ...timestamps,
}, (table) => ({
  publishedIdx: index('idx_changelogs_published').on(table.isPublished, table.publishedAt),
}))

// ─── Site Content ──────────────────────────────────
// Editable website text blocks (key-value per page/section)

export const siteContent = sqliteTable('site_content', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  page: text('page').notNull(),
  section: text('section').notNull(),
  key: text('key').notNull(),
  value: text('value').notNull(),
  locale: text('locale').notNull().default('en'),
  type: text('type').notNull().default('text'),
  sortOrder: integer('sort_order').notNull().default(0),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => ({
  pageSectionKeyLocaleIdx: uniqueIndex('idx_content_page_section_key_locale').on(table.page, table.section, table.key, table.locale),
}))

// ─── FAQs ─────────────────────────────────────────
// Frequently asked questions grouped by category

export const faqs = sqliteTable('faqs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  category: text('category').notNull(), // 'general' | 'installation' | 'addons' | 'troubleshooting'
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  isVisible: integer('is_visible', { mode: 'boolean' }).notNull().default(true),
  ...timestamps,
}, (table) => ({
  visibleSortIdx: index('idx_faqs_visible_sort').on(table.isVisible, table.sortOrder),
}))

// ─── Activity Log ─────────────────────────────────
// Tracks all admin actions (string changes, content edits, etc.)

export const activityLog = sqliteTable('activity_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  action: text('action').notNull(), // 'created' | 'updated' | 'deleted'
  entityType: text('entity_type').notNull(), // 'profile' | 'wowup' | 'layout' | 'changelog' | 'content'
  entityId: integer('entity_id'),
  entityName: text('entity_name').notNull(),
  details: text('details'), // JSON with change details
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => ({
  entityTypeCreatedAtIdx: index('idx_activity_log_entity_type_created_at').on(table.entityType, table.createdAt),
  userIdCreatedAtIdx: index('idx_activity_log_user_id_created_at').on(table.userId, table.createdAt),
}))

// ─── Users ─────────────────────────────────────────
// Admin accounts

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('admin'),
  lastLogin: integer('last_login', { mode: 'timestamp' }),
  isLocked: integer('is_locked', { mode: 'boolean' }).notNull().default(false),
  lockedUntil: integer('locked_until', { mode: 'timestamp' }),
  ...timestamps,
})

// ─── Sessions ─────────────────────────────────────
// Active admin sessions (server-side session tracking)

export const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  browser: text('browser'),
  os: text('os'),
  deviceType: text('device_type'),
  lastActive: integer('last_active', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  isRevoked: integer('is_revoked', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => ({
  tokenHashIdx: index('idx_sessions_token_hash').on(table.tokenHash),
  userRevokedIdx: index('idx_sessions_user_revoked').on(table.userId, table.isRevoked),
}))

// ─── Login Attempts ──────────────────────────────
// Tracks all login attempts for security auditing

export const loginAttempts = sqliteTable('login_attempts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  browser: text('browser'),
  os: text('os'),
  success: integer('success', { mode: 'boolean' }).notNull(),
  failReason: text('fail_reason'),
  isFlagged: integer('is_flagged', { mode: 'boolean' }).notNull().default(false),
  flagReason: text('flag_reason'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => ({
  usernameCreatedAtIdx: index('idx_login_attempts_username_created_at').on(table.username, table.createdAt),
  ipCreatedAtIdx: index('idx_login_attempts_ip_created_at').on(table.ipAddress, table.createdAt),
}))

// ─── Passkeys (WebAuthn Credentials) ──────────────
// Registered WebAuthn/Passkey credentials per user

export const passkeys = sqliteTable('passkeys', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  credentialId: text('credential_id').notNull().unique(),
  publicKey: text('public_key').notNull(),           // base64url-encoded
  counter: integer('counter').notNull().default(0),
  deviceName: text('device_name').notNull().default('Passkey'),
  transports: text('transports'),                    // JSON array: ["internal","hybrid"]
  aaguid: text('aaguid'),                            // Authenticator model identifier
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  lastUsed: integer('last_used', { mode: 'timestamp' }),
}, (table) => ({
  userIdIdx: index('idx_passkeys_user_id').on(table.userId),
}))

// ─── WebAuthn Challenges ──────────────────────────
// Temporary challenge storage for WebAuthn registration/authentication

export const webauthnChallenges = sqliteTable('webauthn_challenges', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  challenge: text('challenge').notNull(),
  userId: integer('user_id'),                        // null for authentication challenges
  type: text('type').notNull(),                      // 'register' | 'authenticate'
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => ({
  expiresAtIdx: index('idx_webauthn_challenges_expires_at').on(table.expiresAt),
}))

// ─── API Keys ──────────────────────────────────────
// Keys for external access (GitHub Actions, sync scripts)

export const apiKeys = sqliteTable('api_keys', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  keyHash: text('key_hash').notNull(),
  keyPreview: text('key_preview').notNull(),
  permissions: text('permissions').notNull().default('read'),
  lastUsed: integer('last_used', { mode: 'timestamp' }),
  ...timestamps,
})

// ─── Settings ──────────────────────────────────────
// App-wide key-value settings

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

// ─── Sync History ──────────────────────────────────
// GitHub sync run log

export const syncHistory = sqliteTable('sync_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  triggerSource: text('trigger_source').notNull(),
  status: text('status').notNull(),
  details: text('details'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

// ─── Copy Events ───────────────────────────────────
// Track when users copy strings (for stats)

export const copyEvents = sqliteTable('copy_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  stringType: text('string_type').notNull(),
  stringId: integer('string_id').notNull(),
  ip: text('ip'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => ({
  stringTypeStringIdIdx: index('idx_copy_events_string_type_string_id').on(table.stringType, table.stringId),
  createdAtIdx: index('idx_copy_events_created_at').on(table.createdAt),
}))

// ─── Page Views ────────────────────────────────────
// Anonymous page view tracking for analytics

export const pageViews = sqliteTable('page_views', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  path: text('path').notNull(),
  referrer: text('referrer'),
  userAgent: text('user_agent'),
  deviceType: text('device_type'),    // 'desktop' | 'mobile' | 'tablet'
  browser: text('browser'),           // 'Chrome' | 'Firefox' | 'Safari' etc.
  os: text('os'),                     // 'Windows' | 'macOS' | 'Linux' | 'Android' | 'iOS'
  country: text('country'),           // reserved for future geo-IP
  ip: text('ip'),                     // legacy: always NULL now (scrubbed)
  visitor: text('visitor'),           // per-day salted hash, not linkable across days
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => ({
  pathCreatedAtIdx: index('idx_page_views_path_created_at').on(table.path, table.createdAt),
  createdAtIdx: index('idx_page_views_created_at').on(table.createdAt),
}))

// ─── Daily roll-up of anonymous counting ───────────
// One row per UTC day, kind (site | route | copy | copy-site | referrer | device | browser | os) and key.
export const statsDaily = sqliteTable('stats_daily', {
  day: text('day').notNull(),
  kind: text('kind').notNull(),
  key: text('key').notNull(),
  views: integer('views').notNull().default(0),
  uniques: integer('uniques').notNull().default(0),
}, (table) => ({
  pk: primaryKey({ columns: [table.day, table.kind, table.key] }),
}))

// ─── Public status sampler ────────────────────────
// One row per 5-minute slot the site answered its own database; finished days roll up into status_daily.
export const statusSamples = sqliteTable('status_samples', {
  slot: integer('slot').primaryKey(),
})

export const statusDaily = sqliteTable('status_daily', {
  day: text('day').primaryKey(),
  seen: integer('seen').notNull(),
  firstSlot: integer('first_slot').notNull(),
})

// Admin-written maintenance / incident notices for /status (see server/utils/statusNoticeStore.ts).
// The timeline table is append-only: rows are inserted, never edited.
export const statusNotices = sqliteTable('status_notices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  kind: text('kind').notNull(),
  status: text('status').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull().default(''),
  component: text('component'),
  startsAt: integer('starts_at').notNull(),
  endsAt: integer('ends_at'),
  resolvedAt: integer('resolved_at'),
  createdBy: integer('created_by'),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').notNull().default(sql`(unixepoch())`),
})

export const statusNoticeUpdates = sqliteTable('status_notice_updates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  noticeId: integer('notice_id').notNull(),
  status: text('status').notNull(),
  body: text('body').notNull().default(''),
  createdBy: integer('created_by'),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
})

// ─── Community presets ─────────────────────────────
// Visitor-submitted import strings in a moderation queue. Public input: no IP,
// no user agent, no account is stored. Only `approved` rows are ever public.
export const communityPresets = sqliteTable('community_presets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  addon: text('addon').notNull(),
  presetString: text('preset_string').notNull(),
  note: text('note').notNull().default(''),
  testedVersion: text('tested_version').notNull().default(''),
  status: text('status').notNull().default('pending'), // 'pending' | 'approved' | 'rejected'
  contentHash: text('content_hash').notNull(),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
  reviewedAt: integer('reviewed_at'),
  reviewedBy: integer('reviewed_by'),
})

// ─── Visitor log (consent only) ────────────────────
// Detailed records, written only with the visitor's statistics consent. Full IP and user agent are kept
// for 13 months and then everything is deleted (server/utils/visitorLog.ts).
export const visitorSessions = sqliteTable('visitor_sessions', {
  id: text('id').primaryKey(), // random 128-bit hex, also the value of the consent-bound mg_sid cookie
  visitorId: text('visitor_id'), // random 128-bit hex of the consent-bound mg_vid cookie (returning visitor)
  startedAt: integer('started_at').notNull(),
  lastSeen: integer('last_seen').notNull(),
  ip: text('ip'),
  ipBucket: text('ip_bucket'), // IPv4 address or IPv6 /64 of the visit, for the per-network daily limit
  userAgent: text('user_agent'),
  browser: text('browser').notNull().default('Other'),
  os: text('os').notNull().default('Other'),
  device: text('device').notNull().default('desktop'),
  country: text('country').notNull().default('unknown'),
  city: text('city'),
  referrerUrl: text('referrer_url'),
  referrerHost: text('referrer_host'),
  landingPath: text('landing_path').notNull(),
  exitPath: text('exit_path'),
  hits: integer('hits').notNull().default(0),
  screenW: integer('screen_w'),
  screenH: integer('screen_h'),
  language: text('language'),
  timezone: text('timezone'),
  utmSource: text('utm_source'),
  utmMedium: text('utm_medium'),
  utmCampaign: text('utm_campaign'),
  utmTerm: text('utm_term'),
  utmContent: text('utm_content'),
})

export const visitorHits = sqliteTable('visitor_hits', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: text('session_id').notNull(),
  path: text('path').notNull(),
  createdAt: integer('created_at').notNull(),
  dwellS: integer('dwell_s'), // seconds on the page (visible time), reported when the page is left
  scrollMax: integer('scroll_max').notNull().default(0), // 0, 25, 50, 75 or 100
})

// Clicks on marked calls to action, downloads and external links: a fixed kind and a short target, no free text.
export const visitorEvents = sqliteTable('visitor_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: text('session_id').notNull(),
  path: text('path').notNull(),
  kind: text('kind').notNull(), // 'cta' | 'external' | 'download'
  target: text('target').notNull(),
  createdAt: integer('created_at').notNull(),
})

// ─── Web Vitals (anonymous RUM) ────────────────────
// One row per metric sample: page path, metric name, value. No IP, UA,
// cookie or user id is stored. Retention follows the page_views setting.
export const webVitals = sqliteTable('web_vitals', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  path: text('path').notNull(),
  metric: text('metric').notNull(), // LCP | INP | CLS | TTFB
  value: integer('value').notNull(), // ms; CLS × 1000
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => ({
  metricPathIdx: index('idx_web_vitals_metric_path_created_at').on(table.metric, table.path, table.createdAt),
}))

// ─── Content revisions ─────────────────────────────
// Previous value of a site_content cell, written before each admin save.
// `value` NULL = the cell did not exist yet (restore deletes it).
export const contentRevisions = sqliteTable('content_revisions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  page: text('page').notNull(),
  section: text('section').notNull(),
  key: text('key').notNull(),
  locale: text('locale').notNull().default('en'),
  value: text('value'),
  userId: integer('user_id'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => ({
  pageCreatedIdx: index('idx_content_revisions_page_created_at').on(table.page, table.createdAt),
}))

// ─── Audit changes ─────────────────────────────────
// Redacted before/after snapshots of admin writes (see server/utils/auditLog.ts).
// Retention: last 5000 rows / 90 days, pruned on every insert.
export const auditChanges = sqliteTable('audit_changes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: integer('entity_id'),
  entityKey: text('entity_key'),
  entityName: text('entity_name').notNull(),
  beforeJson: text('before_json'),
  afterJson: text('after_json'),
  userId: integer('user_id'),
  actorName: text('actor_name'),
  undoOf: integer('undo_of'),
  undoneBy: integer('undone_by'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => ({
  createdIdx: index('idx_audit_changes_created_at').on(table.createdAt),
  entityIdx: index('idx_audit_changes_entity').on(table.entityType, table.entityId),
}))

// ─── Content drafts ────────────────────────────────
// Unpublished admin edits of site_content cells. Only cells that differ from
// the published value are stored. `value` '' = "delete the cell on publish".
// Never read by public endpoints, feeds, search index or sitemap.
export const contentDrafts = sqliteTable('content_drafts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  page: text('page').notNull(),
  section: text('section').notNull(),
  key: text('key').notNull(),
  locale: text('locale').notNull().default('en'),
  value: text('value').notNull(),
  type: text('type').notNull().default('text'),
  userId: integer('user_id'),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
}, (table) => ({
  cellIdx: uniqueIndex('idx_content_drafts_cell').on(table.page, table.section, table.key, table.locale),
}))

// ─── Addons ────────────────────────────────────────
// Supported WoW addons surfaced on /addons page.
// Auto-synced from MagguuUI.toc OptionalDeps + RequiredDeps via webhook.

export const addons = sqliteTable('addons', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  tocName: text('toc_name'),
  name: text('name').notNull(),
  category: text('category').notNull().default('optional'), // 'required' | 'core' | 'optional'
  emoji: text('emoji'),
  description: text('description'),
  url: text('url'),
  sortOrder: integer('sort_order').notNull().default(0),
  isVisible: integer('is_visible', { mode: 'boolean' }).notNull().default(true),
  isAvailable: integer('is_available', { mode: 'boolean' }).notNull().default(true),
  source: text('source').notNull().default('toc'), // 'toc' | 'manual'
  lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' }),
  ...timestamps,
}, (table) => ({
  categorySortIdx: index('idx_addons_category_sort').on(table.category, table.sortOrder),
}))

// ─── Rate Limits ──────────────────────────────────
// Persistent request throttling state per key (e.g. login:IP)

export const rateLimits = sqliteTable('rate_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull().default(0),
  firstAttempt: integer('first_attempt').notNull(),
  blockedUntil: integer('blocked_until').notNull().default(0),
  updatedAt: integer('updated_at').notNull(),
}, (table) => ({
  updatedAtIdx: index('idx_rate_limits_updated_at').on(table.updatedAt),
}))
