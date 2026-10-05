import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildHtmlCsp } from '../../server/utils/htmlCsp'

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
