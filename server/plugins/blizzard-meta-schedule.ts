/**
 * Arm blizzard:nightly at 03:15 UTC every day (after github:nightly at 02:30).
 * Nitro scheduledTasks is not used: that cron follows the process timezone,
 * and the Unraid container / image have no TZ. UTC date math only.
 */
import { runTask } from 'nitropack/runtime'
import { nextBlizzardMetaNightlyRun, shouldArmMetaSchedule } from '~/utils/metaSchedule'

export default defineNitroPlugin((nitroApp) => {
  // Playwright, CI, dev, and the link-check prerender must not fire outbound Blizzard jobs.
  if (!shouldArmMetaSchedule()) return

  let timer: ReturnType<typeof setTimeout> | null = null
  let stopped = false

  const arm = () => {
    if (stopped) return
    const delay = Math.max(0, nextBlizzardMetaNightlyRun().getTime() - Date.now())
    timer = setTimeout(() => {
      void runTask('blizzard:nightly')
        .catch(() => { console.error('[blizzard:nightly] scheduled run failed') })
        .finally(() => { arm() })
    }, delay)
    timer.unref?.()
  }

  arm()
  nitroApp.hooks.hook('close', () => {
    stopped = true
    if (timer) clearTimeout(timer)
    timer = null
  })
})
