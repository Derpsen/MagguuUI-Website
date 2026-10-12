import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BASELINE_CSP, buildHtmlCsp, resolveResponseCsp } from '../../server/utils/htmlCsp'

test('prod over HTTPS keeps upgrade-insecure-requests', () => {
  const csp = buildHtmlCsp('abc', { isDev: false, upgradeInsecure: true })
  assert.match(csp, /upgrade-insecure-requests/)
  assert.match(csp, /'nonce-abc' 'strict-dynamic' 'self'/)
})

test('prod over plain HTTP (LAN) omits upgrade-insecure-requests', () => {
  const csp = buildHtmlCsp('abc', { isDev: false, upgradeInsecure: false })
  assert.doesNotMatch(csp, /upgrade-insecure-requests/)
  assert.match(csp, /'nonce-abc' 'strict-dynamic' 'self'/)
})

test('dev never upgrades and relaxes script-src', () => {
  const csp = buildHtmlCsp('abc', { isDev: true, upgradeInsecure: true })
  assert.doesNotMatch(csp, /upgrade-insecure-requests/)
  assert.match(csp, /script-src 'self' 'unsafe-inline' 'unsafe-eval'/)
})

test('cached HTML gets a document CSP rebuilt from its own nonce', () => {
  const csp = resolveResponseCsp({
    contentType: 'text/html;charset=utf-8',
    body: '<html><head><script nonce="Zm9vYmFy" type="module" src="/_nuxt/a.js"></script></head></html>',
    current: "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
    isDev: false,
    upgradeInsecure: true,
  })
  assert.ok(csp)
  assert.match(csp, /script-src 'nonce-Zm9vYmFy' 'strict-dynamic' 'self'/)
  assert.match(csp, /style-src 'self'/)
  assert.doesNotMatch(csp, /default-src 'none'/)
})

test('HTML without a nonce never gets strict-dynamic or the baseline', () => {
  const csp = resolveResponseCsp({ contentType: 'text/html', body: '<p>x</p>', current: '', isDev: false, upgradeInsecure: false })
  assert.ok(csp)
  assert.match(csp, /script-src 'self';/)
  assert.doesNotMatch(csp, /strict-dynamic|default-src 'none'/)
})

test('non-HTML gets the baseline only when no policy is set', () => {
  assert.equal(resolveResponseCsp({ contentType: 'application/json', body: '{}', current: '', isDev: false, upgradeInsecure: true }), BASELINE_CSP)
  assert.equal(resolveResponseCsp({ contentType: 'text/css', body: '', current: 'x', isDev: false, upgradeInsecure: true }), null)
})
