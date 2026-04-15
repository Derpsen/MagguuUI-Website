/**
 * POST /api/v1/admin/version-check
 *
 * Fetches the latest release tag from GitHub and stores it in settings.
 * Compares with local addon_version setting.
 */

import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { settings } from '~/server/database/schema'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const githubUrl = db.select().from(settings).where(eq(settings.key, 'github_url')).get()
  const repoUrl = githubUrl?.value || 'https://github.com/Derpsen/MagguuUI'

  // Extract owner/repo from URL
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/)
  if (!match) {
    throw createError({ statusCode: 400, data: { success: false, error: { code: 'INVALID_URL', message: 'Invalid GitHub URL' } } })
  }

  const [, owner, repo] = match

  try {
    // Fetch latest release from GitHub API
    const response = await $fetch<{ tag_name: string; name: string; published_at: string }>(
      `https://api.github.com/repos/${owner}/${repo}/releases/latest`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'MagguuUI-WebAdmin',
        },
        timeout: 10000,
      }
    )

    const latestVersion = (response.tag_name || '').replace(/^v/, '')

    // Store in settings
    const existing = db.select().from(settings).where(eq(settings.key, 'github_latest_version')).get()
    if (existing) {
      db.update(settings).set({ value: latestVersion, updatedAt: new Date() }).where(eq(settings.id, existing.id)).run()
    } else {
      db.insert(settings).values({ key: 'github_latest_version', value: latestVersion }).run()
    }

    // Also store last check time
    const checkTime = db.select().from(settings).where(eq(settings.key, 'github_last_check')).get()
    const now = new Date().toISOString()
    if (checkTime) {
      db.update(settings).set({ value: now, updatedAt: new Date() }).where(eq(settings.id, checkTime.id)).run()
    } else {
      db.insert(settings).values({ key: 'github_last_check', value: now }).run()
    }

    // Get local version for comparison
    const localVersion = db.select().from(settings).where(eq(settings.key, 'addon_version')).get()

    return {
      success: true,
      data: {
        latestVersion,
        localVersion: localVersion?.value || null,
        isUpToDate: localVersion?.value === latestVersion,
        releaseName: response.name,
        publishedAt: response.published_at,
      },
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'GitHub API error'
    throw createError({ statusCode: 502, data: { success: false, error: { code: 'GITHUB_ERROR', message } } })
  }
})
