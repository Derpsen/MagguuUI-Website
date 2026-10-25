/**
 * Registers the database as the source of admin-written notices for /status
 * (item B). The hourly-ish retention prune for resolved notices lives in the
 * status sampler plugin's maintenance tick.
 */

import { sqlite } from '~/server/database'
import { publicNoticeRows } from '~/server/utils/statusNoticeStore'
import { registerStatusNoticeSource } from '~/server/utils/statusNotices'

export default defineNitroPlugin(() => {
  registerStatusNoticeSource(now => publicNoticeRows(sqlite, now))
})
