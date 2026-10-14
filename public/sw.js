/*
 * MagguuUI service worker — offline copy of /strings and /guide.
 *
 * - Network-first for pages and public read APIs: online visitors always get
 *   the live (SWR/Cloudflare-purged) response; the cache is only an offline
 *   fallback. Hashed /_nuxt assets are cache-first (immutable file names).
 * - Never touches /admin, admin/auth/sync/webhook APIs, non-GET requests or
 *   anything cross-origin.
 * - Update-safe: a new sw.js activates at once and drops old caches.
 */
const VERSION = 'v1'
const PAGES = `magguu-pages-${VERSION}`
const ASSETS = `magguu-assets-${VERSION}`
const OFFLINE_PAGES = ['/strings', '/guide']
const API_ALLOW = [
  /^\/api\/v1\/(profiles|layouts|wowup)(\/\d+)?$/,
  /^\/api\/v1\/content\/guide$/,
  /^\/api\/v1\/(settings|faqs|addons|catalog-summary)$/,
]
const MAX_ASSETS = 120

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = new Set([PAGES, ASSETS])
    for (const key of await caches.keys()) {
      if (key.startsWith('magguu-') && !keep.has(key)) await caches.delete(key)
    }
    await self.clients.claim()
  })())
})

function isPrivate(path) {
  return path.startsWith('/admin')
    || path.startsWith('/api/v1/admin')
    || path.startsWith('/api/v1/auth')
    || path.startsWith('/api/v1/sync')
    || path.startsWith('/api/v1/webhooks')
}

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  for (const req of keys.slice(0, Math.max(0, keys.length - max))) await cache.delete(req)
}

async function networkFirst(request, cacheKey) {
  const cache = await caches.open(PAGES)
  try {
    const response = await fetch(request)
    if (response.ok && response.type === 'basic') await cache.put(cacheKey, response.clone())
    return response
  } catch (err) {
    const cached = await cache.match(cacheKey)
    if (cached) return cached
    throw err
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(ASSETS)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok && response.type === 'basic') {
    await cache.put(request, response.clone())
    void trim(ASSETS, MAX_ASSETS)
  }
  return response
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET' || request.headers.has('authorization')) return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin || isPrivate(url.pathname)) return

  if (request.mode === 'navigate') {
    const page = url.pathname.replace(/\/+$/, '') || '/'
    if (!OFFLINE_PAGES.includes(page)) return
    // One offline copy per page; deep-link query variants share it.
    event.respondWith(networkFirst(request, new Request(page)))
    return
  }
  if (url.pathname.startsWith('/_nuxt/')) {
    event.respondWith(cacheFirst(request))
    return
  }
  if (API_ALLOW.some(re => re.test(url.pathname))) {
    event.respondWith(networkFirst(request, request))
  }
})
