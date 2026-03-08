/**
 * GET /api/v1/admin/stats
 *
 * Comprehensive analytics: counts, daily charts, top strings,
 * page views, referrers, devices, browsers, OS, top pages, hourly activity.
 */

import { count, sql, desc, eq, inArray } from 'drizzle-orm'
import { db } from '~/server/database'
import {
  profiles, wowupStrings, characterLayouts, changelogs,
  copyEvents, apiLogs, activityLog, users,
} from '~/server/database/schema'

export default defineEventHandler(async () => {
  // ─── Time Boundaries ──────────────────────────────
  const now = Math.floor(Date.now() / 1000)
  const weekAgo = now - 7 * 24 * 60 * 60
  const twoWeeksAgo = now - 14 * 24 * 60 * 60
  const monthAgo = now - 30 * 24 * 60 * 60
  const thirtyDaysAgo = monthAgo

  // ─── Entity Counts ────────────────────────────────
  const profileCount = db.select({ count: count() }).from(profiles).get()
  const wowupCount = db.select({ count: count() }).from(wowupStrings).get()
  const layoutCount = db.select({ count: count() }).from(characterLayouts).get()
  const changelogCount = db.select({ count: count() }).from(changelogs).get()
  const copyCount = db.select({ count: count() }).from(copyEvents).get()
  const apiLogCount = db.select({ count: count() }).from(apiLogs).get()
  const userCount = db.select({ count: count() }).from(users).get()
  const activityCount = db.select({ count: count() }).from(activityLog).get()

  // ─── Recent Counts (7 days) ───────────────────────
  const recentCopies = db.select({ count: count() }).from(copyEvents).where(sql`created_at > ${weekAgo}`).get()
  const recentApiCalls = db.select({ count: count() }).from(apiLogs).where(sql`created_at > ${weekAgo}`).get()

  // ─── Unique Visitors (from copy_events) ───────────
  const uniqueVisitors = db.get<{ count: number }>(sql`
    SELECT COUNT(DISTINCT ip) as count FROM copy_events WHERE ip != '0.0.0.0' AND ip IS NOT NULL
  `)
  const uniqueVisitorsLast7Days = db.get<{ count: number }>(sql`
    SELECT COUNT(DISTINCT ip) as count FROM copy_events
    WHERE created_at > ${weekAgo} AND ip != '0.0.0.0' AND ip IS NOT NULL
  `)

  // ─── Daily Charts (30 days) ───────────────────────
  const dailyCopies = db.all(sql`
    SELECT date(created_at, 'unixepoch') as day, COUNT(*) as count
    FROM copy_events WHERE created_at > ${monthAgo}
    GROUP BY day ORDER BY day ASC
  `)

  const dailyApi = db.all(sql`
    SELECT date(created_at, 'unixepoch') as day, COUNT(*) as count
    FROM api_logs WHERE created_at > ${monthAgo}
    GROUP BY day ORDER BY day ASC
  `)

  // ─── Top 10 Most Copied Strings ───────────────────
  const topCopiedRaw = db.all(sql`
    SELECT string_type, string_id, COUNT(*) as copies
    FROM copy_events GROUP BY string_type, string_id
    ORDER BY copies DESC LIMIT 10
  `) as Array<{ string_type: string; string_id: number; copies: number }>

  const layoutIds = topCopiedRaw.filter(r => r.string_type === 'layout').map(r => r.string_id)
  const profileIds = topCopiedRaw.filter(r => r.string_type === 'profile').map(r => r.string_id)
  const wowupIds = topCopiedRaw.filter(r => r.string_type === 'wowup').map(r => r.string_id)

  const layoutNames = layoutIds.length
    ? db.select({ id: characterLayouts.id, name: characterLayouts.name, className: characterLayouts.className, spec: characterLayouts.spec })
        .from(characterLayouts).where(inArray(characterLayouts.id, layoutIds)).all()
    : []
  const profileNames = profileIds.length
    ? db.select({ id: profiles.id, addon: profiles.addon, profile: profiles.profile })
        .from(profiles).where(inArray(profiles.id, profileIds)).all()
    : []
  const wowupNames = wowupIds.length
    ? db.select({ id: wowupStrings.id, name: wowupStrings.name })
        .from(wowupStrings).where(inArray(wowupStrings.id, wowupIds)).all()
    : []

  const topCopied = topCopiedRaw.map(r => {
    let name = `${r.string_type} #${r.string_id}`
    if (r.string_type === 'layout') {
      const l = layoutNames.find(x => x.id === r.string_id)
      if (l) name = l.className && l.spec ? `${l.className} — ${l.spec}` : l.name
    } else if (r.string_type === 'profile') {
      const p = profileNames.find(x => x.id === r.string_id)
      if (p) name = `${p.addon} — ${p.profile}`
    } else if (r.string_type === 'wowup') {
      const w = wowupNames.find(x => x.id === r.string_id)
      if (w) name = w.name
    }
    return { ...r, name }
  })

  // ─── Recent Activity ──────────────────────────────
  const recentActivity = db.select().from(activityLog)
    .orderBy(desc(activityLog.createdAt))
    .limit(10)
    .all()

  // ─── Copies by Type ───────────────────────────────
  const copiesByType = db.all(sql`
    SELECT string_type, COUNT(*) as copies
    FROM copy_events GROUP BY string_type ORDER BY copies DESC
  `) as Array<{ string_type: string; copies: number }>

  // ─── Top API Endpoints (30 days) ──────────────────
  const topEndpoints = db.all(sql`
    SELECT endpoint, method, COUNT(*) as calls
    FROM api_logs WHERE created_at > ${monthAgo}
    GROUP BY endpoint, method ORDER BY calls DESC LIMIT 10
  `) as Array<{ endpoint: string; method: string; calls: number }>

  // ─── Weekly Trends ────────────────────────────────
  const thisWeekCopies = recentCopies?.count || 0
  const lastWeekCopies = db.get<{ count: number }>(sql`
    SELECT COUNT(*) as count FROM copy_events
    WHERE created_at > ${twoWeeksAgo} AND created_at <= ${weekAgo}
  `)
  const copyTrend = lastWeekCopies?.count
    ? Math.round(((thisWeekCopies - lastWeekCopies.count) / lastWeekCopies.count) * 100)
    : 0

  const thisWeekApi = recentApiCalls?.count || 0
  const lastWeekApi = db.get<{ count: number }>(sql`
    SELECT COUNT(*) as count FROM api_logs
    WHERE created_at > ${twoWeeksAgo} AND created_at <= ${weekAgo}
  `)
  const apiTrend = lastWeekApi?.count
    ? Math.round(((thisWeekApi - lastWeekApi.count) / lastWeekApi.count) * 100)
    : 0

  // ─── String Health ────────────────────────────────
  const outdatedProfiles = db.get<{ count: number }>(sql`
    SELECT COUNT(*) as count FROM profiles WHERE updated_at < ${thirtyDaysAgo}
  `)
  const outdatedLayouts = db.get<{ count: number }>(sql`
    SELECT COUNT(*) as count FROM character_layouts WHERE updated_at < ${thirtyDaysAgo}
  `)

  // ─── Average String Size per Addon ────────────────
  const avgStringSizes = db.all(sql`
    SELECT addon, AVG(LENGTH(string)) as avg_size, COUNT(*) as count
    FROM profiles WHERE is_visible = 1
    GROUP BY addon ORDER BY avg_size DESC
  `) as Array<{ addon: string; avg_size: number; count: number }>

  // ─── Hourly Copy Distribution (30 days) ───────────
  const hourlyCopies = db.all(sql`
    SELECT CAST(strftime('%H', created_at, 'unixepoch') AS INTEGER) as hour, COUNT(*) as copies
    FROM copy_events WHERE created_at > ${monthAgo}
    GROUP BY hour ORDER BY hour ASC
  `) as Array<{ hour: number; copies: number }>

  // ─── Page View Analytics ──────────────────────────

  // Total page views + last 7 days
  const totalPageViews = db.get<{ count: number }>(sql`
    SELECT COUNT(*) as count FROM page_views
  `)
  const pageViewsLast7Days = db.get<{ count: number }>(sql`
    SELECT COUNT(*) as count FROM page_views WHERE created_at > ${weekAgo}
  `)

  // Unique visitors from page_views (distinct IPs)
  const uniquePageVisitors = db.get<{ count: number }>(sql`
    SELECT COUNT(DISTINCT ip) as count FROM page_views WHERE ip != '0.0.0.0' AND ip IS NOT NULL
  `)
  const uniquePageVisitorsLast7Days = db.get<{ count: number }>(sql`
    SELECT COUNT(DISTINCT ip) as count FROM page_views
    WHERE created_at > ${weekAgo} AND ip != '0.0.0.0' AND ip IS NOT NULL
  `)

  // Daily page views (30 days)
  const dailyPageViews = db.all(sql`
    SELECT date(created_at, 'unixepoch') as day, COUNT(*) as count
    FROM page_views WHERE created_at > ${monthAgo}
    GROUP BY day ORDER BY day ASC
  `) as Array<{ day: string; count: number }>

  // Top pages (30 days)
  const topPages = db.all(sql`
    SELECT path, COUNT(*) as views, COUNT(DISTINCT ip) as unique_visitors
    FROM page_views WHERE created_at > ${monthAgo}
    GROUP BY path ORDER BY views DESC LIMIT 10
  `) as Array<{ path: string; views: number; unique_visitors: number }>

  // Top referrers (30 days)
  const topReferrers = db.all(sql`
    SELECT referrer, COUNT(*) as visits
    FROM page_views
    WHERE created_at > ${monthAgo} AND referrer IS NOT NULL AND referrer != ''
    GROUP BY referrer ORDER BY visits DESC LIMIT 10
  `) as Array<{ referrer: string; visits: number }>

  // Device type breakdown (30 days)
  const deviceBreakdown = db.all(sql`
    SELECT device_type, COUNT(*) as count
    FROM page_views WHERE created_at > ${monthAgo} AND device_type IS NOT NULL
    GROUP BY device_type ORDER BY count DESC
  `) as Array<{ device_type: string; count: number }>

  // Browser breakdown (30 days)
  const browserBreakdown = db.all(sql`
    SELECT browser, COUNT(*) as count
    FROM page_views WHERE created_at > ${monthAgo} AND browser IS NOT NULL
    GROUP BY browser ORDER BY count DESC
  `) as Array<{ browser: string; count: number }>

  // OS breakdown (30 days)
  const osBreakdown = db.all(sql`
    SELECT os, COUNT(*) as count
    FROM page_views WHERE created_at > ${monthAgo} AND os IS NOT NULL
    GROUP BY os ORDER BY count DESC
  `) as Array<{ os: string; count: number }>

  // Hourly page views (30 days)
  const hourlyPageViews = db.all(sql`
    SELECT CAST(strftime('%H', created_at, 'unixepoch') AS INTEGER) as hour, COUNT(*) as views
    FROM page_views WHERE created_at > ${monthAgo}
    GROUP BY hour ORDER BY hour ASC
  `) as Array<{ hour: number; views: number }>

  // Page view weekly trend
  const thisWeekPageViews = pageViewsLast7Days?.count || 0
  const lastWeekPageViews = db.get<{ count: number }>(sql`
    SELECT COUNT(*) as count FROM page_views
    WHERE created_at > ${twoWeeksAgo} AND created_at <= ${weekAgo}
  `)
  const pageViewTrend = lastWeekPageViews?.count
    ? Math.round(((thisWeekPageViews - lastWeekPageViews.count) / lastWeekPageViews.count) * 100)
    : 0

  return {
    success: true,
    data: {
      // Entity counts
      profiles: profileCount?.count || 0,
      wowupStrings: wowupCount?.count || 0,
      layouts: layoutCount?.count || 0,
      changelogs: changelogCount?.count || 0,
      users: userCount?.count || 0,
      totalCopies: copyCount?.count || 0,
      totalApiCalls: apiLogCount?.count || 0,
      totalActivities: activityCount?.count || 0,
      // Copy visitors
      uniqueVisitors: uniqueVisitors?.count || 0,
      uniqueVisitorsLast7Days: uniqueVisitorsLast7Days?.count || 0,
      copiesLast7Days: recentCopies?.count || 0,
      apiCallsLast7Days: recentApiCalls?.count || 0,
      // Charts
      dailyCopies,
      dailyApi,
      topCopied,
      recentActivity,
      // Extended stats
      copiesByType,
      topEndpoints,
      copyTrend,
      apiTrend,
      outdatedProfiles: outdatedProfiles?.count || 0,
      outdatedLayouts: outdatedLayouts?.count || 0,
      avgStringSizes,
      hourlyCopies,
      // Page view analytics
      totalPageViews: totalPageViews?.count || 0,
      pageViewsLast7Days: pageViewsLast7Days?.count || 0,
      uniquePageVisitors: uniquePageVisitors?.count || 0,
      uniquePageVisitorsLast7Days: uniquePageVisitorsLast7Days?.count || 0,
      dailyPageViews,
      topPages,
      topReferrers,
      deviceBreakdown,
      browserBreakdown,
      osBreakdown,
      hourlyPageViews,
      pageViewTrend,
    },
  }
})
