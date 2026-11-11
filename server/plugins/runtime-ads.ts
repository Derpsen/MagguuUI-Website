/**
 * Map NUXT_ADS onto runtimeConfig.public.ads when the process starts.
 * nuxt.config cannot see container env at runtime (it would only auto-map
 * NUXT_PUBLIC_ADS), so a Docker/Unraid change of NUXT_ADS would otherwise
 * stay off until the next image build.
 */
import { applyNuxtAdsRuntimeConfig } from '~/utils/metaUiCopy'

export default defineNitroPlugin(() => {
  applyNuxtAdsRuntimeConfig(useRuntimeConfig())
})
