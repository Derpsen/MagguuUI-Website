/**
 * GitHub Utilities
 *
 * Trigger GitHub Actions workflows via Repository Dispatch.
 * Uses debounce to batch rapid edits into a single sync.
 * Default: waits 10 seconds after the last change before triggering.
 */

import { db } from '~/server/database'
import { syncHistory } from '~/server/database/schema'

const DEBOUNCE_MS = 10_000 // 10 seconds

// Module-level state (persists across requests in the same process)
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let pendingReasons: string[] = []

/**
 * Queue a GitHub sync. The actual dispatch is debounced —
 * it only fires after DEBOUNCE_MS of inactivity.
 *
 * Every call resets the timer. Reasons are collected and
 * sent together in one dispatch when the timer finally fires.
 */
export async function triggerGitHubSync(reason: string = 'admin-update') {
  pendingReasons.push(reason)

  // Clear existing timer
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  // Set new timer
  debounceTimer = setTimeout(() => {
    const reasons = [...pendingReasons]
    pendingReasons = []
    debounceTimer = null
    doGitHubDispatch(reasons).catch((err) => {
      console.error('[GitHub] Debounced dispatch failed:', err?.message || err)
    })
  }, DEBOUNCE_MS)

  console.log(`[GitHub] Sync queued (${pendingReasons.length} pending, fires in ${DEBOUNCE_MS / 1000}s): ${reason}`)
  return { triggered: false, queued: true, pending: pendingReasons.length, reason }
}

/**
 * Actually send the repository dispatch to GitHub.
 * Called after the debounce timer expires.
 */
async function doGitHubDispatch(reasons: string[]) {
  const config = useRuntimeConfig()

  if (!config.githubToken || !config.githubRepo) {
    console.warn('[GitHub] Token or repo not configured, skipping sync')
    return
  }

  const [owner, repo] = config.githubRepo.split('/')
  const combinedReason = reasons.length === 1
    ? reasons[0]
    : `batch: ${reasons.length} changes`

  try {
    await $fetch(`https://api.github.com/repos/${owner}/${repo}/dispatches`, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${config.githubToken}`,
      },
      body: {
        event_type: 'profile-sync',
        client_payload: {
          reason: combinedReason,
          changes: reasons,
          timestamp: new Date().toISOString(),
        },
      },
    })

    console.log(`[GitHub] Sync dispatched: ${combinedReason}`)

    // Log to sync history
    try {
      db.insert(syncHistory).values({
        triggerSource: 'auto-sync',
        status: 'success',
        details: reasons.length === 1
          ? reasons[0]
          : `Batch sync: ${reasons.join(', ')}`,
      }).run()
    } catch { /* logging is best-effort */ }
  } catch (err: any) {
    console.error(`[GitHub] Sync dispatch failed:`, err?.message || err)

    try {
      db.insert(syncHistory).values({
        triggerSource: 'auto-sync',
        status: 'error',
        details: `Failed: ${err?.message || 'unknown'} — Changes: ${reasons.join(', ')}`,
      }).run()
    } catch { /* logging is best-effort */ }
  }
}
