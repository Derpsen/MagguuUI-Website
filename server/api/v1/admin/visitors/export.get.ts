/** GET /api/v1/admin/visitors/export: CSV of the filtered view (admin only, no-store, max 50,000 rows, audited without payload; no audit entry = no export). */
import { sqlite } from '~/server/database'
import { visitorLogEnabled } from '../../../../../utils/consent'
import { recordAuditChange } from '~/server/utils/auditLog'
import { handleVisitorExport } from '../../../../utils/visitorAdminRequest'

export default defineEventHandler(event => handleVisitorExport(event, {
  requireAdmin,
  sqlite,
  enabled: () => visitorLogEnabled(process.env.NUXT_VISITOR_LOG),
  // Fail closed: an export that cannot be audited does not happen (recordAuditChange throws, the handler answers 500).
  audit: ({ userId, rows, filters }) => {
    const id = recordAuditChange(sqlite, {
      action: 'exported', entityType: 'visitor_export', entityName: `Visitor CSV, ${rows} rows`,
      before: null, after: { rows, filters }, userId,
    })
    if (id === null) throw new Error('audit entry not written')
  },
}))
