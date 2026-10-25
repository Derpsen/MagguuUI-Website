/** GET /api/v1/admin/visitors: consented visitor sessions (admin only, no-store). See server/utils/visitorAdminRequest.ts. */
import { sqlite } from '~/server/database'
import { visitorLogEnabled } from '../../../../../utils/consent'
import { handleVisitorList } from '../../../../utils/visitorAdminRequest'

export default defineEventHandler(event => handleVisitorList(event, {
  requireAdmin: requireAdminNoViewer,
  sqlite,
  enabled: () => visitorLogEnabled(process.env.NUXT_VISITOR_LOG),
  audit: () => {},
}))
