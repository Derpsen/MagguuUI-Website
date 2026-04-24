/**
 * POST /api/v1/admin/addons/resync
 *
 * Manually re-pull MagguuUI.toc from GitHub and run the addon sync.
 * Useful when the webhook missed an event (e.g. server downtime) or the admin
 * wants to verify the auto-sync without pushing a commit.
 */

import { db } from '~/server/database'
import { syncHistory } from '~/server/database/schema'
import { syncAddonsFromToc } from '~/server/utils/syncAddons'

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const token = (config.githubToken as string | undefined) || ''
  const [owner, repo] = (config.githubRepo || 'Derpsen/MagguuUI').split('/')
  if (!owner || !repo) {
    throw createError({ statusCode: 500, message: 'GitHub repo not configured' })
  }

  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/MagguuUI.toc`
  const headers: Record<string, string> = { 'User-Agent': 'MagguuUI-WebAdmin' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  try {
    const tocContent = await $fetch<string>(rawUrl, { headers, timeout: 15000 })
    const result = syncAddonsFromToc(tocContent)

    db.insert(syncHistory).values({
      triggerSource: 'admin-toc-resync',
      status: 'success',
      details: `Inserted ${result.inserted}, updated ${result.updated}, removed ${result.unavailable} (toc deps: ${result.total})`,
    }).run()

    logActivity({
      action: 'updated',
      entityType: 'addon',
      entityName: `Resynced ${result.total} addons from .toc`,
      details: `inserted=${result.inserted}, updated=${result.updated}, removed=${result.unavailable}`,
    })
    return apiSuccess(result)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    db.insert(syncHistory).values({
      triggerSource: 'admin-toc-resync',
      status: 'error',
      details: msg,
    }).run()
    throw createError({ statusCode: 502, message: `TOC fetch failed: ${msg}` })
  }
})
