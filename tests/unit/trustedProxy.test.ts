import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isTrustedProxy, parseTrustedProxies } from '../../server/utils/trustedProxy'

test('default (unset) trusts loopback and private ranges only', () => {
  const list = parseTrustedProxies(undefined)
  for (const ip of ['127.0.0.1', '::1', '10.1.2.3', '172.17.0.2', '192.168.178.30', '::ffff:192.168.178.30', 'fd00::1']) {
    assert.equal(isTrustedProxy(ip, list), true, ip)
  }
  for (const ip of ['8.8.8.8', '172.32.0.1', '2001:db8::1', '', 'garbage']) {
    assert.equal(isTrustedProxy(ip, list), false, ip)
  }
})

test('explicit list pins to the cloudflared address', () => {
  const list = parseTrustedProxies('192.168.178.30, 172.18.0.0/16')
  assert.equal(isTrustedProxy('192.168.178.30', list), true)
  assert.equal(isTrustedProxy('192.168.178.148', list), false)
  assert.equal(isTrustedProxy('172.18.5.9', list), true)
})

test('none disables header trust', () => {
  assert.equal(isTrustedProxy('127.0.0.1', parseTrustedProxies('none')), false)
})
