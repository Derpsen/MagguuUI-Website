import { PUBLIC_SITE_ORIGIN, PUBLIC_SITE_SETTINGS_DEFAULTS } from './utils/siteSettingsDefaults'

const defaultSiteName = PUBLIC_SITE_SETTINGS_DEFAULTS.site_name
const defaultMetaTitle = PUBLIC_SITE_SETTINGS_DEFAULTS.meta_title
const defaultMetaDescription = PUBLIC_SITE_SETTINGS_DEFAULTS.meta_description
const siteBaseUrl = `${PUBLIC_SITE_ORIGIN}/`
const ogImageDefaults = {
  component: 'MagguuOg',
  width: 1200,
  height: 630,
  cacheMaxAgeSeconds: 60 * 60 * 24 * 7,
}
const ogImageConfig = {
  defaults: ogImageDefaults,
  // v7: fonts come from @nuxt/fonts (fonts.families below); signing key from NUXT_APP_SECRET.
}

const publicSecurityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Origin-Agent-Cluster': '?1',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-DNS-Prefetch-Control': 'off',
  'X-Permitted-Cross-Domain-Policies': 'none',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  // No Content-Security-Policy here: routeRules headers also land on SWR-cached
  // HTML, where a `default-src 'none'` baseline blocked every /_nuxt asset.
  // server/plugins/csp-nonce.ts sets the document policy for HTML and the
  // locked-down baseline for everything else.
}

/**
 * Client manifest keys never prefetched on public pages: admin-only code, plus
 * on-demand public extras (Ctrl+K search, the idle-loaded web-vitals module).
 */
const ADMIN_ONLY_CHUNK = /(^|\/)(components\/PublicSearch\.vue|layouts\/admin\.vue|pages\/admin\/(?!login\.vue)|components\/admin\/|components\/TipTapEditor\.vue|components\/CommandPalette\.vue|components\/KeyboardShortcuts\.vue)|node_modules\/(@tiptap|prosemirror-|echarts|zrender|vue-echarts|web-vitals)/

const hotlinkAssetHeaders = {
  ...publicSecurityHeaders,
  // Store listings (WoWI/Wago) hotlink these PNGs. Default CORP same-origin
  // hides them on wowinterface.com. Keep this exception on the two logos only.
  'Cross-Origin-Resource-Policy': 'cross-origin',
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  buildDir: '.nuxt',
  devtools: {
    enabled: process.env.NODE_ENV !== 'production' && process.env.NUXT_DEVTOOLS !== 'false',
  },
  sourcemap: {
    server: process.env.NODE_ENV !== 'production',
    client: process.env.NODE_ENV !== 'production',
  },

  modules: [
    '@nuxt/ui',
    '@nuxt/eslint',
    'nuxt-og-image',
    '@nuxtjs/sitemap',
    '@nuxtjs/robots',
    'nuxt-link-checker',
    // @nuxt/icon, @nuxtjs/color-mode, @nuxt/fonts are auto-registered by @nuxt/ui v4
  ],

  site: {
    url: 'https://ui.magguu.xyz',
    name: defaultSiteName,
  },

  ogImage: ogImageConfig,

  // SEO modules (the individual @nuxtjs/* packages, not the @nuxtjs/seo umbrella,
  // which would also pull nuxt-ai-ready, nuxt-skew-protection and nuxt-seo-utils).
  // Schema.org stays hand-written in pages (home, FAQ): it is factual and a module
  // would only duplicate it.
  sitemap: {
    // The list lives in server/api/__sitemap__/urls.ts: public pages only.
    excludeAppSources: true,
    sources: ['/api/__sitemap__/urls'],
    exclude: ['/admin/**', '/api/**', '/_og/**', '/__og-image__/**'],
    credits: false,
    xsl: false,
    autoLastmod: false,
  },

  robots: {
    credits: false,
    // Value for every disallowed path (/admin/**, /api/** outside the module's own skip list):
    // adds noarchive to the module default `noindex, nofollow`.
    robotsDisabledValue: 'noindex, nofollow, noarchive',
    // Same rules as the old public/robots.txt: everything public, no admin, no API.
    groups: [
      { userAgent: ['*'], allow: ['/'], disallow: ['/admin/', '/api/'] },
    ],
  },

  // Link checker is CI-only (LINK_CHECK=1, see .github/workflows/link-check.yml):
  // it reads prerendered pages, and the production build is SSR. Never in the image.
  linkChecker: {
    enabled: process.env.LINK_CHECK === '1',
    failOnError: false,
    runOnBuild: true,
    fetchRemoteUrls: true,
    excludeLinks: [
      '/admin/**',
      '/api/**',
      // CurseForge answers bots with 403 (every link is a false positive).
      /^https:\/\/www\.curseforge\.com\//,
    ],
    // Addon names in ?addon= values are intentionally mixed case.
    skipInspections: ['no-uppercase-chars'],
    report: { markdown: true, json: true, publish: false },
  },

  app: {
    head: {
      title: defaultMetaTitle,
      htmlAttrs: { lang: 'en' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: defaultMetaDescription },
        { name: 'author', content: defaultSiteName },
        { name: 'theme-color', content: '#061f1b' },
        { name: 'google-adsense-account', content: 'ca-pub-3382298185404332' },
        { name: 'google-site-verification', content: 'PST-5t5R4xh66Qhf0PxadvnLxGg_A3We1Ku752iuVBI' },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: defaultSiteName },
        { property: 'og:url', content: siteBaseUrl },
        { property: 'og:title', content: defaultMetaTitle },
        { property: 'og:description', content: defaultMetaDescription },
        // og:image and twitter:image are injected per-route by nuxt-og-image
        // (Satori card) or by usePublicPageSeo when the admin pins one. We
        // intentionally do NOT set a static default here — a logo PNG renders
        // poorly on social cards and would override the per-route Satori card.
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: defaultMetaTitle },
        { name: 'twitter:description', content: defaultMetaDescription },
      ],
      // AdSense script is injected on-demand by components/AdBanner.vue when
      // ads are both enabled and configured. Loading it statically here would
      // double-load the script on pages that already render an AdBanner, and
      // would leak a request to Google on privacy-sensitive routes (imprint,
      // privacy) even when the admin has disabled ads.
      link: [
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16.png' },
        { rel: 'shortcut icon', href: '/favicon-32.png' },
        /* canonical is set per-page via usePublicPageSeo composable */
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/manifest.json' },
        { rel: 'dns-prefetch', href: 'https://api.iconify.design' },
      ],
    },
  },

  colorMode: {
    preference: 'dark',
    fallback: 'dark',
    classSuffix: '',
  },

  icon: {
    clientBundle: {
      scan: true,
      sizeLimitKb: 512,
    },
  },

  ui: {
    theme: {
      colors: ['primary', 'secondary', 'success', 'info', 'warning', 'error'],
    },
  },

  fonts: {
    families: [
      {
        name: 'Plus Jakarta Sans',
        provider: 'npm',
        weights: ['400', '500', '600', '700', '800'],
        styles: ['normal'],
      },
      {
        name: 'JetBrains Mono',
        provider: 'npm',
        weights: ['400', '500', '700'],
        styles: ['normal'],
      },
    ],
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    // No literal fallback — server/plugins/runtime-guard.ts refuses startup in
    // non-development envs if NUXT_JWT_SECRET is unset, so the empty string is
    // only ever observed in dev where developers can replace it consciously.
    jwtSecret: process.env.NUXT_JWT_SECRET || '',
    // Empty string lets server/utils/auth.ts pick the prod-aware __Host- prefixed
    // cookie name. A truthy fallback here would short-circuit that branch and
    // disable the subdomain-injection hardening in production.
    authCookieName: process.env.NUXT_AUTH_COOKIE_NAME || '',
    adminPassword: process.env.NUXT_ADMIN_PASSWORD || '',
    // Shared bearer token for the canonical, server-to-server
    // /api/v1/sync/* contract. It is never exposed to the browser. Set it on
    // the host as API_BEARER_TOKEN and mirror it as WEBSITE_API_KEY in the
    // AddOn repository.
    apiBearerToken: process.env.API_BEARER_TOKEN || '',
    githubToken: process.env.NUXT_GITHUB_TOKEN || '',
    githubRepo: process.env.NUXT_GITHUB_REPO || 'Derpsen/MagguuUI',
    githubWebhookSecret: process.env.NUXT_GITHUB_WEBHOOK_SECRET || '',

    webauthnRpName: 'MagguuUI Admin',
    webauthnRpId: process.env.NUXT_WEBAUTHN_RP_ID || '',
    webauthnOrigin: process.env.NUXT_WEBAUTHN_ORIGIN || '',

    public: {
      appName: defaultSiteName,
      appVersion: '3.0.0',
    },
  },

  nitro: {
    storage: {
      data: {
        driver: 'fs',
        base: './data',
      },
    },
    compressPublicAssets: true,
    // Only for the CI link check (LINK_CHECK=1): prerender the public pages so
    // nuxt-link-checker has HTML to scan. Never set for the image build.
    ...(process.env.LINK_CHECK === '1'
      ? {
          prerender: {
            failOnError: false,
            routes: ['/', '/guide', '/faq', '/changelog', '/about', '/addons', '/profiles', '/imprint', '/privacy', '/strings'],
          },
        }
      : {}),
    externals: {
      inline: ['@simplewebauthn/server'],
    },
    // @peculiar/x509 2.x (via @simplewebauthn/server) is hoisted as a static
    // import of the Nitro server chunk. Prepend the polyfill so it evaluates
    // before tsyringe, even if plugin import order is sorted later.
    hooks: {
      'rollup:before'(nitro, config) {
        if (!nitro.options) return
        const polyfill = "import 'reflect-metadata';"
        const prepend = async (originalBanner: unknown, chunk: unknown) => {
          const raw = typeof originalBanner === 'function'
            ? await originalBanner(chunk)
            : String(originalBanner ?? '')
          if (raw.startsWith('#!')) {
            const nl = raw.indexOf('\n')
            if (nl === -1) return `${raw}\n${polyfill}`
            return `${raw.slice(0, nl + 1)}${polyfill}\n${raw.slice(nl + 1)}`
          }
          return `${polyfill}\n${raw}`
        }
        const patch = (output: { banner?: unknown }) => {
          const originalBanner = output.banner
          output.banner = (chunk: unknown) => prepend(originalBanner, chunk)
        }
        if (Array.isArray(config.output)) {
          for (const output of config.output) patch(output)
        } else if (config.output) {
          patch(config.output)
        } else {
          config.output = { banner: `${polyfill}\n` }
        }
      },
    },
  },

  hooks: {
    // Admin-only chunks (admin layout/pages/components, TipTap, charts) must not
    // ride along on public pages as <link rel="prefetch"> / modulepreload.
    // Shared chunks/CSS that only admin chunks import are admin-only too.
    'build:manifest'(manifest) {
      const adminOnly = new Set(Object.keys(manifest).filter(key => ADMIN_ONLY_CHUNK.test(key)))
      const importers = new Map<string, Set<string>>()
      for (const [key, chunk] of Object.entries(manifest)) {
        for (const dep of [...(chunk.imports ?? []), ...(chunk.dynamicImports ?? [])]) {
          if (!importers.has(dep)) importers.set(dep, new Set())
          importers.get(dep)!.add(key)
        }
      }
      let grew = true
      while (grew) {
        grew = false
        for (const [key, chunk] of Object.entries(manifest)) {
          if (adminOnly.has(key) || chunk.isEntry) continue
          const from = importers.get(key)
          if (from?.size && [...from].every(k => adminOnly.has(k))) {
            adminOnly.add(key)
            grew = true
          }
        }
      }
      for (const key of adminOnly) {
        const chunk = manifest[key]
        if (!chunk) continue
        chunk.prefetch = false
        chunk.preload = false
        for (const css of chunk.css ?? []) {
          const cssChunk = manifest[css]
          if (cssChunk) cssChunk.prefetch = false
        }
      }
    },
  },

  vite: {
    // Fewer, larger initial chunks on public pages: code statically reachable
    // from the entry (vue/nuxt runtime, @nuxt/ui primitives, layout chrome)
    // was split into ~25 tiny shared chunks, each its own modulepreload.
    // Client only; SSR chunking stays default.
    $client: {
      build: {
        rolldownOptions: {
          output: {
            codeSplitting: {
              groups: [
                // `$initial`: statically reachable from the entry, i.e. on every page anyway.
                { name: 'vendor', test: /node_modules[\\/]/, tags: ['$initial'], priority: 10 },
                { name: 'app', test: /^(?!.*node_modules)/, tags: ['$initial'], priority: 5 },
              ],
            },
          },
        },
      },
    },
  },

  experimental: {
    // swr routes would otherwise get an extracted _payload.json that is cached
    // separately from the HTML. A stale HTML + fresh payload pair caused the
    // Home hydration mismatch (WIM vs Whisper Messenger, old contact email).
    // Inline payload keeps markup and data from the same render.
    payloadExtraction: false,
    // Native View Transitions API on client navigation. Nuxt skips it for
    // prefers-reduced-motion: reduce; unsupported browsers navigate as before.
    viewTransition: true,
  },

  routeRules: {
    // `/admin/login` is the public entry and stays SSR-on. Other `/admin/**`
    // routes stay SPA (`ssr: false`) to avoid auth-token flash. More-specific
    // rule must precede the catch-all.
    '/admin/login': {
      ssr: true,
      headers: {
        'Cache-Control': 'private, no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Robots-Tag': 'noindex, nofollow, noarchive',
      },
    },
    '/admin/**': {
      ssr: false,
      headers: {
        'Cache-Control': 'private, no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Robots-Tag': 'noindex, nofollow, noarchive',
      },
    },
    // The robots module skips /api/* entirely, so API responses get the header here.
    // Merged with the more specific per-route rules below (headers are deep-merged).
    '/api/**': { headers: { 'X-Robots-Tag': 'noindex, nofollow, noarchive' } },
    // Public marketing HTML. Auth chrome is client-only, so the cached
    // document is the anonymous page. Same 120s window as the content APIs.
    '/': { swr: 120 },
    '/guide': { swr: 120 },
    '/faq': { swr: 120 },
    // Deliberately NO page-level swr for /changelog: it takes ?since/from/to/q, and
    // Nitro's route cache keys on the full URL, so every query variant would get its
    // own entry (unbounded growth, and route rules cannot express a getKey or bypass).
    // The page reads its data from /api/v1/changelogs (bare URL, swr 120 below), so the
    // origin cost per render stays one cached API hit; the bare URL is still edge-cached
    // via CDN-Cache-Control (publicCache.ts), query variants never are.
    '/changelog': { headers: { 'Cache-Control': 'public, max-age=0, must-revalidate' } },
    '/about': { swr: 120 },
    '/addons': { swr: 120 },
    // No swr: the previews folder is read live (a dropped-in image appears at once) and the
    // page is cheap; the bare URL is still edge-cached via CDN-Cache-Control (publicCache.ts).
    '/profiles': { headers: { 'Cache-Control': 'public, max-age=0, must-revalidate' } },
    '/imprint': { swr: 120 },
    '/privacy': { swr: 120 },
    '/api/v1/catalog-summary': { swr: 120 },
    '/api/v1/profiles': { swr: 120 },
    '/api/v1/profiles/**': { swr: 120 },
    '/api/v1/addons': { swr: 120 },
    '/api/v1/wowup': { swr: 120 },
    '/api/v1/wowup/**': { swr: 120 },
    '/api/v1/layouts': { swr: 120 },
    '/api/v1/layouts/**': { swr: 120 },
    '/api/v1/content/**': { swr: 120 },
    '/api/v1/faqs': { swr: 120 },
    '/api/v1/search-index': { swr: 120 },
    '/api/v1/changelogs': { swr: 120 },
    '/api/v1/release-stamps': { swr: 120 },
    '/api/v1/settings': { swr: 300 },
    '/api/v1/latest-change': { swr: 60 },
    '/assets/logo.png': { redirect: '/logo.png' },
    // The worker's own CSP governs its fetch(): the non-HTML baseline
    // (default-src 'none') blocked every same-origin fetch, so SW-handled
    // navigations (/guide, /strings) and /_nuxt assets failed with ERR_FAILED.
    '/sw.js': { headers: { ...publicSecurityHeaders, 'Cache-Control': 'no-cache', 'Service-Worker-Allowed': '/', 'Content-Security-Policy': "default-src 'none'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'" } },
    '/logo.png': { headers: hotlinkAssetHeaders },
    '/logo-300.png': { headers: hotlinkAssetHeaders },
    '/**': {
      headers: publicSecurityHeaders,
    },
  },
})
