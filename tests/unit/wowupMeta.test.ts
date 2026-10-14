import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'

// The strings page must not pull WowUp blobs in its list request.
describe('lazy WowUp strings', () => {
  const page = readFileSync(new URL('../../pages/strings.vue', import.meta.url), 'utf8')
  it('lists via view=meta and loads one string on copy/edit', () => {
    assert.match(page, /\/api\/v1\/wowup\?view=meta/)
    assert.match(page, /\/api\/v1\/wowup\/\$\{id\}/)
    assert.doesNotMatch(page, /selectedWowup\.value\?\.string/)
  })
})
