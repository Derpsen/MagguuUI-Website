/**
 * GET /api/v1/configurator
 *
 * Public data behind /configurator: addon catalogue (visible + available),
 * visible profile ids and names, and the published Starter/Optional WowUp
 * collections with the addons they contain. No import strings.
 */

import { and, asc, eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { addons } from '~/server/database/schema'
import { readGroupedProfileIndex, readWowUpIndex } from '~/server/utils/profileReadModels'
import { buildConfiguratorData } from '~/server/utils/configuratorData'

export default defineEventHandler(() => {
  const rows = db.select({
    slug: addons.slug,
    name: addons.name,
    category: addons.category,
    url: addons.url,
    sortOrder: addons.sortOrder,
  }).from(addons)
    .where(and(eq(addons.isVisible, true), eq(addons.isAvailable, true)))
    .orderBy(asc(addons.category), asc(addons.sortOrder), asc(addons.name))
    .all()

  const profilesByKey = readGroupedProfileIndex().data
  const packs: Record<string, { id: number, addonNames: string[] }> = {}
  for (const [name, pack] of Object.entries(readWowUpIndex().data)) packs[name] = { id: pack.id, addonNames: pack.addonNames }

  return apiSuccess(buildConfiguratorData(rows, profilesByKey, packs))
})
