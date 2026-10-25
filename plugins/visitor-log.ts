/**
 * Tells the browser whether the detailed visitor log is switched on (server env NUXT_VISITOR_LOG; on unless set to false/0).
 * The value is rendered on the server and travels in the page payload; the browser never reads the env.
 * While it is switched off there is no banner, no footer link, no consent request and no capture.
 */
import { visitorLogEnabled } from '~/utils/consent'

export default defineNuxtPlugin(() => {
  useState<boolean>('visitorLog', () => (import.meta.server ? visitorLogEnabled(process.env.NUXT_VISITOR_LOG) : false))
})
