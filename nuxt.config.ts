// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: process.env.NODE_ENV !== 'production' },
  sourcemap: {
    server: process.env.NODE_ENV !== 'production',
    client: process.env.NODE_ENV !== 'production',
  },

  modules: [
    '@nuxt/ui',
    // @nuxt/icon, @nuxtjs/color-mode, @nuxt/fonts — auto-registered by @nuxt/ui v4
  ],

  // ─── App Meta ─────────────────────────────────────
  app: {
    head: {
      title: 'MagguuUI — WoW UI Profiles & Import Strings',
      htmlAttrs: { lang: 'en' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'High-quality import strings for World of Warcraft — pre-configured profiles for ElvUI, Plater, BigWigs, Details & more. Simply copy and paste into WoW.' },
        { name: 'author', content: 'MagguuUI' },
        { name: 'theme-color', content: '#0c1b35' },
        // Open Graph
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'MagguuUI' },
        { property: 'og:url', content: 'https://ui.magguu.xyz' },
        { property: 'og:title', content: 'MagguuUI — Your WoW Interface, perfected.' },
        { property: 'og:description', content: 'High-quality import strings for ElvUI, Plater, BigWigs, Details & more. Simply copy and paste into WoW.' },
        { property: 'og:image', content: 'https://ui.magguu.xyz/og-image.png' },
        // Twitter
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'MagguuUI — Your WoW Interface, perfected.' },
        { name: 'twitter:description', content: 'Pre-configured import strings for ElvUI, Plater, BigWigs, Details & more. Simply copy and paste into WoW.' },
        { name: 'twitter:image', content: 'https://ui.magguu.xyz/og-image.png' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' },
        { rel: 'canonical', href: 'https://ui.magguu.xyz' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/manifest.json' },
        // Preconnect for external resources (performance)
        { rel: 'dns-prefetch', href: 'https://api.iconify.design' },
      ],
    },
  },

  // ─── Color Mode ───────────────────────────────────
  // Passed through to @nuxtjs/color-mode (auto-registered by @nuxt/ui v4)
  colorMode: {
    preference: 'dark',
    fallback: 'dark',
  },

  // ─── Icon (bundled locally) ─────────────────────
  icon: {
    clientBundle: {
      scan: true,
      sizeLimitKb: 512,
    },
  },

  // ─── NuxtUI v4 ──────────────────────────────────
  ui: {
    theme: {
      colors: ['primary', 'secondary', 'success', 'info', 'warning', 'error'],
    },
  },

  // ─── CSS ──────────────────────────────────────────
  css: ['~/assets/css/main.css'],

  // ─── Runtime Config ───────────────────────────────
  runtimeConfig: {
    // Server-only (never exposed to client)
    jwtSecret: process.env.NUXT_JWT_SECRET || 'change-me-in-production',
    authCookieName: process.env.NUXT_AUTH_COOKIE_NAME || 'magguuui_session',
    adminPassword: process.env.NUXT_ADMIN_PASSWORD || '',
    apiKey: process.env.NUXT_API_KEY || '',
    githubToken: process.env.NUXT_GITHUB_TOKEN || '',
    githubRepo: process.env.NUXT_GITHUB_REPO || 'Derpsen/MagguuUI',
    githubWebhookSecret: process.env.NUXT_GITHUB_WEBHOOK_SECRET || '',

    // WebAuthn/Passkey
    webauthnRpName: 'MagguuUI Admin',
    webauthnRpId: process.env.NUXT_WEBAUTHN_RP_ID || '',    // auto-detect from request if empty
    webauthnOrigin: process.env.NUXT_WEBAUTHN_ORIGIN || '',  // auto-detect from request if empty

    // Public (exposed to client)
    public: {
      appName: 'MagguuUI',
      appVersion: '3.0.0',
    },
  },

  // ─── Nitro (Server) ──────────────────────────────
  nitro: {
    storage: {
      data: {
        driver: 'fs',
        base: './data',
      },
    },
    compressPublicAssets: true,
    // Force-inline @simplewebauthn so Rollup bundles it (subpath exports issue)
    externals: {
      inline: ['@simplewebauthn/server'],
    },
  },

  // ─── Route Rules ───────────────────────────────────
  routeRules: {
    // Admin pages: no SSR (prevents auth flash, token is client-only)
    '/admin/**': { ssr: false },
    // Public read endpoints: cache briefly and serve stale while revalidating
    '/api/v1/profiles': { swr: 120 },
    '/api/v1/wowup': { swr: 120 },
    '/api/v1/layouts': { swr: 120 },
    '/api/v1/layouts/**': { swr: 120 },
    '/api/v1/content/**': { swr: 120 },
    '/api/v1/faqs': { swr: 120 },
    '/api/v1/changelogs': { swr: 120 },
    '/api/v1/settings': { swr: 300 },
    '/api/v1/latest-change': { swr: 60 },
    // Backward compatibility for external embeds/descriptions still using this image URL
    '/assets/logo.png': { redirect: '/logo.svg' },
    // Security headers for all routes
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
        // HSTS intentionally not set here (managed separately outside app config).
        'Content-Security-Policy': "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; form-action 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob: https:; connect-src 'self' https://api.iconify.design https://api.github.com; upgrade-insecure-requests;",
      },
    },
  },
})
