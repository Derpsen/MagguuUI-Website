/**
 * Status sampler: records one row per 5-minute slot while the site answers its own
 * database (see server/utils/siteStatus.ts). Checks once a minute so a drifting timer
 * can never skip a slot; INSERT OR IGNORE keeps each slot single. Roll-up and
 * pruning run at startup and then about every 30 minutes.
 */

import { sqlite } from '~/server/database'
import { SLOT_SECONDS, recordStatusSample, runStatusMaintenance } from '~/server/utils/siteStatus'
import { pruneBeaconRateLimits } from '~/server/utils/analytics'
import { prunePresets } from '~/server/utils/communityPresets'
import { pruneStatusNotices } from '~/server/utils/statusNoticeStore'

export default defineNitroPlugin(() => {
  let lastSlot = 0
  let ticks = 0

  const tick = () => {
    const now = Math.floor(Date.now() / 1000)
    try {
      sqlite.prepare('SELECT 1').get() // a slot counts only when the database answers
      const slot = Math.floor(now / SLOT_SECONDS) * SLOT_SECONDS
      pruneBeaconRateLimits(sqlite) // anonymous beacon limiter rows live a few minutes; capped in number
      if (slot !== lastSlot) {
        recordStatusSample(sqlite, now)
        lastSlot = slot
      }
      if (ticks++ % 30 === 0) {
        runStatusMaintenance(sqlite, now)
        pruneStatusNotices(sqlite, now) // resolved notices are kept for a year
        prunePresets(sqlite, now) // pending / rejected community presets expire after 30 days
      }
    } catch { /* database not ready or unavailable: the missing slot is the signal */ }
  }

  const timer = setInterval(tick, 60_000)
  timer.unref?.()
  const first = setTimeout(tick, 8000)
  first.unref?.()
})
