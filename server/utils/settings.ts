/**
 * Settings Utilities
 *
 * Read app settings from the DB with caching.
 * Avoids hitting SQLite on every single request.
 */

import { eq } from 'drizzle-orm'
import { db, sqlite } from '~/server/database'
import { settings } from '~/server/database/schema'

// ─── Cached Settings Reader ─────────────────────

/** In-memory cache: key → { value, fetchedAt } */
const cache = new Map<string, { value: string; fetchedAt: number }>()
const CACHE_TTL = 60_000 // 60 seconds — stale settings are OK for a minute

/**
 * Get a single setting value from DB (with cache).
 * Returns the fallback if the key doesn't exist.
 */
function getSetting(key: string, fallback: string = ''): string {
  const now = Date.now()
  const cached = cache.get(key)
  if (cached && now - cached.fetchedAt < CACHE_TTL) {
    return cached.value
  }

  try {
    const row = sqlite.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
    const value = row?.value ?? fallback
    cache.set(key, { value, fetchedAt: now })
    return value
  } catch {
    return fallback
  }
}

/**
 * Get a setting as a number.
 */
function getSettingNumber(key: string, fallback: number): number {
  const val = getSetting(key, String(fallback))
  const num = Number(val)
  return isNaN(num) ? fallback : num
}

/**
 * Get a setting as a boolean ('true' → true, anything else → false).
 */
function getSettingBool(key: string, fallback: boolean): boolean {
  const val = getSetting(key, String(fallback))
  return val === 'true'
}

/**
 * Upsert a settings row and invalidate the in-memory cache for that key.
 * Shared by GitHub pull, webhook release, and admin version-check.
 */
export function upsertSetting(key: string, value: string) {
  const existing = db.select().from(settings).where(eq(settings.key, key)).get()
  if (existing) {
    db.update(settings).set({ value, updatedAt: new Date() }).where(eq(settings.id, existing.id)).run()
  } else {
    db.insert(settings).values({ key, value }).run()
  }
  invalidateSettingsCache(key)
}

/**
 * Invalidate the cache for a specific key (call after settings are saved).
 */
export function invalidateSettingsCache(key?: string) {
  if (key) {
    cache.delete(key)
  } else {
    cache.clear()
  }
}

// ─── Convenience Getters for Security Settings ──

export function getSessionTimeoutHours(): number {
  return getSettingNumber('session_timeout_hours', 24)
}

export function getMaxLoginAttempts(): number {
  return getSettingNumber('max_login_attempts', 10)
}

export function getLockoutDurationMinutes(): number {
  return getSettingNumber('lockout_duration_minutes', 30)
}

export function getDataRetentionDays(): number {
  return getSettingNumber('data_retention_days', 90)
}

export function isPageViewTrackingEnabled(): boolean {
  return getSettingBool('tracking_pageviews_enabled', true)
}

export function isCopyEventTrackingEnabled(): boolean {
  return getSettingBool('tracking_copyevents_enabled', true)
}
