/**
 * Sequential production starts for the NUXT_ADS master switch.
 * Missing, empty, and set-to-on must all reach /api/health without crashing.
 * Does not mutate runtimeConfig; empty is off. Supplies a dummy
 * NUXT_ADMIN_PASSWORD when the caller left it unset so a standalone run
 * can create the first admin. After each start, checks AdSlot markup on a
 * fixture-filled spec page (present only when the flag is on).
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createServer } from 'node:net'
import { setTimeout as delay } from 'node:timers/promises'

const serverEntrypoint = '.output/server/index.mjs'
const startupTimeoutMs = 30000
const dummyJwt = 'smoke-test-secret-not-for-production'
const dummyAdmin = 'smoke-test-password-not-for-production'

if (!existsSync(serverEntrypoint)) {
  throw new Error(`Ads runtime test requires ${serverEntrypoint}. Run "npm run build" first.`)
}

function fail(message, cause) {
  const error = cause instanceof Error ? cause : new Error(String(cause || message))
  error.message = message + (cause ? `\n${error.message}` : '')
  throw error
}

async function reservePort() {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.unref()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      server.close(() => resolve(port))
    })
  })
}

function runSeed() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', 'scripts/seed-meta-fixture.ts'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    })
    let output = ''
    child.stdout.on('data', (chunk) => { output += chunk.toString() })
    child.stderr.on('data', (chunk) => { output += chunk.toString() })
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`fixture seed exited ${code}: ${output.trim()}`))
    })
  })
}

async function waitForHealth(baseUrl, child) {
  const deadline = Date.now() + startupTimeoutMs
  let last = ''
  while (Date.now() < deadline) {
    if (child.exitCode != null) fail(`server exited ${child.exitCode} before health: ${last}`)
    try {
      const response = await fetch(`${baseUrl}/api/health`)
      if (response.ok) {
        const body = await response.json()
        if (body?.status !== 'ok') fail(`health status ${JSON.stringify(body)}`)
        return
      }
      last = `HTTP ${response.status}`
    } catch (err) {
      last = err instanceof Error ? err.message : String(err)
    }
    await delay(400)
  }
  fail(`server did not become ready within ${startupTimeoutMs / 1000}s (${last})`)
}

async function assertSlotMarkup(baseUrl, expectPresent) {
  const response = await fetch(`${baseUrl}/meta/mage/fire`)
  if (!response.ok) fail(`GET /meta/mage/fire HTTP ${response.status}`)
  const html = await response.text()
  const hasSlot = /data-ad-placement="(sidebar|after-build)"/.test(html)
  if (expectPresent && !hasSlot) fail('expected AdSlot markup on /meta/mage/fire when NUXT_ADS is on')
  if (!expectPresent && hasSlot) fail('AdSlot markup must be absent when NUXT_ADS is off or empty')
}

async function startOnce(label, adsEnv, expectSlot) {
  const port = await reservePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const env = { ...process.env }
  delete env.NUXT_ADS
  delete env.NUXT_PUBLIC_ADS
  if (Object.prototype.hasOwnProperty.call(adsEnv, 'NUXT_ADS')) env.NUXT_ADS = adsEnv.NUXT_ADS
  if (Object.prototype.hasOwnProperty.call(adsEnv, 'NUXT_PUBLIC_ADS')) env.NUXT_PUBLIC_ADS = adsEnv.NUXT_PUBLIC_ADS
  const child = spawn(process.execPath, [serverEntrypoint], {
    env: {
      ...env,
      NODE_ENV: 'production',
      NITRO_PORT: String(port),
      PORT: String(port),
      HOST: '127.0.0.1',
      NITRO_HOST: '127.0.0.1',
      NUXT_JWT_SECRET: process.env.NUXT_JWT_SECRET || dummyJwt,
      NUXT_ADMIN_PASSWORD: process.env.NUXT_ADMIN_PASSWORD || dummyAdmin,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = ''
  child.stdout.on('data', (chunk) => { output += chunk.toString() })
  child.stderr.on('data', (chunk) => { output += chunk.toString() })
  try {
    await waitForHealth(baseUrl, child)
    await assertSlotMarkup(baseUrl, expectSlot)
    console.log(`[verify-ads] ${label}: /api/health 200, slot markup ${expectSlot ? 'present' : 'absent'}`)
  } catch (err) {
    if (output.trim()) console.error(`[verify-ads] ${label} output:\n${output.trim()}`)
    throw err
  } finally {
    child.kill('SIGTERM')
    await Promise.race([
      new Promise(resolve => child.once('exit', resolve)),
      delay(5000).then(() => { if (child.exitCode == null) child.kill('SIGKILL') }),
    ])
  }
}

export async function verifyAdsProdStarts() {
  // Strictly one process at a time (OOM). Seed once so /meta/mage/fire is filled.
  await runSeed()
  await startOnce('NUXT_ADS missing', {}, false)
  await startOnce('NUXT_ADS empty', { NUXT_ADS: '' }, false)
  await startOnce('NUXT_ADS=on', { NUXT_ADS: 'on' }, true)
  console.log('[verify-ads] production starts passed (missing, empty, on) with slot markup checks')
}

const isMain = import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('verify-ads-runtime.mjs')
if (isMain) {
  await verifyAdsProdStarts()
}
