/**
 * POST /api/v1/visitor-event — dwell time, scroll depth and clicks of an existing consented visit
 * (see server/utils/consentRequest.ts). Needs consent + the session cookie, never starts a session. Always 204.
 */
import { sqlite } from '~/server/database'
import { visitorLogEnabled } from '../../../utils/consent'
import { isPageViewTrackingEnabled } from '~/server/utils/settings'
import { recordVisitorEvent } from '~/server/utils/visitorLog'

export default defineEventHandler(event => handleVisitorEvent(event, {
  enabled: () => visitorLogEnabled(process.env.NUXT_VISITOR_LOG) && isPageViewTrackingEnabled(),
  gate: e => beaconGate(e, 'visitor-event', 240),
  record: (sid, ev) => recordVisitorEvent(sqlite, sid, ev),
}))
