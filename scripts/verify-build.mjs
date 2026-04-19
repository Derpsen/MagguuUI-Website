import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createServer } from 'node:net'
import { setTimeout as delay } from 'node:timers/promises'

const requestedPort = Number(process.env.SMOKE_PORT || 3210)
const serverEntrypoint = '.output/server/index.mjs'
const startupTimeoutMs = 30000
const seededAdminPassword = process.env.NUXT_ADMIN_PASSWORD || 'smoke-test-password-not-for-production'
const authSmokeUsername = process.env.SMOKE_ADMIN_USERNAME || 'admin'
const authSmokePassword = process.env.SMOKE_ADMIN_PASSWORD || seededAdminPassword
const authSmokeExplicit = Boolean(process.env.SMOKE_ADMIN_PASSWORD)
const authSmokeRequired = process.env.SMOKE_REQUIRE_AUTH === 'true'
let port = Number.isFinite(requestedPort) ? requestedPort : 3210
let baseUrl = process.env.SMOKE_BASE_URL || `http://127.0.0.1:${port}`
const endpoints = [
  { path: '/', expectedStatus: 200, mustInclude: '<!DOCTYPE html>' },
  { path: '/api/health', expectedStatus: 200, mustInclude: '"status":"ok"' },
  { path: '/api/v1/faqs', expectedStatus: 200, mustInclude: '"success":true' },
  { path: '/api/v1/settings', expectedStatus: 200, mustInclude: '"site_name"' },
]

if (!existsSync(serverEntrypoint)) {
  throw new Error(`Smoke test requires a built server at ${serverEntrypoint}. Run "npm run build" or "npm run verify" first.`)
}

function fail(message, cause) {
  const error = cause instanceof Error ? cause : new Error(String(cause || message))
  error.message = message + (cause ? `\n${error.message}` : '')
  throw error
}

function headerIncludes(response, name, expectedValue) {
  const actual = response.headers.get(name) || ''
  return actual.toLowerCase().includes(expectedValue.toLowerCase())
}

function assertPrivateApiHeaders(response, path) {
  if (!headerIncludes(response, 'cache-control', 'no-store')) {
    fail(`Expected ${path} to include Cache-Control: no-store`)
  }

  if (!headerIncludes(response, 'x-robots-tag', 'noindex')) {
    fail(`Expected ${path} to include X-Robots-Tag: noindex`)
  }

  const vary = (response.headers.get('vary') || '').toLowerCase()
  if (!vary.includes('cookie') || !vary.includes('authorization')) {
    fail(`Expected ${path} to vary on Cookie and Authorization`)
  }
}

async function tryReservePort(candidatePort) {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.unref()

    server.once('error', (error) => {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'EADDRINUSE') {
        resolve(null)
        return
      }

      reject(error)
    })

    server.listen(candidatePort, '127.0.0.1', () => {
      const address = server.address()
      const resolvedPort = typeof address === 'object' && address ? address.port : candidatePort
      server.close(() => resolve(resolvedPort))
    })
  })
}

async function resolveSmokePort() {
  if (process.env.SMOKE_BASE_URL) {
    return port
  }

  const preferredPort = await tryReservePort(port)
  if (preferredPort !== null) {
    return preferredPort
  }

  const fallbackPort = await tryReservePort(0)
  if (fallbackPort !== null) {
    console.log(`[verify] Port ${port} was already in use, using ${fallbackPort} instead`)
    return fallbackPort
  }

  fail('Could not reserve a free port for the smoke test server')
}

async function waitForServer() {
  const deadline = Date.now() + startupTimeoutMs

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/health`)
      if (response.ok) return
    } catch {
      // Keep polling until the timeout is reached.
    }

    await delay(500)
  }

  fail(`Smoke test server did not become ready within ${startupTimeoutMs / 1000}s`)
}

async function verifyEndpoints() {
  for (const endpoint of endpoints) {
    const response = await fetch(`${baseUrl}${endpoint.path}`)
    const body = await response.text()

    if (response.status !== endpoint.expectedStatus) {
      fail(`Expected ${endpoint.path} to return ${endpoint.expectedStatus}, got ${response.status}`)
    }

    if (!body.includes(endpoint.mustInclude)) {
      fail(`Response for ${endpoint.path} did not contain expected marker: ${endpoint.mustInclude}`)
    }

    console.log(`[verify] ${endpoint.path} -> ${response.status}`)
  }
}

async function verifyPublicApiFlows() {
  const homeContentResponse = await fetch(`${baseUrl}/api/v1/content/home`)
  const homeContentBody = await homeContentResponse.json()

  if (!homeContentResponse.ok || !homeContentBody?.success) {
    fail(`Expected public home content lookup to succeed, got ${homeContentResponse.status}`)
  }

  const heroTitle = homeContentBody?.data?.hero?.title
  if (typeof heroTitle !== 'string' || heroTitle.length === 0) {
    fail('Public home content response did not include a non-empty hero title')
  }

  const homeContentFallbackResponse = await fetch(`${baseUrl}/api/v1/content/home?locale=de`)
  const homeContentFallbackBody = await homeContentFallbackResponse.json()

  if (!homeContentFallbackResponse.ok || !homeContentFallbackBody?.success) {
    fail(`Expected public home content locale fallback to succeed, got ${homeContentFallbackResponse.status}`)
  }

  const fallbackHeroTitle = homeContentFallbackBody?.data?.hero?.title
  if (typeof fallbackHeroTitle !== 'string' || fallbackHeroTitle.length === 0) {
    fail('Public home content locale fallback did not return a non-empty hero title')
  }

  const passkeyOptionsResponse = await fetch(`${baseUrl}/api/v1/auth/webauthn/login-options`, {
    method: 'POST',
  })
  const passkeyOptionsBody = await passkeyOptionsResponse.json()

  if (!passkeyOptionsResponse.ok || !passkeyOptionsBody?.success) {
    fail(`Expected public passkey options lookup to succeed, got ${passkeyOptionsResponse.status}`)
  }

  if (typeof passkeyOptionsBody?.meta?.hasPasskeys !== 'boolean') {
    fail('Passkey options response did not include meta.hasPasskeys')
  }

  assertPrivateApiHeaders(passkeyOptionsResponse, '/api/v1/auth/webauthn/login-options')

  const publicProfilesResponse = await fetch(`${baseUrl}/api/v1/profiles`)
  const publicProfilesBody = await publicProfilesResponse.json()

  if (!publicProfilesResponse.ok || !publicProfilesBody?.success || typeof publicProfilesBody?.data !== 'object') {
    fail(`Expected public profiles lookup to succeed, got ${publicProfilesResponse.status}`)
  }

  if (typeof publicProfilesBody?.meta?.count !== 'number') {
    fail('Public profiles response did not include numeric meta.count')
  }

  const publicLayoutsResponse = await fetch(`${baseUrl}/api/v1/layouts`)
  const publicLayoutsBody = await publicLayoutsResponse.json()

  if (!publicLayoutsResponse.ok || !publicLayoutsBody?.success || !Array.isArray(publicLayoutsBody?.data)) {
    fail(`Expected public layouts lookup to succeed, got ${publicLayoutsResponse.status}`)
  }

  if (typeof publicLayoutsBody?.meta?.count !== 'number') {
    fail('Public layouts response did not include numeric meta.count')
  }

  const publicWowupResponse = await fetch(`${baseUrl}/api/v1/wowup`)
  const publicWowupBody = await publicWowupResponse.json()

  if (!publicWowupResponse.ok || !publicWowupBody?.success || typeof publicWowupBody?.data !== 'object') {
    fail(`Expected public WowUp lookup to succeed, got ${publicWowupResponse.status}`)
  }

  if (typeof publicWowupBody?.meta?.count !== 'number') {
    fail('Public WowUp response did not include numeric meta.count')
  }

  console.log('[verify] /api/v1/content/home -> ' + homeContentResponse.status)
  console.log('[verify] /api/v1/content/home?locale=de -> ' + homeContentFallbackResponse.status)
  console.log('[verify] /api/v1/auth/webauthn/login-options -> ' + passkeyOptionsResponse.status)
  console.log('[verify] /api/v1/profiles -> ' + publicProfilesResponse.status)
  console.log('[verify] /api/v1/layouts -> ' + publicLayoutsResponse.status)
  console.log('[verify] /api/v1/wowup -> ' + publicWowupResponse.status)
}

function readCookieHeader(response) {
  const getSetCookie = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie.bind(response.headers)
    : null
  const cookieLines = getSetCookie
    ? getSetCookie()
    : [response.headers.get('set-cookie')].filter(Boolean)

  return cookieLines
    .map((value) => value.split(';', 1)[0])
    .filter(Boolean)
    .join('; ')
}

async function verifyAdminAuthFlow() {
  const unauthenticatedSessionResponse = await fetch(`${baseUrl}/api/v1/admin/sessions/current`)
  if (unauthenticatedSessionResponse.status !== 401) {
    fail(`Expected unauthenticated current session lookup to return 401, got ${unauthenticatedSessionResponse.status}`)
  }

  assertPrivateApiHeaders(unauthenticatedSessionResponse, '/api/v1/admin/sessions/current (unauthenticated)')

  const unauthenticatedSystemInfoResponse = await fetch(`${baseUrl}/api/v1/admin/system/info`)
  if (unauthenticatedSystemInfoResponse.status !== 401) {
    fail(`Expected unauthenticated system info lookup to return 401, got ${unauthenticatedSystemInfoResponse.status}`)
  }

  assertPrivateApiHeaders(unauthenticatedSystemInfoResponse, '/api/v1/admin/system/info (unauthenticated)')

  const invalidLoginResponse = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      username: `${authSmokeUsername}-invalid`,
      password: authSmokePassword,
    }),
  })

  if (invalidLoginResponse.status !== 401) {
    fail(`Expected invalid admin login to return 401, got ${invalidLoginResponse.status}`)
  }

  assertPrivateApiHeaders(invalidLoginResponse, '/api/v1/auth/login (invalid)')

  const loginResponse = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      username: authSmokeUsername,
      password: authSmokePassword,
    }),
  })

  if (loginResponse.status === 401 && !authSmokeExplicit && !authSmokeRequired) {
    console.log('[verify] Auth smoke skipped: existing admin password does not match the seeded smoke password.')
    return
  }

  const loginBody = await loginResponse.json()
  if (!loginResponse.ok || !loginBody?.success) {
    fail(`Expected admin login to succeed, got ${loginResponse.status}`)
  }

  assertPrivateApiHeaders(loginResponse, '/api/v1/auth/login')

  const authCookie = readCookieHeader(loginResponse)

  if (!authCookie) {
    fail('Admin login did not return an auth cookie')
  }

  const sessionResponse = await fetch(`${baseUrl}/api/v1/admin/sessions/current`, {
    headers: {
      cookie: authCookie,
    },
  })
  const sessionBody = await sessionResponse.json()

  if (!sessionResponse.ok || !sessionBody?.success) {
    fail(`Expected current session lookup to succeed, got ${sessionResponse.status}`)
  }

  assertPrivateApiHeaders(sessionResponse, '/api/v1/admin/sessions/current')

  if (sessionBody?.data?.user?.username !== authSmokeUsername) {
    fail('Current session response did not return the expected admin user')
  }

  const sessionsResponse = await fetch(`${baseUrl}/api/v1/admin/sessions`, {
    headers: {
      cookie: authCookie,
    },
  })
  const sessionsBody = await sessionsResponse.json()

  if (!sessionsResponse.ok || !sessionsBody?.success || !Array.isArray(sessionsBody?.data)) {
    fail(`Expected session list lookup to succeed, got ${sessionsResponse.status}`)
  }

  assertPrivateApiHeaders(sessionsResponse, '/api/v1/admin/sessions')

  if (!sessionsBody.data.some((session) => session?.isCurrent === true)) {
    fail('Session list response did not mark a current session')
  }

  const passkeysResponse = await fetch(`${baseUrl}/api/v1/admin/passkeys`, {
    headers: {
      cookie: authCookie,
    },
  })
  const passkeysBody = await passkeysResponse.json()

  if (!passkeysResponse.ok || !passkeysBody?.success || !Array.isArray(passkeysBody?.data)) {
    fail(`Expected passkeys lookup to succeed, got ${passkeysResponse.status}`)
  }

  assertPrivateApiHeaders(passkeysResponse, '/api/v1/admin/passkeys')

  const loginAttemptsResponse = await fetch(`${baseUrl}/api/v1/admin/sessions/login-attempts?limit=5`, {
    headers: {
      cookie: authCookie,
    },
  })
  const loginAttemptsBody = await loginAttemptsResponse.json()

  if (!loginAttemptsResponse.ok || !loginAttemptsBody?.success || !Array.isArray(loginAttemptsBody?.data)) {
    fail(`Expected login attempts lookup to succeed, got ${loginAttemptsResponse.status}`)
  }

  assertPrivateApiHeaders(loginAttemptsResponse, '/api/v1/admin/sessions/login-attempts')

  if (typeof loginAttemptsBody?.meta?.stats?.totalAttempts !== 'number') {
    fail('Login attempts response did not include numeric stats')
  }

  const systemInfoResponse = await fetch(`${baseUrl}/api/v1/admin/system/info`, {
    headers: {
      cookie: authCookie,
    },
  })
  const systemInfoBody = await systemInfoResponse.json()

  if (!systemInfoResponse.ok || !systemInfoBody?.success) {
    fail(`Expected admin system info lookup to succeed, got ${systemInfoResponse.status}`)
  }

  assertPrivateApiHeaders(systemInfoResponse, '/api/v1/admin/system/info')

  const adminSettingsResponse = await fetch(`${baseUrl}/api/v1/admin/settings`, {
    headers: {
      cookie: authCookie,
    },
  })
  const adminSettingsBody = await adminSettingsResponse.json()

  if (!adminSettingsResponse.ok || !adminSettingsBody?.success || typeof adminSettingsBody?.data !== 'object') {
    fail(`Expected admin settings lookup to succeed, got ${adminSettingsResponse.status}`)
  }

  assertPrivateApiHeaders(adminSettingsResponse, '/api/v1/admin/settings')

  const notificationsResponse = await fetch(`${baseUrl}/api/v1/admin/notifications`, {
    headers: {
      cookie: authCookie,
    },
  })
  const notificationsBody = await notificationsResponse.json()

  if (!notificationsResponse.ok || !notificationsBody?.success || !Array.isArray(notificationsBody?.data)) {
    fail(`Expected admin notifications lookup to succeed, got ${notificationsResponse.status}`)
  }

  assertPrivateApiHeaders(notificationsResponse, '/api/v1/admin/notifications')

  const statsResponse = await fetch(`${baseUrl}/api/v1/admin/stats`, {
    headers: {
      cookie: authCookie,
    },
  })
  const statsBody = await statsResponse.json()

  if (!statsResponse.ok || !statsBody?.success || typeof statsBody?.data !== 'object') {
    fail(`Expected admin stats lookup to succeed, got ${statsResponse.status}`)
  }

  if (typeof statsBody?.data?.profiles !== 'number' || typeof statsBody?.data?.totalCopies !== 'number') {
    fail('Admin stats response did not include numeric summary counts')
  }

  assertPrivateApiHeaders(statsResponse, '/api/v1/admin/stats')

  const apiKeysResponse = await fetch(`${baseUrl}/api/v1/admin/api-keys`, {
    headers: {
      cookie: authCookie,
    },
  })
  const apiKeysBody = await apiKeysResponse.json()

  if (!apiKeysResponse.ok || !apiKeysBody?.success || !Array.isArray(apiKeysBody?.data)) {
    fail(`Expected admin api keys lookup to succeed, got ${apiKeysResponse.status}`)
  }

  assertPrivateApiHeaders(apiKeysResponse, '/api/v1/admin/api-keys')

  const githubStatusResponse = await fetch(`${baseUrl}/api/v1/admin/github/status`, {
    headers: {
      cookie: authCookie,
    },
  })
  const githubStatusBody = await githubStatusResponse.json()

  if (!githubStatusResponse.ok || !githubStatusBody?.success || typeof githubStatusBody?.data !== 'object') {
    fail(`Expected admin GitHub status lookup to succeed, got ${githubStatusResponse.status}`)
  }

  if (typeof githubStatusBody?.data?.configured !== 'boolean') {
    fail('Admin GitHub status response did not include configured state')
  }

  assertPrivateApiHeaders(githubStatusResponse, '/api/v1/admin/github/status')

  const contentResponse = await fetch(`${baseUrl}/api/v1/admin/content/home`, {
    headers: {
      cookie: authCookie,
    },
  })
  const contentBody = await contentResponse.json()

  if (!contentResponse.ok || !contentBody?.success || typeof contentBody?.data !== 'object') {
    fail(`Expected admin content lookup to succeed, got ${contentResponse.status}`)
  }

  assertPrivateApiHeaders(contentResponse, '/api/v1/admin/content/home')

  const faqsAdminResponse = await fetch(`${baseUrl}/api/v1/admin/faqs`, {
    headers: {
      cookie: authCookie,
    },
  })
  const faqsAdminBody = await faqsAdminResponse.json()

  if (!faqsAdminResponse.ok || !faqsAdminBody?.success || !Array.isArray(faqsAdminBody?.data)) {
    fail(`Expected admin FAQ lookup to succeed, got ${faqsAdminResponse.status}`)
  }

  assertPrivateApiHeaders(faqsAdminResponse, '/api/v1/admin/faqs')

  const fieldsResponse = await fetch(`${baseUrl}/api/v1/admin/fields`, {
    headers: {
      cookie: authCookie,
    },
  })
  const fieldsBody = await fieldsResponse.json()

  if (!fieldsResponse.ok || !fieldsBody?.success || !Array.isArray(fieldsBody?.data)) {
    fail(`Expected admin fields lookup to succeed, got ${fieldsResponse.status}`)
  }

  assertPrivateApiHeaders(fieldsResponse, '/api/v1/admin/fields')

  const changelogsResponse = await fetch(`${baseUrl}/api/v1/admin/changelogs`, {
    headers: {
      cookie: authCookie,
    },
  })
  const changelogsBody = await changelogsResponse.json()

  if (!changelogsResponse.ok || !changelogsBody?.success || !Array.isArray(changelogsBody?.data)) {
    fail(`Expected admin changelogs lookup to succeed, got ${changelogsResponse.status}`)
  }

  assertPrivateApiHeaders(changelogsResponse, '/api/v1/admin/changelogs')

  const adminProfilesResponse = await fetch(`${baseUrl}/api/v1/admin/profiles`, {
    headers: {
      cookie: authCookie,
    },
  })
  const adminProfilesBody = await adminProfilesResponse.json()

  if (!adminProfilesResponse.ok || !adminProfilesBody?.success || !Array.isArray(adminProfilesBody?.data)) {
    fail(`Expected admin profiles lookup to succeed, got ${adminProfilesResponse.status}`)
  }

  assertPrivateApiHeaders(adminProfilesResponse, '/api/v1/admin/profiles')

  const adminLayoutsResponse = await fetch(`${baseUrl}/api/v1/admin/layouts`, {
    headers: {
      cookie: authCookie,
    },
  })
  const adminLayoutsBody = await adminLayoutsResponse.json()

  if (!adminLayoutsResponse.ok || !adminLayoutsBody?.success || !Array.isArray(adminLayoutsBody?.data)) {
    fail(`Expected admin layouts lookup to succeed, got ${adminLayoutsResponse.status}`)
  }

  assertPrivateApiHeaders(adminLayoutsResponse, '/api/v1/admin/layouts')

  const adminWowupResponse = await fetch(`${baseUrl}/api/v1/admin/wowup`, {
    headers: {
      cookie: authCookie,
    },
  })
  const adminWowupBody = await adminWowupResponse.json()

  if (!adminWowupResponse.ok || !adminWowupBody?.success || !Array.isArray(adminWowupBody?.data)) {
    fail(`Expected admin WowUp lookup to succeed, got ${adminWowupResponse.status}`)
  }

  assertPrivateApiHeaders(adminWowupResponse, '/api/v1/admin/wowup')

  const usersResponse = await fetch(`${baseUrl}/api/v1/admin/users`, {
    headers: {
      cookie: authCookie,
    },
  })
  const usersBody = await usersResponse.json()

  if (!usersResponse.ok || !usersBody?.success || !Array.isArray(usersBody?.data)) {
    fail(`Expected admin users lookup to succeed, got ${usersResponse.status}`)
  }

  if (!usersBody.data.some((user) => user?.username === authSmokeUsername)) {
    fail('Admin users response did not include the active admin user')
  }

  assertPrivateApiHeaders(usersResponse, '/api/v1/admin/users')

  const activityStatsResponse = await fetch(`${baseUrl}/api/v1/admin/activity/stats`, {
    headers: {
      cookie: authCookie,
    },
  })
  const activityStatsBody = await activityStatsResponse.json()

  if (!activityStatsResponse.ok || !activityStatsBody?.success) {
    fail(`Expected admin activity stats lookup to succeed, got ${activityStatsResponse.status}`)
  }

  if (typeof activityStatsBody?.data?.created !== 'number') {
    fail('Admin activity stats response did not include numeric counters')
  }

  assertPrivateApiHeaders(activityStatsResponse, '/api/v1/admin/activity/stats')

  const activityResponse = await fetch(`${baseUrl}/api/v1/admin/activity?limit=5`, {
    headers: {
      cookie: authCookie,
    },
  })
  const activityBody = await activityResponse.json()

  if (!activityResponse.ok || !activityBody?.success || !Array.isArray(activityBody?.data?.items)) {
    fail(`Expected admin activity lookup to succeed, got ${activityResponse.status}`)
  }

  if (typeof activityBody?.data?.total !== 'number') {
    fail('Admin activity response did not include numeric totals')
  }

  assertPrivateApiHeaders(activityResponse, '/api/v1/admin/activity')

  const secondLoginResponse = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      username: authSmokeUsername,
      password: authSmokePassword,
    }),
  })
  const secondLoginBody = await secondLoginResponse.json()

  if (!secondLoginResponse.ok || !secondLoginBody?.success) {
    fail(`Expected second admin login to succeed, got ${secondLoginResponse.status}`)
  }

  const secondAuthCookie = readCookieHeader(secondLoginResponse)

  if (!secondAuthCookie) {
    fail('Second admin login did not return an auth cookie')
  }

  const revokeOthersResponse = await fetch(`${baseUrl}/api/v1/admin/sessions/revoke-others`, {
    method: 'POST',
    headers: {
      cookie: authCookie,
    },
  })
  const revokeOthersBody = await revokeOthersResponse.json()

  if (!revokeOthersResponse.ok || !revokeOthersBody?.success) {
    fail(`Expected revoke-others to succeed, got ${revokeOthersResponse.status}`)
  }

  assertPrivateApiHeaders(revokeOthersResponse, '/api/v1/admin/sessions/revoke-others')

  if ((revokeOthersBody?.data?.revokedCount ?? 0) < 1) {
    fail('Expected revoke-others to revoke at least one additional session')
  }

  const revokedOtherSessionResponse = await fetch(`${baseUrl}/api/v1/admin/sessions/current`, {
    headers: {
      cookie: secondAuthCookie,
    },
  })

  if (revokedOtherSessionResponse.status !== 401) {
    fail(`Expected revoked secondary session check to return 401, got ${revokedOtherSessionResponse.status}`)
  }

  assertPrivateApiHeaders(revokedOtherSessionResponse, 'revoked secondary /api/v1/admin/sessions/current')

  const survivingSessionResponse = await fetch(`${baseUrl}/api/v1/admin/sessions/current`, {
    headers: {
      cookie: authCookie,
    },
  })
  const survivingSessionBody = await survivingSessionResponse.json()

  if (!survivingSessionResponse.ok || !survivingSessionBody?.success) {
    fail(`Expected primary session to remain valid after revoke-others, got ${survivingSessionResponse.status}`)
  }

  assertPrivateApiHeaders(survivingSessionResponse, 'surviving /api/v1/admin/sessions/current')

  const logoutResponse = await fetch(`${baseUrl}/api/v1/auth/logout`, {
    method: 'POST',
    headers: {
      cookie: authCookie,
    },
  })

  if (!logoutResponse.ok) {
    fail(`Expected logout to succeed, got ${logoutResponse.status}`)
  }

  assertPrivateApiHeaders(logoutResponse, '/api/v1/auth/logout')

  const revokedResponse = await fetch(`${baseUrl}/api/v1/admin/sessions/current`, {
    headers: {
      cookie: authCookie,
    },
  })

  if (revokedResponse.status !== 401) {
    fail(`Expected revoked session check to return 401, got ${revokedResponse.status}`)
  }

  assertPrivateApiHeaders(revokedResponse, 'revoked /api/v1/admin/sessions/current')

  console.log('[verify] unauthenticated /api/v1/admin/sessions/current -> ' + unauthenticatedSessionResponse.status)
  console.log('[verify] unauthenticated /api/v1/admin/system/info -> ' + unauthenticatedSystemInfoResponse.status)
  console.log('[verify] invalid /api/v1/auth/login -> ' + invalidLoginResponse.status)
  console.log('[verify] /api/v1/auth/login -> ' + loginResponse.status)
  console.log('[verify] /api/v1/admin/sessions/current -> ' + sessionResponse.status)
  console.log('[verify] /api/v1/admin/sessions -> ' + sessionsResponse.status)
  console.log('[verify] /api/v1/admin/passkeys -> ' + passkeysResponse.status)
  console.log('[verify] /api/v1/admin/sessions/login-attempts -> ' + loginAttemptsResponse.status)
  console.log('[verify] /api/v1/admin/system/info -> ' + systemInfoResponse.status)
  console.log('[verify] /api/v1/admin/settings -> ' + adminSettingsResponse.status)
  console.log('[verify] /api/v1/admin/notifications -> ' + notificationsResponse.status)
  console.log('[verify] /api/v1/admin/stats -> ' + statsResponse.status)
  console.log('[verify] /api/v1/admin/api-keys -> ' + apiKeysResponse.status)
  console.log('[verify] /api/v1/admin/github/status -> ' + githubStatusResponse.status)
  console.log('[verify] /api/v1/admin/content/home -> ' + contentResponse.status)
  console.log('[verify] /api/v1/admin/faqs -> ' + faqsAdminResponse.status)
  console.log('[verify] /api/v1/admin/fields -> ' + fieldsResponse.status)
  console.log('[verify] /api/v1/admin/changelogs -> ' + changelogsResponse.status)
  console.log('[verify] /api/v1/admin/profiles -> ' + adminProfilesResponse.status)
  console.log('[verify] /api/v1/admin/layouts -> ' + adminLayoutsResponse.status)
  console.log('[verify] /api/v1/admin/wowup -> ' + adminWowupResponse.status)
  console.log('[verify] /api/v1/admin/users -> ' + usersResponse.status)
  console.log('[verify] /api/v1/admin/activity/stats -> ' + activityStatsResponse.status)
  console.log('[verify] /api/v1/admin/activity -> ' + activityResponse.status)
  console.log('[verify] second /api/v1/auth/login -> ' + secondLoginResponse.status)
  console.log('[verify] /api/v1/admin/sessions/revoke-others -> ' + revokeOthersResponse.status)
  console.log('[verify] revoked secondary session -> ' + revokedOtherSessionResponse.status)
  console.log('[verify] /api/v1/auth/logout -> ' + logoutResponse.status)
  console.log('[verify] revoked admin session -> ' + revokedResponse.status)
}

port = await resolveSmokePort()
baseUrl = process.env.SMOKE_BASE_URL || `http://127.0.0.1:${port}`

const child = spawn(process.execPath, [serverEntrypoint], {
  env: {
    ...process.env,
    NODE_ENV: 'production',
    NITRO_PORT: String(port),
    PORT: String(port),
    HOST: '127.0.0.1',
    NITRO_HOST: '127.0.0.1',
    NUXT_JWT_SECRET: process.env.NUXT_JWT_SECRET || 'smoke-test-secret-not-for-production',
    NUXT_ADMIN_PASSWORD: seededAdminPassword,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
})

let stdout = ''
let stderr = ''

child.stdout.on('data', (chunk) => {
  const text = chunk.toString()
  stdout += text
  process.stdout.write(text)
})

child.stderr.on('data', (chunk) => {
  const text = chunk.toString()
  stderr += text
  process.stderr.write(text)
})

try {
  await waitForServer()
  await verifyEndpoints()
  await verifyPublicApiFlows()
  await verifyAdminAuthFlow()
  console.log('[verify] Smoke test passed')
} catch (error) {
  const details = [stdout.trim(), stderr.trim()].filter(Boolean).join('\n')
  if (details) console.error('[verify] Captured server output:\n' + details)
  throw error
} finally {
  child.kill('SIGTERM')
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    delay(5000).then(() => {
      if (!child.killed) child.kill('SIGKILL')
    }),
  ])
}
