import { PUBLIC_SITE_ORIGIN, PUBLIC_SITE_SETTINGS_DEFAULTS } from './utils/siteSettingsDefaults'

const defaultSiteName = PUBLIC_SITE_SETTINGS_DEFAULTS.site_name
const defaultMetaTitle = PUBLIC_SITE_SETTINGS_DEFAULTS.meta_title
const defaultMetaDescription = PUBLIC_SITE_SETTINGS_DEFAULTS.meta_description
const defaultOgImage = PUBLIC_SITE_SETTINGS_DEFAULTS.og_image_url
const siteBaseUrl = `${PUBLIC_SITE_ORIGIN}/`

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  buildDir: '.nuxt',
  devtools: { enabled: process.env.NODE_ENV !== 'production' },
  sourcemap: {
    server: process.env.NODE_ENV !== 'production',
    client: process.env.NODE_ENV !== 'production',
  },

  modules: [
    '@nuxt/ui',
    // @nuxt/icon, @nuxtjs/color-mode, @nuxt/fonts are auto-registered by @nuxt/ui v4
  ],

  app: {
    head: {
      title: defaultMetaTitle,
      htmlAttrs: { lang: 'en' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: defaultMetaDescription },
        { name: 'author', content: defaultSiteName },
        { name: 'theme-color', content: '#0c1b35' },
        { name: 'google-adsense-account', content: 'ca-pub-3382298185404332' },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: defaultSiteName },
        { property: 'og:url', content: siteBaseUrl },
        { property: 'og:title', content: defaultMetaTitle },
        { property: 'og:description', content: defaultMetaDescription },
        { property: 'og:image', content: defaultOgImage },
        { property: 'og:image:alt', content: `${defaultSiteName} logo` },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: defaultMetaTitle },
        { name: 'twitter:description', content: defaultMetaDescription },
        { name: 'twitter:image', content: defaultOgImage },
      ],
      script: [
        {
          async: true,
          src: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3382298185404332',
          crossorigin: 'anonymous',
        },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' },
        { rel: 'icon', type: 'image/png', href: '/logo.png' },
        { rel: 'shortcut icon', href: '/logo.png' },
        { rel: 'canonical', href: siteBaseUrl },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/manifest.json' },
        { rel: 'dns-prefetch', href: 'https://api.iconify.design' },
      ],
    },
  },

  colorMode: {
    preference: 'dark',
    fallback: 'dark',
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
    jwtSecret: process.env.NUXT_JWT_SECRET || 'change-me-in-production',
    authCookieName: process.env.NUXT_AUTH_COOKIE_NAME || 'magguuui_session',
    adminPassword: process.env.NUXT_ADMIN_PASSWORD || '',
    apiKey: process.env.NUXT_API_KEY || '',
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
    externals: {
      inline: ['@simplewebauthn/server'],
    },
  },

  routeRules: {
    '/admin/**': {
      ssr: false,
      headers: {
        'Cache-Control': 'private, no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Robots-Tag': 'noindex, nofollow, noarchive',
      },
    },
    '/api/v1/profiles': { swr: 120 },
    '/api/v1/wowup': { swr: 120 },
    '/api/v1/layouts': { swr: 120 },
    '/api/v1/layouts/**': { swr: 120 },
    '/api/v1/content/**': { swr: 120 },
    '/api/v1/faqs': { swr: 120 },
    '/api/v1/changelogs': { swr: 120 },
    '/api/v1/settings': { swr: 300 },
    '/api/v1/latest-change': { swr: 60 },
    '/assets/logo.png': { redirect: '/logo.png' },
    '/**': {
      headers: {
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Resource-Policy': 'same-origin',
        'Origin-Agent-Cluster': '?1',
        'X-DNS-Prefetch-Control': 'off',
        'X-Permitted-Cross-Domain-Policies': 'none',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        'Content-Security-Policy': "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; form-action 'self'; script-src 'self' 'unsafe-inline' https://pagead2.googlesyndication.com https://www.googletagservices.com https://adservice.google.com https://www.google.com https://tpc.googlesyndication.com; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob: https:; frame-src https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com; connect-src 'self' https://api.iconify.design https://api.github.com https://pagead2.googlesyndication.com https://*.google.com; upgrade-insecure-requests;",
      },
    },
  },
})
