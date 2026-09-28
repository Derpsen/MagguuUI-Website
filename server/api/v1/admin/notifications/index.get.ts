/**
 * GET /api/v1/admin/notifications
 *
 * Returns active admin notifications (English only).
 */

import { count, eq, sql } from 'drizzle-orm'
import { db } from '~/server/database'
import {
  syncHistory, settings, profiles, wowupStrings,
  characterLayouts, changelogs,
} from '~/server/database/schema'
import { resolveLocalAddonVersion } from '~/server/utils/addonVersion'

interface Notification {
  id: string
  type: 'warning' | 'info' | 'error'
  title: string
  message: string
  link?: string
}

export default defineEventHandler(async () => {
  const notifications: Notification[] = []

  // 1. Check recent failed syncs
  try {
    const failedSyncs = db.select({ count: count() }).from(syncHistory)
      .where(sql`${syncHistory.status} = 'error' AND ${syncHistory.createdAt} > datetime('now', '-1 day')`)
      .get()

    if (failedSyncs && failedSyncs.count > 0) {
      notifications.push({
        id: 'failed-syncs',
        type: 'error',
        title: `${failedSyncs.count} failed sync(s)`,
        message: 'There were failed GitHub syncs in the last 24 hours.',
        link: '/admin/system/github',
      })
    }
  } catch { /* table might not exist yet */ }

  // 2. Check GitHub addon version vs local
  const localAddonVersion = resolveLocalAddonVersion()
  const githubVersion = db.select().from(settings).where(eq(settings.key, 'github_latest_version')).get()

  if (localAddonVersion && githubVersion?.value && localAddonVersion !== githubVersion.value) {
    notifications.push({
      id: 'version-mismatch',
      type: 'warning',
      title: 'Addon version outdated',
      message: `Local MagguuUI: v${localAddonVersion} — GitHub latest: v${githubVersion.value}`,
      link: '/admin/system/github',
    })
  }

  // 3. Check empty categories
  const profileCount = db.select({ count: count() }).from(profiles).get()
  const wowupCount = db.select({ count: count() }).from(wowupStrings).get()
  const layoutCount = db.select({ count: count() }).from(characterLayouts).get()

  if (!profileCount?.count && !wowupCount?.count && !layoutCount?.count) {
    notifications.push({
      id: 'no-strings',
      type: 'info',
      title: 'No strings available',
      message: 'Create your first profile, WowUp string, or layout.',
      link: '/admin/strings/profiles',
    })
  }

  // 4. Check unpublished changelogs
  const unpublished = db.select({ count: count() }).from(changelogs)
    .where(eq(changelogs.isPublished, false))
    .get()

  if (unpublished && unpublished.count > 0) {
    notifications.push({
      id: 'unpublished-changelogs',
      type: 'info',
      title: `${unpublished.count} unpublished changelog(s)`,
      message: 'There are changelog entries that have not been published yet.',
      link: '/admin/content/changelog',
    })
  }

  return apiSuccess(notifications)
})