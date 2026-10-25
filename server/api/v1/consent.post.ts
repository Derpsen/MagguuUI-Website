/**
 * POST /api/v1/consent — the visitor's choice from the cookie banner (see server/utils/consentRequest.ts).
 * Only ever called after a click. Off (204, no cookie) unless NUXT_VISITOR_LOG is set.
 */
import { sqlite } from '~/server/database'
import { visitorLogEnabled } from '../../../utils/consent'
import { deleteVisitorRecords } from '~/server/utils/visitorLog'

export default defineEventHandler(event => handleConsentChange(event, {
  enabled: () => visitorLogEnabled(process.env.NUXT_VISITOR_LOG),
  allow: e => checkRateLimit(`consent:${anonymousRateKey(dailySalt.get(), getClientIp(e))}`, 30, 60_000, 60_000).allowed,
  deleteRecords: ids => deleteVisitorRecords(sqlite, ids),
}))
