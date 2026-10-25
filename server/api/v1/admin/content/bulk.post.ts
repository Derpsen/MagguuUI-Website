/**
 * POST /api/v1/admin/content/bulk
 *
 * Bulk upsert site content straight into the published content (no draft).
 * Receives { items: [{ page, section, key, value, locale? }] }
 * Default locale is 'en'. The admin editors save drafts instead
 * (POST /api/v1/admin/content/drafts) and promote them with
 * POST /api/v1/admin/content/publish; this endpoint stays for API clients.
 */

import { sqlite } from '~/server/database'
import { applyContentItems } from '~/server/utils/contentDrafts'
import { recordContentAudit } from '~/server/utils/auditLog'
import { validateBody, contentBulkSchema } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const auth = requireAdminAccess(event)
  const body = await readBody(event)
  const data = validateBody(contentBulkSchema, body)

  // One transaction for all upserts (single fsync); revisions are written per changed cell.
  const changes = applyContentItems(sqlite, data.items, auth.userId)

  const pages = Array.from(new Set(data.items.map((i) => i.page)))
  try { recordContentAudit(sqlite, changes, `${pages.join(', ') || 'bulk'} saved`, auth.userId) } catch (e) { console.error('[Audit] content bulk', e) }
  logActivity({
    action: 'updated',
    entityType: 'content',
    entityName: pages.join(', ') || 'bulk',
    details: { items: data.items.length, pages },
    userId: auth.userId,
  })

  return apiSuccess({ updated: data.items.length })
})
