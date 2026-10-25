/**
 * GET /api/v1/profile-previews
 *
 * Public: visible addons that have at least one visible MagguuUI profile, the
 * real profile names, and the preview image when public/previews/<slug>.<ext>
 * exists (otherwise `image: null` and the page shows a placeholder).
 */

import { and, asc, eq } from 'drizzle-orm'
import { db } from '~/server/database'
import { addons } from '~/server/database/schema'
import { readGroupedProfileIndex } from '~/server/utils/profileReadModels'
import { buildProfilePreviews } from '~/server/utils/profilePreviews'
import { listPreviewFiles } from '~/server/utils/previewFiles'

export default defineEventHandler(() => {
  const rows = db.select({
    slug: addons.slug,
    name: addons.name,
    category: addons.category,
    description: addons.description,
    sortOrder: addons.sortOrder,
  }).from(addons)
    .where(and(eq(addons.isVisible, true), eq(addons.isAvailable, true)))
    .orderBy(asc(addons.category), asc(addons.sortOrder), asc(addons.name))
    .all()

  const grouped = readGroupedProfileIndex().data
  const names: Record<string, string[]> = {}
  for (const [addon, list] of Object.entries(grouped)) names[addon] = list.map(p => p.profile)

  const items = buildProfilePreviews(rows, names, listPreviewFiles())
  return apiSuccess(items, { total: items.length, withImage: items.filter(i => i.image).length })
})
