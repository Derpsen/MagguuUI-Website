import { PUBLIC_SITE_SETTINGS_DEFAULTS } from '~/utils/siteSettingsDefaults'
import { buildPublicPageTitle, buildPublicUrl } from '~/utils/publicSite'

interface PublicPageSeoOptions {
  title: string
  description: string
  path: string
  robots?: string
}

export async function usePublicPageSeo(options: PublicPageSeoOptions) {
  const siteSettings = await usePublicSiteSettings()

  const siteName = computed(() => siteSettings.value.site_name || PUBLIC_SITE_SETTINGS_DEFAULTS.site_name)
  const fullTitle = computed(() => buildPublicPageTitle(options.title, siteName.value))
  const ogImage = computed(() => siteSettings.value.og_image_url || PUBLIC_SITE_SETTINGS_DEFAULTS.og_image_url)
  const canonicalUrl = computed(() => buildPublicUrl(options.path))

  useSeoMeta({
    title: fullTitle,
    description: options.description,
    ogTitle: fullTitle,
    ogDescription: options.description,
    ogSiteName: siteName,
    ogUrl: canonicalUrl,
    ogImage,
    twitterTitle: fullTitle,
    twitterDescription: options.description,
    twitterImage: ogImage,
    twitterCard: 'summary_large_image',
    robots: options.robots,
  })

  useHead({
    link: [
      { rel: 'canonical', href: canonicalUrl },
    ],
  })

  return siteSettings
}
