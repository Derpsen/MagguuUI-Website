/**
 * GET /api/v1/status — public, coarse site status for /status.
 *
 * Minimal on purpose (see utils/publicStatus.ts): component states, a
 * last-checked time, uptime percentages once enough self-samples exist, and
 * notices (none yet, item B). Built from the same checks as /api/health but a
 * separate payload: no SHA, build time, uptime seconds or version. Cached in
 * memory for 45 s, so the database is touched at most once per window however
 * often this is called. Always 200: the state is in the body.
 */

import { sqlite } from '~/server/database'
import { getPublicStatus } from '~/server/utils/siteStatus'

export default defineEventHandler((event) => {
  setResponseHeader(event, 'Cache-Control', 'public, max-age=30')
  return apiSuccess(getPublicStatus(sqlite))
})
