import { defineTask } from 'nitropack/runtime'
/**
 * 03:30 Europe/Berlin (container TZ) GitHub release check + addon catalogue sync.
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
