/**
 * GET /api/v1/admin/stats
 *
 * Comprehensive analytics: counts, daily charts, top strings,
 * page views, referrers, devices, browsers, OS, top pages, hourly activity.
 */

import { count, sql, desc } from 'drizzle-orm'
import { db, sqlite } from '~/server/database'
import {
  profiles, wowupStrings, characterLayouts, changelogs,
  activityLog, users,
} from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  requireAdminAccess(event)
  // ─── Time Boundaries ──────────────────────────────
  const now = Math.floor(Date.now() / 1000)
  const monthAgo = now - 30 * 24 * 60 * 60

  // ─── Entity Counts ────────────────────────────────
  const profileCount = db.select({ count: count() }).from(profiles).get()
  const wowupCount = db.select({ count: count() }).from(wowupStrings).get()
  const layoutCount = db.select({ count: count() }).from(characterLayouts).get()
  const changelogCount = db.select({ count: count() }).from(changelogs).get()
  const userCount = db.select({ count: count() }).from(users).get()
  const activityCount = db.select({ count: count() }).from(activityLog).get()

  // ─── Anonymous counters (utils/analytics.ts): daily roll-ups + today live ───
  const week = trafficReport(sqlite, 7)
  const prevWeek = trafficReport(sqlite, 7, now - 7 * 24 * 60 * 60)
  const month = trafficReport(sqlite, 30)
  const quarter = trafficReport(sqlite, 90)
  const thisWeekCopies = week.totals.copies
  const copyTrend = prevWeek.totals.copies
    ? Math.round(((thisWeekCopies - prevWeek.totals.copies) / prevWeek.totals.copies) * 100)
    : 0
  const dailyCopies = month.perDay.map(d => ({ day: d.day, count: d.copies }))
  const topCopied = month.copied.slice(0, 10).map(c => ({ string_type: c.type, string_id: c.id, copies: c.copies, name: c.name }))
  const typeTotals = new Map<string, number>()
  for (const c of month.copied) typeTotals.set(c.type, (typeTotals.get(c.type) ?? 0) + c.copies)
  const copiesByType = [...typeTotals].map(([string_type, copies]) => ({ string_type, copies })).sort((a, b) => b.copies - a.copies)

  // ─── Recent Activity ──────────────────────────────
  const recentActivity = db.select({
    id: activityLog.id,
    action: activityLog.action,
    entityType: activityLog.entityType,
    entityName: activityLog.entityName,
    createdAt: activityLog.createdAt,
  }).from(activityLog)
    .orderBy(desc(activityLog.createdAt))
    .limit(10)
    .all()

  // ─── Top API Endpoints (30 days) ──────────────────
  const topEndpoints: Array<{ endpoint: string; method: string; calls: number }> = []

  const apiTrend = 0

  // ─── String Health ────────────────────────────────
  const outdatedProfiles = db.get<{ count: number }>(sql`
    SELECT COUNT(*) as count FROM profiles WHERE updated_at < ${monthAgo}
  `)
  const outdatedLayouts = db.get<{ count: number }>(sql`
    SELECT COUNT(*) as count FROM character_layouts WHERE updated_at < ${monthAgo}
  `)
  const latestProfileUpdate = db.get<{ updatedAt: number | null }>(sql`
    SELECT MAX(updated_at) as updatedAt FROM profiles
  `)
  const latestWowupUpdate = db.get<{ updatedAt: number | null }>(sql`
    SELECT MAX(updated_at) as updatedAt FROM wowup_strings
  `)
  const latestLayoutUpdate = db.get<{ updatedAt: number | null }>(sql`
    SELECT MAX(updated_at) as updatedAt FROM character_layouts
  `)
  const latestPublishedChangelog = db.get<{ publishedAt: number | null }>(sql`
    SELECT MAX(published_at) as publishedAt FROM changelogs WHERE is_published = 1
  `)

  // ─── Average String Size per Addon ────────────────
  const avgStringSizes = db.all(sql`
    SELECT addon, AVG(LENGTH(string)) as avg_size, COUNT(*) as count
    FROM profiles WHERE is_visible = 1
    GROUP BY addon ORDER BY avg_size DESC
  `) as Array<{ addon: string; avg_size: number; count: number }>

  // ─── Hourly Copy Distribution (detail rows only: the last RAW_DETAIL_DAYS days) ───
  const hourlyCopies = sqlite.prepare(`
    SELECT CAST(strftime('%H', created_at, 'unixepoch') AS INTEGER) as hour, COUNT(*) as copies
    FROM copy_events WHERE created_at > ?
    GROUP BY hour ORDER BY hour ASC
  `).all(monthAgo) as Array<{ hour: number; copies: number }>

  // ─── Page View Analytics (anonymous, from the daily roll-ups) ───
  const pageViewsLast7Days = { count: week.totals.views }
  const uniquePageVisitorsLast7Days = { count: week.totals.visitors }
  const dailyPageViews = month.perDay.map(d => ({ day: d.day, count: d.views }))
  const topPages = month.routes.slice(0, 10).map(r => ({ path: r.path, views: r.views, unique_visitors: r.visitors }))
  const topReferrers = month.referrers.map(r => ({ referrer: r.name, visits: r.views }))
  const deviceBreakdown = month.devices.map(d => ({ device_type: d.name, count: d.views }))
  const browserBreakdown = month.browsers.map(b => ({ browser: b.name, count: b.views }))
  const osBreakdown = month.os.map(o => ({ os: o.name, count: o.views }))

  // Hourly page views (detail rows only: the last RAW_DETAIL_DAYS days)
  const hourlyPageViews = sqlite.prepare(`
    SELECT CAST(strftime('%H', created_at, 'unixepoch') AS INTEGER) as hour, COUNT(*) as views
    FROM page_views WHERE created_at > ?
    GROUP BY hour ORDER BY hour ASC
  `).all(monthAgo) as Array<{ hour: number; views: number }>

  const pageViewTrend = prevWeek.totals.views
    ? Math.round(((week.totals.views - prevWeek.totals.views) / prevWeek.totals.views) * 100)
    : 0

  return apiSuccess({
    // Entity counts
    profiles: profileCount?.count || 0,
    wowupStrings: wowupCount?.count || 0,
    layouts: layoutCount?.count || 0,
    changelogs: changelogCount?.count || 0,
    users: userCount?.count || 0,
    totalCopies: quarter.totals.copies,
    totalApiCalls: 0,
    totalActivities: activityCount?.count || 0,
    copiesLast7Days: week.totals.copies,
    copiesLast30Days: month.totals.copies,
    copiedItems30Days: month.copied.length,
    apiCallsLast7Days: 0,
    // Charts
    dailyCopies,
    dailyApi: [] as Array<{ day: string; count: number }>,
    topCopied,
    recentActivity,
    // Extended stats
    copiesByType,
    topEndpoints,
    copyTrend,
    apiTrend,
    outdatedProfiles: outdatedProfiles?.count || 0,
    outdatedLayouts: outdatedLayouts?.count || 0,
    latestProfileUpdateAt: latestProfileUpdate?.updatedAt || null,
    latestWowupUpdateAt: latestWowupUpdate?.updatedAt || null,
    latestLayoutUpdateAt: latestLayoutUpdate?.updatedAt || null,
    lastPublishedAt: latestPublishedChangelog?.publishedAt || null,
    avgStringSizes,
    hourlyCopies,
    // Page view analytics
    totalPageViews: quarter.totals.views,
    pageViewsLast7Days: pageViewsLast7Days?.count || 0,
    uniquePageVisitors: month.totals.visitors,
    uniquePageVisitorsLast7Days: uniquePageVisitorsLast7Days?.count || 0,
    dailyPageViews,
    topPages,
    topReferrers,
    deviceBreakdown,
    browserBreakdown,
    osBreakdown,
    hourlyPageViews,
    pageViewTrend,
  })
})
