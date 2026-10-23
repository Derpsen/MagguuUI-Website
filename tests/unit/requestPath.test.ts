import assert from 'node:assert/strict'
import { test } from 'node:test'
import { canonicalRequestPath, isUnderPrefix } from '../../server/utils/requestPath'

test('decodes, collapses, resolves and lowercases admin path spellings', () => {
  for (const raw of [
    '/api/v1/admin/stats',
    '/api/v1/%61dmin/stats',
    '/api/v1/%2561dmin/stats',
    '/api/v1/%252561dmin/stats',
    '/api/v1//admin/stats',
    '/api/v1/Admin/stats',
    '/api/v1/x/..%2fadmin/stats',
    '/api/v1/x/..%2Fadmin/stats',
    '/api/v1/x/..%5cadmin/stats',
    '/api/v1/./admin/stats?x=1',
  ]) {
    assert.equal(canonicalRequestPath(raw), '/api/v1/admin/stats', raw)
  }
})

test('rejects malformed escapes and endless decoding', () => {
  assert.equal(canonicalRequestPath('/api/v1/%zz'), null)
  assert.equal(canonicalRequestPath('/api/v1/%E0%A4%A'), null)
  assert.equal(canonicalRequestPath(`/api/v1/${'%25'.repeat(1)}${'25'.repeat(8)}61dmin`), null)
})

test('.. cannot climb above root', () => {
  assert.equal(canonicalRequestPath('/../../api/v1/admin'), '/api/v1/admin')
})

test('isUnderPrefix matches on segment boundary', () => {
  assert.equal(isUnderPrefix('/api/v1/admin', '/api/v1/admin'), true)
  assert.equal(isUnderPrefix('/api/v1/admin/x', '/api/v1/admin'), true)
  assert.equal(isUnderPrefix('/api/v1/adminx', '/api/v1/admin'), false)
})
