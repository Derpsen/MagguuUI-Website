/**
 * POST /api/v1/visitor-hit — detailed visitor record, ONLY with the visitor's statistics consent
 * (verified here from the consent cookie) and only while NUXT_VISITOR_LOG is set.
 * Separate from /api/v1/page-view, which stays the cookieless anonymous counter. Always 204.
 */
import { sqlite } from '~/server/database'
import { visitorLogEnabled } from '../../../utils/consent'
import { parseBrowser, parseDeviceType, parseOS } from '~/server/utils/session'
import { isPageViewTrackingEnabled } from '~/server/utils/settings'
import { deleteVisitorRecords, recordVisitorHit } from '~/server/utils/visitorLog'

export default defineEventHandler(event => handleVisitorHit(event, {
  enabled: () => visitorLogEnabled(process.env.NUXT_VISITOR_LOG) && isPageViewTrackingEnabled(),
  gate: e => beaconGate(e, 'visitor-hit', 120),
  parseUa: ua => ({ browser: parseBrowser(ua), os: parseOS(ua), device: parseDeviceType(ua) }),
  country: getClientCountry,
  city: getClientCity,
  record: input => recordVisitorHit(sqlite, input),
  deleteRecords: ids => deleteVisitorRecords(sqlite, ids),
}))
