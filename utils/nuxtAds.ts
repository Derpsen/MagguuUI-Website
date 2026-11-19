/**
 * Master ads switch (NUXT_ADS / runtimeConfig.public.ads). Default off.
 * Recognised on-values match the other kill switches: on/true/1/yes.
 */
export function isNuxtAdsEnabled(raw: unknown): boolean {
  const value = String(raw ?? '').trim().toLowerCase()
  return value === 'on' || value === 'true' || value === '1' || value === 'yes'
}

/**
 * Resolve the ads master switch from the process env. Empty or whitespace
 * NUXT_ADS is off. NUXT_PUBLIC_ADS is only used when NUXT_ADS is unset.
 * Does not mutate runtimeConfig (that object is frozen in production).
 */
export function resolveNuxtAdsFlag(env: NodeJS.ProcessEnv = process.env): string {
  if (env.NUXT_ADS !== undefined) return String(env.NUXT_ADS)
  if (env.NUXT_PUBLIC_ADS !== undefined) return String(env.NUXT_PUBLIC_ADS)
  return ''
}
