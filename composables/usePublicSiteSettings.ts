import { PUBLIC_SITE_SETTINGS_DEFAULTS } from '~/utils/siteSettingsDefaults'

export async function usePublicSiteSettings() {
  const siteSettings = useState<Record<string, string>>('site-settings', () => ({ ...PUBLIC_SITE_SETTINGS_DEFAULTS }))

  const { data } = await useFetch('/api/v1/settings', {
    key: 'public-site-settings',
    default: () => ({ success: true, data: {} as Record<string, string> }),
  })

  if (data.value?.data) {
    siteSettings.value = {
      ...PUBLIC_SITE_SETTINGS_DEFAULTS,
      ...data.value.data,
    }
  }

  return siteSettings
}
