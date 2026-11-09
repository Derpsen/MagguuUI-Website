/**
 * GET /api/v1/forever/wowup
 * Forever WowUp starter + optional packs from MagguuUI Camelot (or null while unread).
 * Public and read-only; see server/utils/foreverReleaseSource.ts.
 */
import { getForeverWowup } from '~/server/utils/foreverReleaseSource'

export default defineEventHandler(async () => {
  return apiSuccess(await getForeverWowup())
})
