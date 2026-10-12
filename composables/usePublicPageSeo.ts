import { PUBLIC_SITE_SETTINGS_DEFAULTS } from '~/utils/siteSettingsDefaults'
import { buildPublicPageTitle, buildPublicUrl } from '~/utils/publicSite'

interface PublicPageSeoOptions {
  title: string
  description: string
  path: string
  robots?: string
}

/**
 * NOT async on purpose — see comment in usePublicSiteSettings.
 * Consumers may still call this with `await` (await of a non-Promise is a
 * no-op), so existing call sites do not need to change.
 */
export function usePublicPageSeo(options: PublicPageSeoOptions) {
  const siteSettings = usePublicSiteSettings()

  const siteName = computed(() => siteSettings.value.site_name || PUBLIC_SITE_SETTINGS_DEFAULTS.site_name)
  const fullTitle = computed(() => buildPublicPageTitle(options.title, siteName.value))
  // An admin-pinned image wins. Otherwise each page gets its own Takumi
  // card (components/OgImage/MagguuOg.takumi.vue) with its title/description.
  const pinnedOgImage = computed(() => siteSettings.value.og_image_url?.trim() || '')
  const canonicalUrl = computed(() => buildPublicUrl(options.path))

  useSeoMeta({
    title: fullTitle,
    description: options.description,
    ogTitle: fullTitle,
    ogDescription: options.description,
    ogSiteName: siteName,
    ogUrl: canonicalUrl,
    ogImage: () => pinnedOgImage.value || undefined,
    ogImageWidth: () => pinnedOgImage.value ? 1200 : undefined,
    ogImageHeight: () => pinnedOgImage.value ? 630 : undefined,
    ogImageType: () => pinnedOgImage.value ? 'image/png' : undefined,
    twitterImage: () => pinnedOgImage.value || undefined,
    twitterTitle: fullTitle,
    twitterDescription: options.description,
    twitterCard: 'summary_large_image',
    robots: options.robots,
  })

  if (!pinnedOgImage.value) {
    defineOgImage('MagguuOg', { title: options.title, description: options.description })
  }

  // Function form keeps the canonical href reactive across SPA navigation —
  // an inline object literal would freeze the value at setup time.
  useHead(() => ({
    link: [
      { rel: 'canonical', href: canonicalUrl.value },
    ],
  }))

  return siteSettings
}
