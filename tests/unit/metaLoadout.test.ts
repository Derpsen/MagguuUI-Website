import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { decodeLoadoutHeader, encodeLoadoutHeader } from '../../utils/metaLoadout'

describe('loadout header', () => {
  it('round-trips version, spec id and a 128-bit tree hash', () => {
    const hash = 'c0ffee00c0ffee00c0ffee00c0ffee00'
    const code = encodeLoadoutHeader(2, 63, hash)
    assert.match(code, /^[A-Za-z0-9+/]{26,}$/)
    assert.deepEqual(decodeLoadoutHeader(code), { version: 2, specId: 63, treeHash: hash })
    assert.equal(decodeLoadoutHeader('short'), null)
  })
})
