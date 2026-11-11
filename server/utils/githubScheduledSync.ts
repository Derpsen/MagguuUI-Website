/**
 * Nightly GitHub release check + addon catalogue sync, plus persistence of
 * the last scheduled run for the admin GitHub page. Reasons never include secrets.
 */

import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { settings, syncHistory } from '~/server/database/schema'
import { logActivity } from '~/server/utils/activityLog'
import { checkLatestRelease, githubRepoCredentials, githubSyncFailureHint, resyncAddonsFromToc } from '~/server/utils/githubAddonSync'
import { githubRateLimitSkipReason, shouldSkipGithubCall } from '~/server/utils/githubRateLimit'
import { withGithubSyncLock } from '~/server/utils/githubSyncLock'
import { upsertSetting } from '~/server/utils/settings'

export const GITHUB_SCHEDULED_AT_KEY = 'github_scheduled_last_at'
export const GITHUB_SCHEDULED_STATUS_KEY = 'github_scheduled_last_status'
export const GITHUB_SCHEDULED_REASON_KEY = 'github_scheduled_last_reason'

export type ScheduledGithubStatus = 'ok' | 'error' | 'skipped'
export interface ScheduledGithubRun {
  at: string
  status: ScheduledGithubStatus
  reason: string
}

const TOKEN_RE = /gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|Bearer\s+\S+/gi

export function sanitizeGithubRunReason(reason: string): string {
  let s = reason.replace(TOKEN_RE, '[redacted]')
  s = s.replace(/Authorization:\s*\S+/gi, 'Authorization: [redacted]')
  s = s.replace(/([?&](?:token|access_token|secret)=)[^&\s]+/gi, '$1[redacted]')
  return s.replace(/\s+/g, ' ').trim().slice(0, 200)
}

export function scheduledRunFromSettings(values: { at?: string | null, status?: string | null, reason?: string | null }): ScheduledGithubRun | null {
  const at = values.at?.trim()
  const status = values.status?.trim()
  if (!at || (status !== 'ok' && status !== 'error' && status !== 'skipped')) return null
  return { at, status, reason: sanitizeGithubRunReason(values.reason || '') }
}

export function recordScheduledGithubRun(status: ScheduledGithubStatus, reason: string, at = new Date().toISOString()): ScheduledGithubRun {
  const run: ScheduledGithubRun = { at, status, reason: sanitizeGithubRunReason(reason) }
  upsertSetting(GITHUB_SCHEDULED_AT_KEY, run.at)
  upsertSetting(GITHUB_SCHEDULED_STATUS_KEY, run.status)
  upsertSetting(GITHUB_SCHEDULED_REASON_KEY, run.reason)
  db.insert(syncHistory).values({
    triggerSource: 'scheduled-nightly',
    status: run.status === 'ok' ? 'success' : run.status,
    details: run.reason,
  }).run()
  logActivity({
    action: 'updated',
    entityType: 'setting',
    entityName: 'Scheduled GitHub sync',
    details: `${run.status}: ${run.reason}`,
  })
  return run
}

export function readScheduledGithubRun(): ScheduledGithubRun | null {
  const at = db.select().from(settings).where(eq(settings.key, GITHUB_SCHEDULED_AT_KEY)).get()?.value
  const status = db.select().from(settings).where(eq(settings.key, GITHUB_SCHEDULED_STATUS_KEY)).get()?.value
  const reason = db.select().from(settings).where(eq(settings.key, GITHUB_SCHEDULED_REASON_KEY)).get()?.value
  return scheduledRunFromSettings({ at, status, reason })
}

export async function runScheduledGithubSync(): Promise<ScheduledGithubRun> {
  const creds = githubRepoCredentials()
  if ('error' in creds) {
    return recordScheduledGithubRun('skipped', creds.error)
  }

  const locked = await withGithubSyncLock(async () => {
    if (shouldSkipGithubCall()) {
      return recordScheduledGithubRun('skipped', githubRateLimitSkipReason())
    }
    try {
      const release = await checkLatestRelease()
      const catalog = await resyncAddonsFromToc('scheduled-nightly')
      return recordScheduledGithubRun(
        'ok',
        `Release ${release.latestVersion}; catalogue inserted=${catalog.inserted}, updated=${catalog.updated}, removed=${catalog.unavailable}`,
      )
    } catch (err: unknown) {
      const hint = githubSyncFailureHint(err, 'Scheduled GitHub sync failed')
      return recordScheduledGithubRun('error', hint.message)
    }
  })
  if (!locked.ok) return recordScheduledGithubRun('skipped', 'Already running')
  return locked.value
}
