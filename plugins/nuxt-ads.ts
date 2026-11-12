/**
 * Carry a boolean ads flag to the client via useState (SSR payload).
 * The raw NUXT_ADS string stays on the server. runtimeConfig is frozen in
 * production, and assigning it crashes process start when Unraid sets NUXT_ADS
 * (even empty).
 */
import { isNuxtAdsEnabled, resolveNuxtAdsFlag } from '~/utils/metaUiCopy'

export default defineNuxtPlugin(() => {
  const enabled = useState('nuxt-ads-enabled', () => (
    import.meta.server ? isNuxtAdsEnabled(resolveNuxtAdsFlag(process.env)) : false
  ))
  if (import.meta.server) enabled.value = isNuxtAdsEnabled(resolveNuxtAdsFlag(process.env))
})
