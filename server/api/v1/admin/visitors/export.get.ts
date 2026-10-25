/** GET /api/v1/admin/visitors/export: CSV of the filtered view (admin only, no-store, max 50,000 rows, audited without payload). */
import { sqlite } from '~/server/database'
import { visitorLogEnabled } from '../../../../../utils/consent'
import { recordAuditSafe } from '~/server/utils/auditLog'
import { handleVisitorExport } from '../../../../utils/visitorAdminRequest'

export default defineEventHandler(event => handleVisitorExport(event, {
  requireAdmin: requireAdminNoViewer,
  sqlite,
  enabled: () => visitorLogEnabled(process.env.NUXT_VISITOR_LOG),
  audit: ({ userId, rows, filters }) => {
    recordAuditSafe(sqlite, {
      action: 'exported', entityType: 'visitor_export', entityName: `Visitor CSV, ${rows} rows`,
      before: null, after: { rows, filters }, userId,
    })
  },
}))
