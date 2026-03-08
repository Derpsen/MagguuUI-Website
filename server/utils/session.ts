/**
 * Session Management Utilities
 *
 * Centralized session tracking, login attempt logging,
 * suspicious activity detection, and account lockout.
 */

import { createHash } from 'crypto'
import { db, sqlite } from '~/server/database'
import { sessions, loginAttempts, users } from '~/server/database/schema'
import { eq, and, desc, sql } from 'drizzle-orm'
import { getMaxLoginAttempts, getLockoutDurationMinutes } from '~/server/utils/settings'

// ─── User-Agent Parsers (shared with page-view.post.ts) ──

export function parseBrowser(ua: string): string {
  if (ua.includes('Firefox/')) return 'Firefox'
  if (ua.includes('Edg/')) return 'Edge'
  if (ua.includes('OPR/') || ua.includes('Opera/')) return 'Opera'
  if (ua.includes('Chrome/') && ua.includes('Safari/')) return 'Chrome'
  if (ua.includes('Safari/') && !ua.includes('Chrome')) return 'Safari'
  if (ua.includes('MSIE') || ua.includes('Trident/')) return 'IE'
  return 'Other'
}

export function parseOS(ua: string): string {
  if (ua.includes('Windows')) return 'Windows'
  if (ua.includes('Mac OS X') || ua.includes('Macintosh')) return 'macOS'
  if (ua.includes('Android')) return 'Android'
  if (ua.includes('iPhone') || ua.includes('iPad') || ua.includes('iPod')) return 'iOS'
  if (ua.includes('Linux')) return 'Linux'
  if (ua.includes('CrOS')) return 'ChromeOS'
  return 'Other'
}

export function parseDeviceType(ua: string): string {
  if (/Mobi|Android.*Mobile|iPhone|iPod|Opera Mini|IEMobile/i.test(ua)) return 'mobile'
  if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) return 'tablet'
  return 'desktop'
}

// ─── Token Hashing ────────────────────────────────

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

// ─── Session CRUD ─────────────────────────────────

export function createSession(opts: {
  userId: number
  token: string
  ip: string
  userAgent: string
  expiresAt: Date
}) {
  const tokenHash = hashToken(opts.token)
  return db.insert(sessions).values({
    userId: opts.userId,
    tokenHash,
    ipAddress: opts.ip,
    userAgent: opts.userAgent?.substring(0, 500) || null,
    browser: parseBrowser(opts.userAgent || ''),
    os: parseOS(opts.userAgent || ''),
    deviceType: parseDeviceType(opts.userAgent || ''),
    expiresAt: opts.expiresAt,
  }).returning().get()
}

// Throttle lastActive updates (max once per 60s per session)
const lastActiveCache = new Map<number, number>()

export function validateSession(tokenHash: string) {
  const session = db.select().from(sessions)
    .where(and(
      eq(sessions.tokenHash, tokenHash),
      eq(sessions.isRevoked, false),
    )).get()

  if (!session) return null

  // Check expiry
  const now = new Date()
  const expiresAt = typeof session.expiresAt === 'number'
    ? new Date(session.expiresAt * 1000)
    : session.expiresAt
  if (expiresAt < now) {
    revokeSession(session.id)
    return null
  }

  // Throttled lastActive update (max once per 60s)
  const lastUpdate = lastActiveCache.get(session.id) || 0
  if (Date.now() - lastUpdate > 60_000) {
    db.update(sessions)
      .set({ lastActive: now })
      .where(eq(sessions.id, session.id))
      .run()
    lastActiveCache.set(session.id, Date.now())
  }

  return session
}

export function revokeSession(sessionId: number) {
  db.update(sessions)
    .set({ isRevoked: true })
    .where(eq(sessions.id, sessionId))
    .run()
  lastActiveCache.delete(sessionId)
}

export function revokeAllUserSessions(userId: number, exceptSessionId?: number) {
  if (exceptSessionId) {
    sqlite.prepare(
      'UPDATE sessions SET is_revoked = 1 WHERE user_id = ? AND id != ? AND is_revoked = 0'
    ).run(userId, exceptSessionId)
  } else {
    db.update(sessions)
      .set({ isRevoked: true })
      .where(and(eq(sessions.userId, userId), eq(sessions.isRevoked, false)))
      .run()
  }
}

export function getUserSessions(userId: number) {
  return db.select().from(sessions)
    .where(and(
      eq(sessions.userId, userId),
      eq(sessions.isRevoked, false),
    ))
    .orderBy(desc(sessions.lastActive))
    .all()
    .filter(s => {
      // Filter out expired sessions
      const expiresAt = typeof s.expiresAt === 'number'
        ? new Date(s.expiresAt * 1000)
        : s.expiresAt
      if (expiresAt < new Date()) {
        revokeSession(s.id)
        return false
      }
      return true
    })
}

// ─── Login Attempt Logging ────────────────────────

export function logLoginAttempt(opts: {
  username: string
  ip: string
  userAgent: string
  success: boolean
  failReason?: string
}) {
  const flagInfo = opts.success ? { flagged: false, reason: null } : detectSuspicious(opts)

  db.insert(loginAttempts).values({
    username: opts.username,
    ipAddress: opts.ip,
    userAgent: opts.userAgent?.substring(0, 500) || null,
    browser: parseBrowser(opts.userAgent || ''),
    os: parseOS(opts.userAgent || ''),
    success: opts.success,
    failReason: opts.failReason || null,
    isFlagged: flagInfo.flagged,
    flagReason: flagInfo.reason,
  }).run()

  return flagInfo
}

function detectSuspicious(opts: {
  username: string
  ip: string
  userAgent: string
}): { flagged: boolean; reason: string | null } {
  const thirtyMinAgo = Math.floor(Date.now() / 1000) - 30 * 60

  // Check brute force: 3+ failed attempts from same IP in last 30 min
  const recentFails = sqlite.prepare(
    'SELECT COUNT(*) as count FROM login_attempts WHERE ip_address = ? AND success = 0 AND created_at > ?'
  ).get(opts.ip, thirtyMinAgo) as { count: number }

  if (recentFails.count >= 3) {
    return { flagged: true, reason: 'brute_force' }
  }

  // Check new IP: this username never logged in successfully from this IP
  const knownIp = sqlite.prepare(
    'SELECT COUNT(*) as count FROM login_attempts WHERE username = ? AND ip_address = ? AND success = 1'
  ).get(opts.username, opts.ip) as { count: number }

  if (knownIp.count === 0) {
    return { flagged: true, reason: 'new_ip' }
  }

  // Check new device: this username never logged in from this browser+OS combo
  const browser = parseBrowser(opts.userAgent || '')
  const os = parseOS(opts.userAgent || '')
  const knownDevice = sqlite.prepare(
    'SELECT COUNT(*) as count FROM login_attempts WHERE username = ? AND browser = ? AND os = ? AND success = 1'
  ).get(opts.username, browser, os) as { count: number }

  if (knownDevice.count === 0) {
    return { flagged: true, reason: 'new_device' }
  }

  return { flagged: false, reason: null }
}

// ─── Account Lockout ──────────────────────────────
// Values are read from DB settings (with sane defaults)

export function checkAccountLockout(username: string): { locked: boolean; retryAfterSeconds: number } {
  // Check if user is explicitly locked
  const user = db.select().from(users)
    .where(eq(users.username, username))
    .get()

  if (user?.isLocked && user?.lockedUntil) {
    const lockedUntil = typeof user.lockedUntil === 'number'
      ? user.lockedUntil
      : Math.floor(new Date(user.lockedUntil).getTime() / 1000)
    const now = Math.floor(Date.now() / 1000)

    if (lockedUntil > now) {
      return { locked: true, retryAfterSeconds: lockedUntil - now }
    }
    // Lock expired — unlock
    unlockAccount(user.id)
  }

  return { locked: false, retryAfterSeconds: 0 }
}

export function checkAndLockIfNeeded(username: string): boolean {
  const maxAttempts = getMaxLoginAttempts()           // default 10
  const lockoutMinutes = getLockoutDurationMinutes()   // default 30
  const lockoutWindow = lockoutMinutes * 60            // same window as lockout duration
  const windowStart = Math.floor(Date.now() / 1000) - lockoutWindow

  const recentFails = sqlite.prepare(
    'SELECT COUNT(*) as count FROM login_attempts WHERE username = ? AND success = 0 AND created_at > ?'
  ).get(username, windowStart) as { count: number }

  if (recentFails.count >= maxAttempts) {
    const user = db.select().from(users)
      .where(eq(users.username, username))
      .get()
    if (user) {
      lockAccount(user.id, lockoutMinutes * 60)
      return true
    }
  }
  return false
}

export function lockAccount(userId: number, durationSeconds: number) {
  const lockedUntil = new Date(Date.now() + durationSeconds * 1000)
  db.update(users)
    .set({ isLocked: true, lockedUntil })
    .where(eq(users.id, userId))
    .run()
}

export function unlockAccount(userId: number) {
  db.update(users)
    .set({ isLocked: false, lockedUntil: null })
    .where(eq(users.id, userId))
    .run()
}

// ─── Cleanup ──────────────────────────────────────

export function cleanupExpiredSessions() {
  const now = Math.floor(Date.now() / 1000)
  const sevenDaysAgo = now - 7 * 24 * 60 * 60

  // Delete expired sessions
  sqlite.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now)
  // Delete revoked sessions older than 7 days
  sqlite.prepare('DELETE FROM sessions WHERE is_revoked = 1 AND created_at < ?').run(sevenDaysAgo)
}

export function cleanupOldLoginAttempts(retentionDays: number = 90) {
  const cutoff = Math.floor(Date.now() / 1000) - retentionDays * 24 * 60 * 60
  sqlite.prepare('DELETE FROM login_attempts WHERE created_at < ?').run(cutoff)
}
