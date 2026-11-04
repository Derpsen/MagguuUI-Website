/**
 * GET /api/v1/forever/release
 * Newest MagguuUI x Forever release, or null while none is published (or GitHub
 * is unreachable). Public and read-only; see server/utils/foreverReleaseSource.ts.
 */
import { getForeverRelease } from '~/server/utils/foreverReleaseSource'

export default defineEventHandler(async () => {
  return apiSuccess(await getForeverRelease())
})
