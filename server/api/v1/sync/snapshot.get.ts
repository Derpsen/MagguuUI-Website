import { createHash } from 'node:crypto'
import { sqlite } from '~/server/database'
import {
  readGroupedLayouts,
  readGroupedProfiles,
  readWowUpMap,
} from '~/server/utils/profileReadModels'
import { requireSyncApiBearer } from '~/server/utils/syncApiAuth'

/**
 * Canonical Website -> AddOn synchronization snapshot.
 *
 * All three projections are read inside one SQLite transaction and returned
 * in one response. The workflow therefore cannot combine profile, WowUp, and
 * class-layout state from different admin edits.
 */
export default defineEventHandler((event) => {
  requireSyncApiBearer(event)

  const snapshot = sqlite.transaction(() => {
    const profileResult = readGroupedProfiles({ includeHidden: true })
    const wowupResult = readWowUpMap({ includeHidden: true })
    const layoutResult = readGroupedLayouts({ includeHidden: true, requireUnique: true })
    return {
      profiles: profileResult.data,
      wowup: wowupResult.data,
      layouts: layoutResult.data,
      counts: {
        profiles: profileResult.count,
        wowup: wowupResult.count,
        layouts: layoutResult.count,
        classes: layoutResult.classes,
      },
    }
  })()

  const revision = createHash('sha256')
    .update(JSON.stringify(snapshot))
    .digest('hex')

  return apiSuccess(snapshot, { revision, ...snapshot.counts })
})
