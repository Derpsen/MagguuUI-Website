/**
 * Carry the NUXT_ADS flag to the client via useState (SSR payload).
 * Do not write to runtimeConfig.public — that object is frozen in production
 * and assigning it crashes process start when Unraid sets NUXT_ADS (even empty).
 */
import { isNuxtAdsEnabled, resolveNuxtAdsFlag } from '~/utils/metaUiCopy'

export default defineNuxtPlugin(() => {
  const raw = useState('nuxt-ads-raw', () => (import.meta.server ? resolveNuxtAdsFlag(process.env) : ''))
  if (import.meta.server) raw.value = resolveNuxtAdsFlag(process.env)
  return {
    provide: {
      nuxtAdsEnabled: computed(() => isNuxtAdsEnabled(raw.value)),
    },
  }
})
