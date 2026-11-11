import { defineTask } from 'nitropack/runtime'
/**
 * 03:15 UTC Meta snapshot (armed by server/plugins/blizzard-meta-schedule.ts,
 * not Nitro scheduledTasks). Off by default, and off without credentials.
 */
import { sqlite } from '~/server/database'
import { createOfetchBlizzardFetcher } from '~/server/utils/blizzardHttp'
import { runScheduledBlizzardMetaSyncGuarded } from '~/server/utils/blizzardMetaSync'

export default defineTask({
  meta: {
    name: 'blizzard:nightly',
    description: 'Daily EU Mythic+ Meta snapshot from the Blizzard Game Data and Profile APIs',
  },
  async run() {
    const result = await runScheduledBlizzardMetaSyncGuarded({
      sqlite,
      config: useRuntimeConfig(),
      fetcher: createOfetchBlizzardFetcher(),
    })
    return { result }
  },
})
