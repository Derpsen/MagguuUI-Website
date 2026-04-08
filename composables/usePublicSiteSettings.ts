import { PUBLIC_SITE_SETTINGS_DEFAULTS } from '~/utils/siteSettingsDefaults'

/**
 * IMPORTANT: This composable is intentionally NOT async.
 *
 * `useFetch` is already reactive and Nuxt waits for in-flight SSR fetches
 * before serializing the page, so there is no need to await it manually.
 * Awaiting useFetch here previously caused "[nuxt] instance unavailable"
 * errors on pages that called other composables (useRoute, additional
 * useFetch) after `await usePublicPageSeo(...)`, because Nuxt 4 can drop
 * the AsyncLocalStorage instance context across nested awaits.
 */
export function usePublicSiteSettings() {
  const siteSettings = useState<Record<string, string>>('site-settings', () => ({ ...PUBLIC_SITE_SETTINGS_DEFAULTS }))

  const { data } = useFetch('/api/v1/settings', {
    key: 'public-site-settings',
    default: () => ({ success: true, data: {} as Record<string, string> }),
  })

  // Reactively mirror the fetch result into shared state. Runs once on SSR
  // when useFetch resolves, and again on the client after hydration.
  watchEffect(() => {
    const payload = (data.value as any)?.data
    if (payload && typeof payload === 'object') {
      siteSettings.value = {
        ...PUBLIC_SITE_SETTINGS_DEFAULTS,
        ...payload,
      }
    }
  })

  return siteSettings
}
