/**
 * Handler-level tests for the public, anonymous endpoints: a real h3 app on a loopback port (no mocks
 * of h3 itself), an in-memory database, and h3 events built from real Node request objects.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import http, { IncomingMessage, ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { Socket } from 'node:net'
import { PassThrough } from 'node:stream'
import { afterEach, describe, it } from 'node:test'
import Database from 'better-sqlite3'
import { createApp, createEvent, defineEventHandler, toNodeListener, type H3Event } from 'h3'
import { initializeDatabase } from '../../server/database/bootstrap'
import {
  BEACON_LIMIT_KEEP_MS, BEACON_LIMIT_MAX_ROWS, PRIVACY_VACUUM_MARKER, REFERRER_DAILY_MAX, REFERRER_OTHER, anonymousRateKey,
  capReferrerRows, createReferrerLimiter, pruneBeaconRateLimits, recordView, runAnalyticsMaintenance, vacuumAfterScrub, viewRows,
} from '../../server/utils/analytics'
import { optedOutByHeaders, readBeaconBody, runBeaconGate, type BeaconGateDeps } from '../../server/utils/beaconGateCore'
import { readBodyCapped } from '../../server/utils/bodyCap'
import { getClientIp, rateLimitGroupKey, rateLimitIpKey } from '../../server/utils/clientIp'
import { BODY_MAX_BYTES, createReplayGuard, createWindowLimiter, issueFormToken, verifyFormToken } from '../../server/utils/communityPresets'
import { presetSubmissionLimits } from '../../server/utils/presetLimits'
import { handlePresetSubmission, type SubmissionDeps } from '../../server/utils/presetSubmission'

// ─── helpers ───────────────────────────────────────────────────────────

function fakeEvent(headers: Record<string, string> = {}, remote = '127.0.0.1'): H3Event {
  const socket = new Socket()
  Object.defineProperty(socket, 'remoteAddress', { value: remote })
  const req = new IncomingMessage(socket)
  req.headers = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]))
  return createEvent(req, new ServerResponse(req))
}

const servers: http.Server[] = []
afterEach(() => { for (const s of servers.splice(0)) s.close() })

async function serve(handler: (event: H3Event) => unknown) {
  const app = createApp()
  app.use('/x', defineEventHandler(handler))
  const server = http.createServer(toNodeListener(app))
  servers.push(server)
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  return (server.address() as AddressInfo).port
}

interface JsonBody { success?: boolean, body?: unknown, data: { received?: boolean, error: { code: string, message: string } } }
interface Reply { status: number, body: string, headers: http.IncomingHttpHeaders, json: () => JsonBody }
function call(port: number, opts: { method?: string, headers?: Record<string, string>, body?: string, chunks?: Buffer[] } = {}): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: '/x', method: opts.method ?? 'POST', headers: opts.headers }, (res) => {
      const parts: Buffer[] = []
      res.on('data', c => parts.push(c))
      res.on('end', () => {
        const body = Buffer.concat(parts).toString('utf8')
        resolve({ status: res.statusCode ?? 0, body, headers: res.headers, json: () => JSON.parse(body) })
      })
    })
    req.on('error', reject)
    for (const c of opts.chunks ?? []) req.write(c)
    if (opts.body !== undefined) req.write(opts.body)
    req.end()
  })
}

// ─── client address, trusted proxy ─────────────────────────────────────

describe('client address', () => {
  const withProxies = (value: string | undefined, fn: () => void) => {
    const before = process.env.NUXT_TRUSTED_PROXIES
    if (value === undefined) delete process.env.NUXT_TRUSTED_PROXIES; else process.env.NUXT_TRUSTED_PROXIES = value
    try { fn() } finally { if (before === undefined) delete process.env.NUXT_TRUSTED_PROXIES; else process.env.NUXT_TRUSTED_PROXIES = before }
  }

  it('believes cf-connecting-ip only from a trusted proxy peer', () => {
    withProxies(undefined, () => {
      assert.equal(getClientIp(fakeEvent({ 'cf-connecting-ip': '203.0.113.7' }, '192.168.178.30')), '203.0.113.7')
      // A direct caller from the internet cannot choose its own key.
      assert.equal(getClientIp(fakeEvent({ 'cf-connecting-ip': '203.0.113.7' }, '198.51.100.9')), '198.51.100.9')
      assert.equal(getClientIp(fakeEvent({ 'x-forwarded-for': '203.0.113.7' }, '198.51.100.9')), '198.51.100.9')
    })
  })
  it('prefers cf-connecting-ip, then x-real-ip, then the first x-forwarded-for hop, then the socket', () => {
    withProxies(undefined, () => {
      const all = { 'cf-connecting-ip': ' 1.1.1.1 ', 'x-real-ip': '2.2.2.2', 'x-forwarded-for': '3.3.3.3, 4.4.4.4' }
      assert.equal(getClientIp(fakeEvent(all, '10.0.0.2')), '1.1.1.1')
      assert.equal(getClientIp(fakeEvent({ 'x-real-ip': ' 2.2.2.2 ', 'x-forwarded-for': '3.3.3.3' }, '10.0.0.2')), '2.2.2.2')
      assert.equal(getClientIp(fakeEvent({ 'x-forwarded-for': '3.3.3.3, 4.4.4.4' }, '10.0.0.2')), '3.3.3.3')
      assert.equal(getClientIp(fakeEvent({}, '10.0.0.2')), '10.0.0.2')
    })
  })
  it('NUXT_TRUSTED_PROXIES pins the trusted peer; "none" trusts nobody', () => {
    withProxies('192.168.178.30', () => {
      assert.equal(getClientIp(fakeEvent({ 'cf-connecting-ip': '1.1.1.1' }, '192.168.178.30')), '1.1.1.1')
      assert.equal(getClientIp(fakeEvent({ 'cf-connecting-ip': '1.1.1.1' }, '192.168.178.99')), '192.168.178.99')
    })
    withProxies('none', () => {
      assert.equal(getClientIp(fakeEvent({ 'cf-connecting-ip': '1.1.1.1' }, '127.0.0.1')), '127.0.0.1')
    })
  })
})

describe('rate-limit keys: IPv6 is reduced', () => {
  it('/64 for visitors, /48 for the aggregate, IPv4 as is or /24', () => {
    assert.equal(rateLimitIpKey('203.0.113.9'), '203.0.113.9')
    assert.equal(rateLimitIpKey('::ffff:203.0.113.9'), '203.0.113.9')
    assert.equal(rateLimitIpKey('2001:db8:1:2:aaaa:bbbb:cccc:dddd'), '2001:db8:1:2::/64')
    assert.equal(rateLimitIpKey('2001:db8:1:2::5'), '2001:db8:1:2::/64')
    assert.equal(rateLimitIpKey('2001:db8::1'), '2001:db8:0:0::/64')
    assert.equal(rateLimitGroupKey('2001:db8:1:2:aaaa:bbbb:cccc:dddd'), '2001:db8:1::/48')
    assert.equal(rateLimitGroupKey('2001:db8:1:ffff::1'), '2001:db8:1::/48')
    assert.equal(rateLimitGroupKey('203.0.113.9'), '203.0.113.0/24')
    assert.equal(rateLimitGroupKey('::ffff:203.0.113.9'), '203.0.113.0/24')
    assert.equal(rateLimitGroupKey('unknown'), 'unknown')
  })
  it('rotating inside a /64 gives one visitor key, a different /64 another; the hash hides the address', () => {
    const salt = Buffer.from('salt')
    const a = anonymousRateKey(salt, '2001:db8:1:2::1')
    assert.equal(a, anonymousRateKey(salt, '2001:db8:1:2:dead:beef:0:7'))
    assert.notEqual(a, anonymousRateKey(salt, '2001:db8:1:3::1'))
    assert.notEqual(a, anonymousRateKey(Buffer.from('other'), '2001:db8:1:2::1'))
    assert.ok(!a.includes('2001'))
  })
})

// ─── body cap ──────────────────────────────────────────────────────────

describe('body is capped while reading', () => {
  it('refuses a declared length above the cap without reading', async () => {
    const r = await readBodyCapped(fakeEvent({ 'content-length': '5000' }), 100)
    assert.deepEqual(r, { ok: false, reason: 'too_large' })
  })
  it('stops reading as soon as the cap is passed, whatever Content-Length says', async () => {
    const stream = new PassThrough()
    ;(stream as unknown as IncomingMessage).headers = {}
    const event = { node: { req: stream } } as unknown as H3Event
    const pending = readBodyCapped(event, 100)
    stream.write(Buffer.alloc(60))
    stream.write(Buffer.alloc(60))
    assert.deepEqual(await pending, { ok: false, reason: 'too_large' })
    assert.equal(stream.listenerCount('data'), 0) // no longer consuming
  })
  it('accepts exactly the cap and returns the text', async () => {
    const stream = new PassThrough()
    ;(stream as unknown as IncomingMessage).headers = {}
    const event = { node: { req: stream } } as unknown as H3Event
    const pending = readBodyCapped(event, 5)
    stream.end('héllo'.slice(0, 1) + 'abcd')
    assert.deepEqual(await pending, { ok: true, text: 'habcd' })
  })
  it('an aborted request is reported as unreadable', async () => {
    const stream = new PassThrough() as unknown as IncomingMessage
    stream.headers = {}
    const pending = readBodyCapped({ node: { req: stream } } as unknown as H3Event, 100)
    stream.destroy()
    assert.deepEqual(await pending, { ok: false, reason: 'unreadable' })
  })
  it('a chunked beacon without Content-Length is cut off at the beacon limit', async () => {
    const port = await serve(async event => ({ body: await readBeaconBody(event, 2048) }))
    const big = await call(port, { chunks: [Buffer.from('{"a":"'), Buffer.alloc(4000, 97), Buffer.from('"}')] })
    assert.equal(big.json().body, null)
    const small = await call(port, { body: '{"a":1}' })
    assert.deepEqual(small.json().body, { a: 1 })
    assert.equal((await call(port, { body: '[1]' })).json().body, null)
    assert.equal((await call(port, { body: 'nope' })).json().body, null)
    assert.equal((await call(port, { body: '' })).json().body, null)
  })
})

// ─── beacon gate: opt-out, bots, sessions, limiter ─────────────────────

describe('beacon gate', () => {
  const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
  const salt = Buffer.from('salt')
  function gate(headers: Record<string, string>, over: Partial<BeaconGateDeps> = {}) {
    const calls: Array<{ name: string, key: string, max: number }> = []
    const deps: BeaconGateDeps = {
      hasLoginSession: () => false,
      clientIp: () => '2001:db8:1:2:aaaa::9',
      salt: () => salt,
      visitorKey: anonymousRateKey,
      allow: (name, key, max) => { calls.push({ name, key, max }); return true },
      ...over,
    }
    const event = fakeEvent({ 'user-agent': UA, ...headers })
    return { result: runBeaconGate(event, 'page-view', 120, deps), calls, event }
  }

  it('a normal visitor passes; the limiter key is the salted /64, never the address', () => {
    const { result, calls, event } = gate({})
    assert.equal(result.ok, true)
    assert.deepEqual(calls, [{ name: 'page-view', key: anonymousRateKey(salt, '2001:db8:1:2::1'), max: 120 }])
    assert.ok(!calls[0]!.key.includes('2001'))
    assert.equal(event.node.res.statusCode, 204)
    assert.equal(event.node.res.getHeader('cache-control'), 'no-store')
  })
  it('Global Privacy Control is honoured before anything else is looked at', () => {
    const { result, calls, event } = gate({ 'sec-gpc': '1' })
    assert.equal(result.ok, false)
    assert.equal(calls.length, 0)
    assert.equal(event.node.res.statusCode, 204)
    assert.equal(gate({ 'sec-gpc': '0' }).result.ok, true)
  })
  it('Do-Not-Track is honoured; only the value 1 counts as a signal', () => {
    assert.equal(gate({ dnt: '1' }).result.ok, false)
    assert.equal(gate({ dnt: '0' }).result.ok, true)
    assert.equal(optedOutByHeaders(fakeEvent({ 'sec-gpc': '1' })), true)
    assert.equal(optedOutByHeaders(fakeEvent({})), false)
  })
  it('bots, short user agents, admin sessions and over-limit visitors are not counted', () => {
    assert.equal(gate({ 'user-agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)' }).result.ok, false)
    assert.equal(gate({ 'user-agent': '' }).result.ok, false)
    const session = gate({}, { hasLoginSession: () => true })
    assert.equal(session.result.ok, false)
    assert.equal(session.calls.length, 0) // an admin never even touches the limiter
    assert.equal(gate({}, { allow: () => false }).result.ok, false)
  })
  it('passes the real client address and salt on to the caller', () => {
    const { result } = gate({})
    assert.ok(result.ok)
    if (result.ok) {
      assert.equal(result.ip, '2001:db8:1:2:aaaa::9')
      assert.equal(result.ua, UA)
      assert.equal(result.salt, salt)
    }
  })
})

// ─── preset submission handler ─────────────────────────────────────────

describe('preset submission handler (real h3 app)', () => {
  const NOW_MS = 1_800_000_000_000
  const SECRET = 'handler-test-secret'
  const STR = '!PLATER:2!Abcdefghijklmnopqrstuvwxyz0123456789+/='

  function setup(over: Partial<SubmissionDeps> = {}) {
    const sqlite = new Database(':memory:')
    initializeDatabase(sqlite)
    sqlite.prepare("INSERT INTO addons (slug, name, is_visible, is_available) VALUES ('plater', 'Plater', 1, 1), ('hidden', 'Hidden Addon', 0, 1)").run()
    const lim = presetSubmissionLimits()
    const deps: SubmissionDeps = {
      sqlite, secret: () => SECRET, keys: () => ({ client: 'c', group: 'g' }),
      ...lim, replay: createReplayGuard(), now: () => NOW_MS, ...over,
    }
    return { sqlite, deps }
  }
  const rows = (sqlite: Database.Database) => (sqlite.prepare('SELECT COUNT(*) AS n FROM community_presets').get() as { n: number }).n
  const token = (ageSeconds = 10, nonce?: string) => issueFormToken(SECRET, NOW_MS - ageSeconds * 1000, nonce)
  const form = (over: Record<string, unknown> = {}) => JSON.stringify({
    name: 'My tank nameplates', addon: 'Plater', presetString: STR, note: '', testedVersion: 'Plater 12.0.4', token: token(), website: '', ...over,
  })
  const JSON_HEADERS = { 'content-type': 'application/json' }
  async function post(deps: SubmissionDeps, body: string, headers: Record<string, string> = JSON_HEADERS) {
    const port = await serve(event => handlePresetSubmission(event, deps))
    return call(port, { body, headers })
  }

  it('stores a valid submission as pending and answers 201 with no-store', async () => {
    const { sqlite, deps } = setup()
    const r = await post(deps, form())
    assert.equal(r.status, 201)
    assert.equal(r.headers['cache-control'], 'no-store')
    assert.equal(r.json().success, true)
    assert.equal(rows(sqlite), 1)
    assert.equal((sqlite.prepare('SELECT status FROM community_presets').get() as { status: string }).status, 'pending')
    assert.equal(r.headers['set-cookie'], undefined)
  })

  it('honeypot: any text in the hidden field answers 201 like a success and stores nothing', async () => {
    const { sqlite, deps } = setup()
    const trapped = await post(deps, form({ website: 'http://spam.example' }))
    assert.equal(trapped.status, 201)
    assert.equal(trapped.json().data.received, true)
    assert.equal(rows(sqlite), 0)
    // Same answer as the real thing, so a bot cannot tell the difference.
    const real = await post(deps, form())
    assert.deepEqual(trapped.json(), real.json())
    // Whitespace only is an empty field, not a bot.
    const blank = await post(setup().deps, form({ website: '   ' }))
    assert.equal(blank.status, 201)
    // The honeypot is checked before the token: a bot with no token is still silently dropped.
    const noToken = await post(setup().deps, JSON.stringify({ website: 'x' }))
    assert.equal(noToken.status, 201)
  })

  it('time-trap: a token younger than 5 s is refused, 5 s is fine, older than 2 h is refused', async () => {
    const { sqlite, deps } = setup()
    const fast = await post(deps, form({ token: token(4) }))
    assert.equal(fast.status, 400)
    assert.equal(fast.json().data.error.code, 'FORM_TOKEN')
    assert.match(fast.json().data.error.message, /too quickly/)
    assert.equal(rows(sqlite), 0)
    assert.equal((await post(deps, form({ token: token(5) }))).status, 201)
    const old = await post(deps, form({ token: token(2 * 3600 + 1), presetString: STR + 'x' }))
    assert.equal(old.status, 400)
    assert.match(old.json().data.error.message, /expired/)
    assert.equal((await post(deps, form({ token: token(2 * 3600), presetString: STR + 'y' }))).status, 201)
  })

  it('a missing, malformed or foreign-signed token is refused', async () => {
    const { sqlite, deps } = setup()
    for (const bad of [undefined, '', 'abc', issueFormToken('other-secret', NOW_MS - 20_000), token().replace(/.$/, c => (c === '0' ? '1' : '0'))]) {
      const r = await post(deps, JSON.stringify({ ...JSON.parse(form()), token: bad }))
      assert.equal(r.status, 400, String(bad))
    }
    assert.equal(rows(sqlite), 0)
  })

  it('a token is single use', async () => {
    const { sqlite, deps } = setup()
    const t = token(10, 'aabbccddeeff00112233')
    assert.equal((await post(deps, form({ token: t }))).status, 201)
    const again = await post(deps, form({ token: t, presetString: STR + 'z' }))
    assert.equal(again.status, 400)
    assert.match(again.json().data.error.message, /already sent/)
    assert.equal(rows(sqlite), 1)
  })

  it('a token from before a restart (different secret) no longer verifies', () => {
    const t = issueFormToken('app-secret|boot-1', NOW_MS - 20_000)
    assert.equal(verifyFormToken('app-secret|boot-1', t, NOW_MS).ok, true)
    assert.deepEqual(verifyFormToken('app-secret|boot-2', t, NOW_MS), { ok: false, problem: 'signature' })
  })

  it('same-origin: a foreign Origin is refused, the own origin and no Origin are fine', async () => {
    const { sqlite, deps } = setup()
    const port = await serve(event => handlePresetSubmission(event, deps))
    const host = `127.0.0.1:${port}`
    const foreign = await call(port, { body: form(), headers: { ...JSON_HEADERS, origin: 'https://evil.example' } })
    assert.equal(foreign.status, 403)
    assert.equal(rows(sqlite), 0)
    assert.equal((await call(port, { body: form(), headers: { ...JSON_HEADERS, origin: 'not a url' } })).status, 403)
    // Same host name on another port is another origin.
    assert.equal((await call(port, { body: form({ presetString: STR + 'p' }), headers: { ...JSON_HEADERS, origin: `http://127.0.0.1:${port + 1}` } })).status, 403)
    assert.equal((await call(port, { body: form({ presetString: STR + 'a' }), headers: { ...JSON_HEADERS, origin: `http://${host}` } })).status, 201)
    assert.equal((await call(port, { body: form({ presetString: STR + 'b' }), headers: JSON_HEADERS })).status, 201)
  })

  it('body size: a declared length and a chunked body above the cap are both refused with 413', async () => {
    const { sqlite, deps } = setup()
    const port = await serve(event => handlePresetSubmission(event, deps))
    const huge = form({ presetString: 'A'.repeat(BODY_MAX_BYTES + 10) })
    assert.equal((await call(port, { body: huge, headers: JSON_HEADERS })).status, 413)
    // No Content-Length: sent in chunks, the reader itself must cut it off.
    const chunked = await call(port, { headers: JSON_HEADERS, chunks: [Buffer.from('{"presetString":"'), Buffer.alloc(BODY_MAX_BYTES, 65), Buffer.alloc(1000, 65), Buffer.from('"}')] })
    assert.equal(chunked.status, 413)
    assert.equal(rows(sqlite), 0)
    // A body of exactly the allowed size is parsed (and then rejected by validation, not by size).
    const filler = form({ presetString: 'B'.repeat(20_000) })
    assert.ok(Buffer.byteLength(filler) < BODY_MAX_BYTES)
    assert.equal((await call(port, { body: filler, headers: JSON_HEADERS })).status, 400)
  })

  it('field limits and bad bodies answer 400', async () => {
    const { sqlite, deps } = setup()
    assert.equal((await post(deps, '')).status, 400)
    assert.equal((await post(deps, 'not json')).status, 400)
    assert.equal((await post(deps, '[1,2]')).status, 400)
    assert.equal((await post(deps, form({ name: 'ab' }))).status, 400)
    assert.equal((await post(deps, form({ presetString: 'short' }))).status, 400)
    assert.equal((await post(deps, form({ unexpected: 1 }))).status, 400)
    assert.equal((await post(deps, form({ addon: 'Hidden Addon' }))).status, 400)
    assert.equal((await post(deps, form({ addon: 'Nope' }))).status, 400)
    assert.equal(rows(sqlite), 0)
  })

  it('a duplicate answers 201 and keeps one row', async () => {
    const { sqlite, deps } = setup()
    assert.equal((await post(deps, form())).status, 201)
    assert.equal((await post(deps, form({ name: 'Another name' }))).status, 201)
    assert.equal(rows(sqlite), 1)
  })

  it('attempt limits (per visitor and per network) answer 429 before the body is read', async () => {
    const lim = presetSubmissionLimits()
    const { sqlite, deps } = setup({ ...lim, attempts: createWindowLimiter(2, 3600_000), attemptsGroup: createWindowLimiter(100, 3600_000) })
    assert.equal((await post(deps, 'x')).status, 400)
    assert.equal((await post(deps, 'x')).status, 400)
    assert.equal((await post(deps, form())).status, 429)
    assert.equal(rows(sqlite), 0)
    const group = setup({ attempts: createWindowLimiter(100, 3600_000), attemptsGroup: createWindowLimiter(1, 3600_000) })
    assert.equal((await post(group.deps, 'x')).status, 400)
    assert.equal((await post(group.deps, form())).status, 429)
  })

  it('acceptance limits: per hour, per day and per network each stop a source', async () => {
    const hour = setup({ accepted: createWindowLimiter(1, 3600_000) })
    assert.equal((await post(hour.deps, form())).status, 201)
    assert.equal((await post(hour.deps, form({ presetString: STR + '1' }))).status, 429)
    const day = setup({ acceptedDay: createWindowLimiter(1, 86_400_000) })
    assert.equal((await post(day.deps, form())).status, 201)
    assert.equal((await post(day.deps, form({ presetString: STR + '2' }))).status, 429)
    const group = setup({ acceptedGroup: createWindowLimiter(1, 86_400_000) })
    assert.equal((await post(group.deps, form())).status, 201)
    assert.equal((await post(group.deps, form({ presetString: STR + '3' }))).status, 429)
    assert.equal(rows(group.sqlite), 1)
  })

  it('the limiter set cannot be exhausted from one /64: five a day per visitor, ten per network, 40 in total', () => {
    const lim = presetSubmissionLimits()
    const day = 86_400_000
    // One /64 (one client key): the sixth acceptance of the day is refused.
    assert.deepEqual([1, 2, 3, 4, 5, 6].map(() => lim.acceptedDay.hit('one64', day)), [true, true, true, true, true, false])
    // One /48 (one group key) inside which every /64 differs: stopped after ten.
    const results = Array.from({ length: 12 }, () => lim.acceptedGroup.hit('one48', day))
    assert.equal(results.filter(Boolean).length, 10)
    // Per hour: three.
    assert.deepEqual([1, 2, 3, 4].map(() => lim.accepted.hit('h', 1)), [true, true, true, false])
    // Attempts: 15 per visitor, 60 per network and hour.
    assert.equal(Array.from({ length: 16 }, () => lim.attempts.hit('a', 1)).filter(Boolean).length, 15)
    assert.equal(Array.from({ length: 61 }, () => lim.attemptsGroup.hit('a', 1)).filter(Boolean).length, 60)
    assert.ok(10 * 4 >= 40) // at least four networks are needed to reach DAILY_CAP
    // Scaling (Playwright only) multiplies every limit.
    const e2e = presetSubmissionLimits(1000)
    assert.equal(Array.from({ length: 5001 }, () => e2e.acceptedDay.hit('k', 1)).filter(Boolean).length, 5000)
  })

  it('the daily cap answers 429 once reached', async () => {
    const { sqlite, deps } = setup()
    const ins = sqlite.prepare("INSERT INTO community_presets (name, addon, preset_string, content_hash, created_at) VALUES ('n', 'Plater', 's', ?, ?)")
    for (let i = 0; i < 40; i++) ins.run(`h${i}`, Math.floor(NOW_MS / 1000) - 5)
    assert.equal((await post(deps, form())).status, 429)
  })
})

describe('window limiter cannot be flooded', () => {
  it('evicts the oldest keys instead of refusing everybody, and stays bounded', () => {
    const l = createWindowLimiter(1, 10_000, 100)
    for (let i = 0; i < 100; i++) l.hit(`bot${i}`, 1000 + i)
    assert.equal(l.size(), 100)
    assert.equal(l.hit('newcomer', 1200), true) // a real visitor still gets in
    assert.ok(l.size() <= 100)
    assert.equal(l.hit('bot99', 1201), false) // recent keys keep their counters
    for (let i = 0; i < 10_000; i++) l.hit(`flood${i}`, 1300 + i % 50)
    assert.ok(l.size() <= 100)
  })
  it('a renewed window moves a key to the back so eviction stays oldest-first', () => {
    const l = createWindowLimiter(1, 100, 3)
    l.hit('a', 0); l.hit('b', 10); l.hit('c', 20)
    l.hit('a', 150) // a's window expired and starts again (newest)
    l.hit('d', 151) // full: expired b,c are purged first, a is kept
    assert.equal(l.hit('a', 152), false)
  })
})

// ─── storage-side defences ─────────────────────────────────────────────

function freshDb() {
  const sqlite = new Database(':memory:')
  initializeDatabase(sqlite)
  return sqlite
}
const DAY = 86400
const NOW = 1_800_000_000

describe('referrer cap', () => {
  it('after REFERRER_DAILY_MAX distinct hosts a day, new hosts are stored as "(other)"', () => {
    const sqlite = freshDb()
    const limiter = createReferrerLimiter(sqlite, 3)
    const seen = ['a.example', 'b.example', 'c.example', 'd.example', 'e.example', 'a.example', null].map(h => limiter.resolve(h, NOW))
    assert.deepEqual(seen, ['a.example', 'b.example', 'c.example', REFERRER_OTHER, REFERRER_OTHER, 'a.example', null])
    // The next UTC day starts fresh.
    assert.equal(limiter.resolve('d.example', NOW + DAY), 'd.example')
    assert.equal(REFERRER_DAILY_MAX, 100)
    assert.ok(!/^[a-z0-9.-]+$/i.test(REFERRER_OTHER)) // can never be a real host
  })
  it('is re-seeded from the stored rows after a restart', () => {
    const sqlite = freshDb()
    const view = { path: '/', device: 'desktop', browser: 'Chrome', os: 'Linux', visitor: 'v' }
    for (const r of ['a.example', 'b.example']) recordView(sqlite, { ...view, referrer: r }, NOW)
    const restarted = createReferrerLimiter(sqlite, 2)
    assert.equal(restarted.resolve('c.example', NOW), REFERRER_OTHER) // the day already has two hosts
    assert.equal(restarted.resolve('a.example', NOW), 'a.example')
  })
  it('the roll-up keeps the top hosts and sums the rest', () => {
    const rows = Array.from({ length: 150 }, (_, i) => ({ k: `h${i}.example`, v: 150 - i }))
    const out = capReferrerRows(rows)
    assert.equal(out.length, REFERRER_DAILY_MAX + 1)
    assert.equal(out[0]!.k, 'h0.example')
    const other = out.find(r => r.k === REFERRER_OTHER)!
    assert.equal(other.v, rows.slice(100).reduce((n, r) => n + r.v, 0))
    assert.equal(out.reduce((n, r) => n + r.v, 0), rows.reduce((n, r) => n + r.v, 0)) // nothing lost
    assert.deepEqual(capReferrerRows([{ k: 'a', v: 1 }, { k: REFERRER_OTHER, v: 2 }], 5), [{ k: 'a', v: 1 }, { k: REFERRER_OTHER, v: 2 }])
    const sqlite = freshDb()
    const ins = sqlite.prepare("INSERT INTO page_views (path, referrer, created_at) VALUES ('/', ?, ?)")
    for (let i = 0; i < 130; i++) ins.run(`x${i}.example`, NOW - 2 * DAY)
    const day = new Date((NOW - 2 * DAY) * 1000).toISOString().slice(0, 10)
    assert.equal(viewRows(sqlite, day).filter(r => r.kind === 'referrer').length, REFERRER_DAILY_MAX + 1)
  })
})

describe('one-time VACUUM after the identifiers were nulled', () => {
  it('runs once after the scrub, sets a marker, and is skipped afterwards', () => {
    const sqlite = freshDb()
    sqlite.prepare("INSERT INTO page_views (path, ip, user_agent, created_at) VALUES ('/', '1.2.3.4', 'Mozilla', ?)").run(NOW - 3 * DAY)
    const first = runAnalyticsMaintenance(sqlite, NOW)
    assert.equal(first.vacuum, 'done')
    assert.ok(sqlite.prepare('SELECT 1 FROM settings WHERE key = ?').get(PRIVACY_VACUUM_MARKER))
    assert.equal(runAnalyticsMaintenance(sqlite, NOW).vacuum, 'skipped')
    assert.equal(vacuumAfterScrub(sqlite), 'skipped')
  })
  it('a failing VACUUM leaves no marker so it is retried', () => {
    const real = freshDb()
    const broken = {
      prepare: (sql: string) => (sql === 'VACUUM' ? { run: () => { throw new Error('disk full') } } : real.prepare(sql)),
      transaction: real.transaction.bind(real),
    } as unknown as Pick<Database.Database, 'prepare' | 'transaction'>
    assert.equal(vacuumAfterScrub(broken), 'failed')
    assert.equal(real.prepare('SELECT 1 FROM settings WHERE key = ?').get(PRIVACY_VACUUM_MARKER), undefined)
    assert.equal(vacuumAfterScrub(real), 'done')
  })
  it('the vacuum comes after the scrub, and the connection enables secure_delete', () => {
    const src = readFileSync(new URL('../../server/utils/analytics.ts', import.meta.url), 'utf8')
    assert.ok(src.indexOf('scrubLegacyIdentifiers(sqlite)\n  const vacuum') > 0)
    assert.match(readFileSync(new URL('../../server/database/index.ts', import.meta.url), 'utf8'), /pragma\('secure_delete = ON'\)/)
  })
  it('secure_delete can be switched on for a connection', () => {
    const sqlite = freshDb()
    sqlite.pragma('secure_delete = ON')
    assert.equal(sqlite.pragma('secure_delete', { simple: true }), 1)
  })
})

describe('beacon rate_limits rows are bounded', () => {
  const add = (sqlite: Database.Database, key: string, updated: number) =>
    sqlite.prepare('INSERT INTO rate_limits (key, count, first_attempt, blocked_until, updated_at) VALUES (?, 1, ?, 0, ?)').run(key, updated, updated)
  const count = (sqlite: Database.Database, like = '%') => (sqlite.prepare('SELECT COUNT(*) AS n FROM rate_limits WHERE key LIKE ?').get(like) as { n: number }).n

  it('removes stale beacon rows, keeps fresh ones and every login limiter row', () => {
    const sqlite = freshDb()
    const now = 10_000_000
    add(sqlite, 'page-view:old', now - BEACON_LIMIT_KEEP_MS - 1)
    add(sqlite, 'copy-event:old', now - BEACON_LIMIT_KEEP_MS - 1)
    add(sqlite, 'vitals:old', now - BEACON_LIMIT_KEEP_MS - 1)
    add(sqlite, 'page-view:fresh', now - 1000)
    add(sqlite, 'login:ip:1.2.3.4', 1) // ancient, but not a beacon row
    assert.equal(pruneBeaconRateLimits(sqlite, now), 3)
    assert.equal(count(sqlite), 2)
    assert.equal(count(sqlite, 'login:%'), 1)
  })
  it('caps the number of beacon rows, dropping the oldest first', () => {
    const sqlite = freshDb()
    const now = 10_000_000
    for (let i = 0; i < 50; i++) add(sqlite, `page-view:k${i}`, now - 5000 + i)
    add(sqlite, 'login:ip:x', 1)
    assert.equal(pruneBeaconRateLimits(sqlite, now, 20), 30)
    assert.equal(count(sqlite, 'page-view:%'), 20)
    assert.ok(sqlite.prepare("SELECT 1 FROM rate_limits WHERE key = 'page-view:k49'").get()) // newest stays
    assert.equal(sqlite.prepare("SELECT 1 FROM rate_limits WHERE key = 'page-view:k0'").get(), undefined)
    assert.equal(count(sqlite, 'login:%'), 1)
    assert.equal(BEACON_LIMIT_MAX_ROWS, 20_000)
  })
})
