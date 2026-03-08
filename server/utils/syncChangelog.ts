/**
 * Auto-Changelog Generator
 *
 * Creates a public changelog entry after successful sync operations.
 * Summarizes what was updated in a user-friendly format.
 */

import { db } from '~/server/database'
import { changelogs } from '~/server/database/schema'

interface SyncResult {
  file: string
  addon: string
  status: string
}

export function createSyncChangelog(results: SyncResult[], source: 'pull' | 'webhook') {
  const created = results.filter(r => r.status === 'created')
  const updated = results.filter(r => r.status === 'updated')
  const changed = [...created, ...updated]

  // Nothing changed → no changelog
  if (changed.length === 0) return

  // ── Categorize changes ─────────────────────────
  const addonChanges: string[] = []
  const wowupChanges: string[] = []
  const classChanges: string[] = []

  for (const r of changed) {
    if (r.file.includes('Classes/')) {
      classChanges.push(r.addon)
    } else if (r.addon.startsWith('WowUp')) {
      wowupChanges.push(r.addon.replace('WowUp/', ''))
    } else {
      // Clean up addon name: "ElvUI/profile" → "ElvUI"
      const name = r.addon.includes('/') ? r.addon.split('/')[0] : r.addon
      if (!addonChanges.includes(name)) {
        addonChanges.push(name)
      }
    }
  }

  // ── Build public changelog (user-friendly) ─────
  const lines: string[] = []

  if (addonChanges.length > 0) {
    lines.push(`- 🎨 **Addon Profiles**: ${addonChanges.join(', ')} updated`)
  }
  if (classChanges.length > 0) {
    lines.push(`- ⚔️ **Class Layouts**: ${classChanges.join(', ')} updated`)
  }
  if (wowupChanges.length > 0) {
    lines.push(`- 📦 **WowUp Strings**: ${wowupChanges.join(', ')} updated`)
  }

  const content = lines.join('\n')

  // ── Get today's date as version label ──────────
  const now = new Date()
  const dateStr = now.toISOString().split('T')[0]
  const version = `Sync ${dateStr}`

  // ── Insert changelog entry ─────────────────────
  db.insert(changelogs).values({
    version,
    content,
    contentEn: content,
    isPublished: true,
    publishedAt: now,
  }).run()
}
