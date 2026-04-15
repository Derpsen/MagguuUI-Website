/**
 * Activity Log Utility
 *
 * Logs admin actions and creates auto-changelog entries.
 */

import { db } from '~/server/database'
import { activityLog, changelogs } from '~/server/database/schema'
import { desc, eq } from 'drizzle-orm'

interface LogOptions {
  action: 'created' | 'updated' | 'deleted'
  entityType:
    | 'profile'
    | 'wowup'
    | 'layout'
    | 'changelog'
    | 'content'
    | 'faq'
    | 'user'
    | 'api-key'
    | 'field'
    | 'setting'
  entityId?: number
  entityName: string
  details?: Record<string, unknown> | string
  userId?: number
  autoChangelog?: boolean
}

export function logActivity(opts: LogOptions) {
  try {
    db.insert(activityLog).values({
      action: opts.action,
      entityType: opts.entityType,
      entityId: opts.entityId ?? null,
      entityName: opts.entityName,
      details: typeof opts.details === 'string' ? opts.details : opts.details ? JSON.stringify(opts.details) : null,
      userId: opts.userId ?? null,
    }).run()

    if (opts.autoChangelog && ['profile', 'wowup', 'layout'].includes(opts.entityType)) {
      createAutoChangelog(opts)
    }
  } catch (e) {
    console.error('[ActivityLog] Error:', e)
  }
}

function createAutoChangelog(opts: LogOptions) {
  const actionLabels: Record<string, string> = {
    created: 'added',
    updated: 'updated',
    deleted: 'removed',
  }
  const typeLabels: Record<string, string> = {
    profile: 'Addon Profile',
    wowup: 'WowUp String',
    layout: 'Character Layout',
  }

  const action = actionLabels[opts.action] || opts.action
  const type = typeLabels[opts.entityType] || opts.entityType
  const line = `- **${type}:** ${opts.entityName} ${action}`

  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]

  // Find the latest auto-changelog entry
  const latest = db.select().from(changelogs)
    .where(eq(changelogs.version, 'auto'))
    .orderBy(desc(changelogs.createdAt))
    .limit(1)
    .get()

  // Check if the latest auto-entry is from TODAY
  const latestDateStr = latest?.createdAt
    ? new Date((latest.createdAt as number) * 1000).toISOString().split('T')[0]
    : null

  if (latest && latestDateStr === todayStr) {
    // Append to today's entry (strip old ### Changes header if present)
    const existing = (latest.content || '').replace(/^###\s+Changes\s+\d{4}-\d{2}-\d{2}\s*/gm, '').trim()
    const updated = existing ? existing + '\n' + line : line
    db.update(changelogs)
      .set({ content: updated, contentEn: updated, updatedAt: now })
      .where(eq(changelogs.id, latest.id))
      .run()
  } else {
    // Create new entry for today (no header — date comes from publishedAt)
    db.insert(changelogs).values({
      version: 'auto',
      content: line,
      contentEn: line,
      isPublished: true,
      publishedAt: now,
    }).run()
  }
}
