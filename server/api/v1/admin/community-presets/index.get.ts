/**
 * GET /api/v1/admin/community-presets[?status=pending|approved|rejected]
 *
 * The moderation queue (pending first) with status counts. Strings are shortened here;
 * the full text is `/:id`.
 */
import { sqlite } from '~/server/database'
import { listAdminPresets, presetCounts } from '~/server/utils/communityPresets'

export default defineEventHandler((event) => {
  requireAdminAccess(event)
  const status = String(getQuery(event).status ?? '')
  return apiSuccess({ items: listAdminPresets(sqlite, status), counts: presetCounts(sqlite) })
})
