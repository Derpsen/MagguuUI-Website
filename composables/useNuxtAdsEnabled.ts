/** Public ads flag. Always a boolean — the raw NUXT_ADS string is not in the payload. */
export function useNuxtAdsEnabled() {
  return useState('nuxt-ads-enabled', () => false)
}
