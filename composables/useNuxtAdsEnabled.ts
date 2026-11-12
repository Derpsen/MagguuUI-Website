import { isNuxtAdsEnabled } from '~/utils/metaUiCopy'

/** SSR/client ads master switch from the nuxt-ads plugin payload. Default off. */
export function useNuxtAdsEnabled() {
  const raw = useState('nuxt-ads-raw', () => '')
  return computed(() => isNuxtAdsEnabled(raw.value))
}
