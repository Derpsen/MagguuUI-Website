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
  // Only honour an explicit admin-supplied og_image_url. When unset, fall
  // through to nuxt-og-image's auto-injected per-route Satori card instead
  // of a static logo PNG, which renders poorly on Twitter/Facebook cards.
  const customOgImage = computed(() => {
    const v = siteSettings.value.og_image_url?.trim()
    return v ? v : null
  })
  const canonicalUrl = computed(() => buildPublicUrl(options.path))

  useSeoMeta({
    title: fullTitle,
    description: options.description,
    ogTitle: fullTitle,
    ogDescription: options.description,
    ogSiteName: siteName,
    ogUrl: canonicalUrl,
    ...(customOgImage.value
      ? {
          ogImage: customOgImage.value,
          ogImageWidth: 1200,
          ogImageHeight: 630,
          ogImageType: 'image/png',
          twitterImage: customOgImage.value,
        }
      : {}),
    twitterTitle: fullTitle,
    twitterDescription: options.description,
    twitterCard: 'summary_large_image',
    robots: options.robots,
  })

  // Function form keeps the canonical href reactive across SPA navigation —
  // an inline object literal would freeze the value at setup time.
  useHead(() => ({
    link: [
      { rel: 'canonical', href: canonicalUrl.value },
    ],
  }))

  return siteSettings
}
