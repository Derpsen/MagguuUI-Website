/** Shared read models for public projections and authenticated addon sync. */

import { and, asc, count, desc, eq, like, sql } from 'drizzle-orm'
import { db } from '~/server/database'
import { characterLayouts, changelogs, profiles, wowupStrings } from '~/server/database/schema'
import { ELVUI_PACKED_PREFIX } from '~/server/utils/addonProfileLua'

interface ReadOptions {
  includeHidden?: boolean
}

export function readGroupedProfiles(options: ReadOptions & { addon?: string } = {}) {
  const visibility = options.includeHidden ? undefined : eq(profiles.isVisible, true)
  const addonFilter = options.addon ? eq(profiles.addon, options.addon) : undefined
  const rows = db.select().from(profiles)
    .where(and(visibility, addonFilter))
    .orderBy(asc(profiles.sortOrder), asc(profiles.addon), asc(profiles.profile), asc(profiles.id))
    .all()

  // A packed ElvUI/Default row belongs to the retired website contract. New
  // imports expand it into four components plus hidden UI scale; never emit a
  // stale packed row from either the public or canonical sync projections.
  const projectedRows = rows.filter(row => !isObsoletePackedElvUiDefault(row))
  const grouped: Record<string, Array<{
    id: number
    profile: string
    string: string
    description: string | null
    updatedAt: Date
  }>> = {}
  for (const row of projectedRows) {
    const addon = grouped[row.addon] ?? (grouped[row.addon] = [])
    addon.push({
      id: row.id,
      profile: row.profile,
      string: row.string,
      description: row.description,
      updatedAt: row.updatedAt,
    })
  }
  return { data: grouped, count: projectedRows.length }
}

export function readWowUpMap(options: ReadOptions = {}) {
  const rows = db.select().from(wowupStrings)
    .where(options.includeHidden ? undefined : eq(wowupStrings.isVisible, true))
    .orderBy(asc(wowupStrings.sortOrder), asc(wowupStrings.name), asc(wowupStrings.id))
    .all()

  const keyed: Record<string, {
    id: number
    string: string
    description: string | null
    updatedAt: Date
  }> = {}
  for (const row of rows) {
    keyed[row.name] = {
      id: row.id,
      string: row.string,
      description: row.description,
      updatedAt: row.updatedAt,
    }
  }
  return { data: keyed, count: rows.length }
}

export function readGroupedLayouts(options: ReadOptions & { requireUnique?: boolean } = {}) {
  const rows = db.select().from(characterLayouts)
    .where(options.includeHidden ? undefined : eq(characterLayouts.isVisible, true))
    .orderBy(
      asc(characterLayouts.className),
      asc(characterLayouts.sortOrder),
      asc(characterLayouts.spec),
      asc(characterLayouts.id),
    )
    .all()

  const grouped: Record<string, Array<{
    id: number
    spec: string | null
    importString: string | null
    sortOrder: number
    description: string | null
    updatedAt: Date
  }>> = {}
  const seen = new Set<string>()
  for (const row of rows) {
    const className = row.className || 'Unknown'
    if (options.requireUnique) {
      const key = `${normalizeContractName(className)}\0${normalizeContractName(row.spec || '')}`
      if (seen.has(key)) {
        throw createError({
          statusCode: 409,
          message: `Duplicate canonical class layout: ${className}/${row.spec || '(missing spec)'}`,
        })
      }
      seen.add(key)
    }

    const classLayouts = grouped[className] ?? (grouped[className] = [])
    classLayouts.push({
      id: row.id,
      spec: row.spec,
      importString: row.importString,
      sortOrder: row.sortOrder,
      description: row.description,
      updatedAt: row.updatedAt,
    })
  }
  return { data: grouped, count: rows.length, classes: Object.keys(grouped).length }
}

function normalizeContractName(value: string) {
  return value.normalize('NFKC').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function isObsoletePackedElvUiDefault(row: typeof profiles.$inferSelect) {
  return row.addon.toLowerCase() === 'elvui'
    && row.profile.toLowerCase() === 'default'
    && row.string.startsWith(ELVUI_PACKED_PREFIX)
}

/** Homepage stats: names + counts without import-string blobs. */
export function readCatalogSummary() {
  const packedElvUiDefault = db
    .select({ id: profiles.id })
    .from(profiles)
    .where(and(
      eq(profiles.isVisible, true),
      sql`lower(${profiles.addon}) = 'elvui'`,
      sql`lower(${profiles.profile}) = 'default'`,
      like(profiles.string, `${ELVUI_PACKED_PREFIX}%`),
    ))
    .get()

  const profileRows = db
    .select({ addon: profiles.addon, profile: profiles.profile })
    .from(profiles)
    .where(eq(profiles.isVisible, true))
    .orderBy(asc(profiles.sortOrder), asc(profiles.addon), asc(profiles.profile), asc(profiles.id))
    .all()

  const projected = packedElvUiDefault
    ? profileRows.filter(row => row.addon.toLowerCase() !== 'elvui' || row.profile.toLowerCase() !== 'default')
    : profileRows

  const addonNames: string[] = []
  const seen = new Set<string>()
  for (const row of projected) {
    if (seen.has(row.addon)) continue
    seen.add(row.addon)
    addonNames.push(row.addon)
  }

  const layoutCount = db
    .select({ n: count() })
    .from(characterLayouts)
    .where(eq(characterLayouts.isVisible, true))
    .get()?.n ?? 0

  const wowupCount = db
    .select({ n: count() })
    .from(wowupStrings)
    .where(eq(wowupStrings.isVisible, true))
    .get()?.n ?? 0

  const latestChangelog = db
    .select({ id: changelogs.id })
    .from(changelogs)
    .where(and(
      eq(changelogs.isPublished, true),
      like(changelogs.version, 'v%'),
    ))
    .orderBy(desc(changelogs.publishedAt))
    .limit(1)
    .get()

  return {
    addonNames,
    profileCount: projected.length,
    layoutCount: Number(layoutCount),
    wowupCount: Number(wowupCount),
    changelogCount: latestChangelog ? 1 : 0,
  }
}
