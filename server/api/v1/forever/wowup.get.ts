/**
 * GET /api/v1/forever/wowup
 * The MagguuUI x Forever WowUp collection string from the Forever repo, or null while it
 * is not readable. Public and read-only; see server/utils/foreverReleaseSource.ts.
 */
import { getForeverWowup } from '~/server/utils/foreverReleaseSource'

export default defineEventHandler(async () => {
  return apiSuccess(await getForeverWowup())
})
