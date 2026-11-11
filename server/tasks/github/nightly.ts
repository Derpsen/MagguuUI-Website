import { defineTask } from 'nitropack/runtime'
/**
 * 02:30 UTC GitHub release check + addon catalogue sync (armed by
 * server/plugins/github-nightly-schedule.ts, not Nitro scheduledTasks).
 * Same logic as the admin Check / Resync buttons; lock is shared with those.
 */
import { runScheduledGithubSync } from '~/server/utils/githubScheduledSync'

export default defineTask({
  meta: {
    name: 'github:nightly',
    description: 'Daily GitHub release check and addon catalogue sync',
  },
  async run() {
    const result = await runScheduledGithubSync()
    return { result }
  },
})
