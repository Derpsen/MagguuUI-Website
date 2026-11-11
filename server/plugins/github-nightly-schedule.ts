/**
 * Arm github:nightly at 02:30 UTC every day. Nitro's own scheduledTasks cron
 * follows the process timezone, so this plugin uses UTC date math instead
 * and does not depend on a TZ on the Unraid container or in the image.
 */
import { runTask } from 'nitropack/runtime'
import { nextGithubNightlyRun } from '~/utils/githubSchedule'

export default defineNitroPlugin((nitroApp) => {
  // Playwright and the link-check prerender must not fire outbound GitHub jobs.
  if (process.env.NUXT_E2E_SEED === 'true' || process.env.LINK_CHECK === '1') return

  let timer: ReturnType<typeof setTimeout> | null = null
  let stopped = false

  const arm = () => {
    if (stopped) return
    const delay = Math.max(0, nextGithubNightlyRun().getTime() - Date.now())
    timer = setTimeout(() => {
      void runTask('github:nightly')
        .catch(() => { console.error('[github:nightly] scheduled run failed') })
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
