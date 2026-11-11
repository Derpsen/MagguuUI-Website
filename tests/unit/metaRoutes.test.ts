import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { canonicalizeMetaPath } from '../../utils/metaRoutes'

describe('canonical /meta paths', () => {
  it('sends uppercase, trailing slash, doubled slash and .html variants to one lowercase path', () => {
    const upper = canonicalizeMetaPath('/Meta/Mage/Frost')
    assert.deepEqual(upper, { canonical: '/meta/mage/frost', redirect: true, valid: true })
    assert.deepEqual(canonicalizeMetaPath('/meta/mage/frost/'), { canonical: '/meta/mage/frost', redirect: true, valid: true })
    assert.deepEqual(canonicalizeMetaPath('/meta//mage/frost'), { canonical: '/meta/mage/frost', redirect: true, valid: true })
    assert.deepEqual(canonicalizeMetaPath('/meta/mage/frost.html'), { canonical: '/meta/mage/frost', redirect: true, valid: true })
    assert.deepEqual(canonicalizeMetaPath('/meta/death%20knight/blood'), { canonical: '/meta/death-knight/blood', redirect: true, valid: true })
    assert.deepEqual(canonicalizeMetaPath('/meta/mage/frost'), { canonical: '/meta/mage/frost', redirect: false, valid: true })
  })

  it('returns 404 without a redirect for unknown slugs, even when the casing is wrong', () => {
    assert.deepEqual(canonicalizeMetaPath('/Meta/Foo/Bar'), { canonical: '/meta/foo/bar', redirect: true, valid: false })
    assert.equal(canonicalizeMetaPath('/meta/foo/bar')?.valid, false)
    assert.equal(canonicalizeMetaPath('/meta/mage/holy')?.valid, false)
    assert.equal(canonicalizeMetaPath('/guide'), null)
  })
})
