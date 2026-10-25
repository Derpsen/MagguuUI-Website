/**
 * POST /api/v1/copy-event — anonymous count of one copy click on an import string.
 *
 * Only a published profile / WowUp collection / class layout can be counted. Skips
 * Do-Not-Track / GPC, bots, admin sessions and flooding. Stores type, id and time
 * only: no IP, no user agent, no cookie, no visitor hash. Always 204.
 */

import { sqlite } from '~/server/database'
import { isCopyEventTrackingEnabled } from '~/server/utils/settings'
import { parseCopyTarget } from '../../../utils/trackingRules'

export default defineEventHandler(async (event) => {
  const gate = beaconGate(event, 'copy-event', 60)
  if (!gate.ok || !isCopyEventTrackingEnabled()) return null

  const body = await readBeaconJson(event)
  const target = parseCopyTarget(body?.stringType, body?.stringId)
  if (!target) return null

  try {
    if (isCopyTarget(sqlite, target.type, target.id)) recordCopy(sqlite, target.type, target.id)
  } catch { /* counting must never break the page */ }
  return null
})
