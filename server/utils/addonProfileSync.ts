/**
 * Shared DB upserts for both manual GitHub pulls and signed webhooks.
 * Parsing stays in addonProfileLua.ts; this module is the only place that
 * translates the parsed file contract into website rows.
 */

import { and, eq } from 'drizzle-orm'
import { db, sqlite } from '~/server/database'
import { profiles, wowupStrings } from '~/server/database/schema'
import {
  ELVUI_PACKED_PREFIX,
  parseAddonProfileLua,
  parseSafeAddonLuaPath,
  parseWowUpLua,
  type ParsedAddonProfileEntry,
} from '~/server/utils/addonProfileLua'

export type AddonProfileSyncStatus = 'created' | 'updated' | 'unchanged'

export interface AddonProfileSyncChange {
  addon: string
  profile: string
  variable: string
  status: AddonProfileSyncStatus
}

export interface AddonProfileFileSyncResult {
  addon: string
  format: 'single' | 'packed-elvui' | 'legacy-elvui'
  changes: AddonProfileSyncChange[]
  removedPackedDefault: boolean
}

export interface WowUpFileSyncResult {
  changes: Array<{
    name: 'Required' | 'Optional'
    status: AddonProfileSyncStatus
  }>
}

export function validateAddonProfileFile(path: string, source: string) {
  const descriptor = parseSafeAddonLuaPath(path)
  return descriptor.isWowUp
    ? { kind: 'wowup' as const, parsed: parseWowUpLua(path, source) }
    : { kind: 'profile' as const, parsed: parseAddonProfileLua(path, source) }
}

export function syncAddonProfileFile(path: string, source: string): AddonProfileFileSyncResult {
  const validated = validateAddonProfileFile(path, source)
  if (validated.kind !== 'profile') throw new Error('WowUp.lua must be synchronized with syncWowUpFile()')
  const parsed = validated.parsed
  const result = sqlite.transaction(() => {
    const changes = parsed.entries.map(entry => ({
      addon: parsed.addon,
      profile: entry.profile,
      variable: entry.variable,
      status: upsertProfile(parsed.addon, entry),
    }))
    return {
      changes,
      removedPackedDefault: parsed.addon.toLowerCase() === 'elvui'
        ? removeObsoletePackedElvUiDefault()
        : false,
    }
  })()

  return { addon: parsed.addon, format: parsed.format, ...result }
}

export function syncWowUpFile(path: string, source: string): WowUpFileSyncResult {
  const validated = validateAddonProfileFile(path, source)
  if (validated.kind !== 'wowup') throw new Error('Only WowUp.lua can be synchronized with syncWowUpFile()')
  const parsed = validated.parsed
  const entries: Array<{ name: 'Required' | 'Optional', string: string }> = [
    { name: 'Required', string: parsed.required },
    { name: 'Optional', string: parsed.optional },
  ]

  const changes = sqlite.transaction(() => entries.map(entry => ({
    name: entry.name,
    status: upsertWowUp(entry.name, entry.string),
  })))()

  return { changes }
}

function upsertProfile(addon: string, entry: ParsedAddonProfileEntry): AddonProfileSyncStatus {
  const existing = db.select().from(profiles)
    .where(and(eq(profiles.addon, addon), eq(profiles.profile, entry.profile)))
    .get()

  if (existing) {
    const visibilityChanged = entry.isVisible !== undefined && existing.isVisible !== entry.isVisible
    if (existing.string === entry.string && !visibilityChanged) return 'unchanged'
    db.update(profiles)
      .set({
        string: entry.string,
        ...(entry.isVisible === undefined ? {} : { isVisible: entry.isVisible }),
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, existing.id))
      .run()
    return 'updated'
  }

  db.insert(profiles).values({
    addon,
    profile: entry.profile,
    string: entry.string,
    description: `${addon} - ${entry.profile}`,
    sortOrder: 0,
    isVisible: entry.isVisible ?? true,
  }).run()
  return 'created'
}

function removeObsoletePackedElvUiDefault() {
  const existing = db.select().from(profiles)
    .where(and(eq(profiles.addon, 'ElvUI'), eq(profiles.profile, 'Default')))
    .get()
  if (!existing?.string.startsWith(ELVUI_PACKED_PREFIX)) return false

  db.delete(profiles).where(eq(profiles.id, existing.id)).run()
  return true
}

function upsertWowUp(name: 'Required' | 'Optional', string: string): AddonProfileSyncStatus {
  const existing = db.select().from(wowupStrings)
    .where(eq(wowupStrings.name, name))
    .get()

  if (existing) {
    if (existing.string === string) return 'unchanged'
    db.update(wowupStrings)
      .set({ string, updatedAt: new Date() })
      .where(eq(wowupStrings.id, existing.id))
      .run()
    return 'updated'
  }

  db.insert(wowupStrings).values({
    name,
    string,
    description: `WowUp ${name}`,
    sortOrder: name === 'Required' ? 0 : 1,
    isVisible: true,
  }).run()
  return 'created'
}
