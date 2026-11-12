/**
 * Sequential production starts for the NUXT_ADS master switch.
 * Missing, empty, and set-to-on must all reach /api/health without crashing.
 * Does not mutate runtimeConfig; empty is off.
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createServer } from 'node:net'
import { setTimeout as delay } from 'node:timers/promises'

const serverEntrypoint = '.output/server/index.mjs'
const startupTimeoutMs = 30000

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

async function startOnce(label, adsEnv) {
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
      NUXT_JWT_SECRET: process.env.NUXT_JWT_SECRET || 'smoke-test-secret-not-for-production',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = ''
  child.stdout.on('data', (chunk) => { output += chunk.toString() })
  child.stderr.on('data', (chunk) => { output += chunk.toString() })
  try {
    await waitForHealth(baseUrl, child)
    console.log(`[verify-ads] ${label}: /api/health 200`)
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
  // Strictly one process at a time (OOM).
  await startOnce('NUXT_ADS missing', {})
  await startOnce('NUXT_ADS empty', { NUXT_ADS: '' })
  await startOnce('NUXT_ADS=on', { NUXT_ADS: 'on' })
  console.log('[verify-ads] production starts passed (missing, empty, on)')
}

const isMain = import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('verify-ads-runtime.mjs')
if (isMain) {
  await verifyAdsProdStarts()
}
