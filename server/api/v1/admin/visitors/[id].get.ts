/** GET /api/v1/admin/visitors/:id: page sequence and clicks of one consented session (admin only, no-store). */
import { sqlite } from '~/server/database'
import { visitorLogEnabled } from '../../../../../utils/consent'
import { handleVisitorDetail } from '../../../../utils/visitorAdminRequest'

export default defineEventHandler(event => handleVisitorDetail(event, {
  requireAdmin,
  sqlite,
  enabled: () => visitorLogEnabled(process.env.NUXT_VISITOR_LOG),
  audit: () => {},
}))
