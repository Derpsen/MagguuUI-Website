/**
 * MagguuUI v2 — Database Schema
 *
 * All tables for the application defined with Drizzle ORM.
 * Database: SQLite (WAL mode)
 */

import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core'
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
// Import strings for Plater, ElvUI, BigWigs, Details, etc.

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
}))

// ─── WowUp Import Strings ─────────────────────────
// Required + Optional addon package strings

export const wowupStrings = sqliteTable('wowup_strings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  string: text('string').notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').notNull().default(0),
  isVisible: integer('is_visible', { mode: 'boolean' }).notNull().default(true),
  customFields: text('custom_fields'), // JSON
  ...timestamps,
})

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
})

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
})

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
})

// ─── Activity Log ─────────────────────────────────
// Tracks all admin actions (string changes, content edits, etc.)

export const activityLog = sqliteTable('activity_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  action: text('action').notNull(), // 'created' | 'updated' | 'deleted'
  entityType: text('entity_type').notNull(), // 'profile' | 'wowup' | 'layout' | 'changelog' | 'content'
  entityId: integer('entity_id'),
  entityName: text('entity_name').notNull(),
  details: text('details'), // JSON with change details
  userId: integer('user_id'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})

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
  userId: integer('user_id').notNull(),
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
})

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
})

// ─── Passkeys (WebAuthn Credentials) ──────────────
// Registered WebAuthn/Passkey credentials per user

export const passkeys = sqliteTable('passkeys', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull(),
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
})

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
})

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

// ─── API Logs ──────────────────────────────────────
// Request logging for statistics

export const apiLogs = sqliteTable('api_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  endpoint: text('endpoint').notNull(),
  method: text('method').notNull(),
  ip: text('ip'),
  apiKeyId: integer('api_key_id'),
  statusCode: integer('status_code'),
  createdAt: integer('created_at', { mode: 'timestamp' })
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
})

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
  ip: text('ip'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
})
