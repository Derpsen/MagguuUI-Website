/**
 * Single source of truth for addon syncing.
 *
 * Used by:
 *   - server/plugins/init.ts (one-time seed + optional resync)
 *   - server/api/v1/webhooks/github.post.ts (when MagguuUI.toc changes)
 *   - server/api/v1/admin/addons/resync.post.ts (admin manual trigger)
 *
 * Behavior:
 *   - INSERTs addons that don't yet exist (full metadata defaults).
 *   - UPDATEs `category`, `tocName`, `isAvailable`, `lastSyncedAt` only —
 *     leaves admin-edited fields (description, emoji, url, name, sortOrder,
 *     isVisible) intact.
 *   - Marks addons that disappeared from the .toc as `isAvailable=false`
 *     instead of deleting (admin can hide or restore later).
 *   - Manual-only metadata entries (no tocName) are seeded once if missing
 *     and never marked unavailable by .toc syncs.
 */

import { eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { addons } from '~/server/database/schema'
import { ADDON_DEFAULTS, deriveSlugFromTocName, findAddonDefaultByTocName } from '~/server/database/addonMetadata'
import { parseAddonToc, type TocAddonRef } from '~/server/utils/parseAddonToc'

export interface SyncAddonsResult {
  inserted: number
  updated: number
  unavailable: number
  total: number
}

export function syncAddonsFromToc(tocContent: string): SyncAddonsResult {
  const refs = parseAddonToc(tocContent)
  return applyAddonSync(refs)
}

/**
 * Initial seed: ensures every metadata default exists in the DB even before
 * the .toc has ever been parsed (covers Blizzard EditMode + cold-start case).
 */
export function ensureAddonsSeeded(): SyncAddonsResult {
  const existing = db.select().from(addons).all()
  const bySlug = new Map(existing.map(row => [row.slug, row]))
  const now = new Date()
  let inserted = 0

  for (const def of ADDON_DEFAULTS) {
    if (bySlug.has(def.slug)) continue
    db.insert(addons).values({
      slug: def.slug,
      tocName: def.tocName ?? null,
      name: def.name,
      category: def.category,
      emoji: def.emoji ?? null,
      description: def.description ?? null,
      url: def.url ?? null,
      sortOrder: def.sortOrder,
      isVisible: def.isVisible ?? true,
      isAvailable: true,
      source: def.tocName ? 'toc' : 'manual',
      lastSyncedAt: def.tocName ? now : null,
    }).run()
    inserted++
  }

  return { inserted, updated: 0, unavailable: 0, total: ADDON_DEFAULTS.length }
}

function applyAddonSync(refs: TocAddonRef[]): SyncAddonsResult {
  const now = new Date()
  let inserted = 0
  let updated = 0
  let unavailable = 0

  const existing = db.select().from(addons).all()
  const bySlug = new Map(existing.map(row => [row.slug, row]))

  // Track which slugs the .toc covers — we mark missing ones unavailable.
  const seenSlugs = new Set<string>()

  for (const ref of refs) {
    const def = findAddonDefaultByTocName(ref.tocName)
    const slug = def?.slug ?? deriveSlugFromTocName(ref.tocName)
    seenSlugs.add(slug)

    const row = bySlug.get(slug)
    const category = ref.required ? 'required' : (def?.category ?? 'optional')

    if (!row) {
      db.insert(addons).values({
        slug,
        tocName: ref.tocName,
        name: def?.name ?? ref.tocName,
        category,
        emoji: def?.emoji ?? null,
        description: def?.description ?? null,
        url: def?.url ?? null,
        sortOrder: def?.sortOrder ?? 99,
        isVisible: def?.isVisible ?? !ref.isLibrary,
        isAvailable: true,
        source: 'toc',
        lastSyncedAt: now,
      }).run()
      inserted++
      continue
    }

    // Only refresh fields that the .toc owns. Leave content alone.
    const needsUpdate =
      row.tocName !== ref.tocName
      || row.category !== category
      || !row.isAvailable
      || row.source !== (row.source === 'manual' ? 'manual' : 'toc')

    if (needsUpdate) {
      db.update(addons)
        .set({
          tocName: ref.tocName,
          category,
          isAvailable: true,
          source: row.source === 'manual' ? 'manual' : 'toc',
          lastSyncedAt: now,
          updatedAt: now,
        })
        .where(eq(addons.id, row.id))
        .run()
      updated++
    } else if (row.lastSyncedAt?.getTime() !== now.getTime()) {
      // Touch lastSyncedAt only — no audit-noise update bump.
      db.update(addons)
        .set({ lastSyncedAt: now })
        .where(eq(addons.id, row.id))
        .run()
    }
  }

  // Mark addons that vanished from the .toc as unavailable, but only the ones
  // that came from the .toc to begin with. Manual entries are protected.
  for (const row of existing) {
    if (seenSlugs.has(row.slug)) continue
    if (row.source === 'manual') continue
    if (!row.isAvailable) continue
    db.update(addons)
      .set({ isAvailable: false, updatedAt: now })
      .where(eq(addons.id, row.id))
      .run()
    unavailable++
  }

  return { inserted, updated, unavailable, total: refs.length }
}
