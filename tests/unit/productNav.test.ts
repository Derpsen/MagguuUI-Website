import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { FOREVER_NAV, RETAIL_NAV, isNavActive, navLinksFor, primaryActionFor, productForPath } from '../../utils/productNav'

describe('product nav', () => {
  it('assigns /forever and its subpages to Forever, everything else to Retail', () => {
    assert.equal(productForPath('/forever'), 'forever')
    assert.equal(productForPath('/forever/download'), 'forever')
    assert.equal(productForPath('/'), 'retail')
    assert.equal(productForPath('/guide'), 'retail')
    assert.equal(productForPath('/foreverx'), 'retail')
  })
  it('keeps the Retail nav unchanged and gives Forever its own', () => {
    assert.deepEqual(navLinksFor('retail').map(l => l.to), ['/', '/strings', '/addons', '/guide', '/news', '/changelog', '/faq'])
    assert.equal(navLinksFor('forever'), FOREVER_NAV)
    assert.equal(navLinksFor('retail'), RETAIL_NAV)
    assert.ok(FOREVER_NAV.every(l => productForPath(l.to) === 'forever'))
    assert.deepEqual(primaryActionFor('retail'), { to: '/guide', label: 'Download' })
    assert.equal(primaryActionFor('forever'), null)
  })
  it('marks section roots active only on themselves', () => {
    assert.equal(isNavActive('/', '/'), true)
    assert.equal(isNavActive('/guide', '/'), false)
    assert.equal(isNavActive('/forever', '/forever'), true)
    assert.equal(isNavActive('/forever/guide', '/forever'), false)
    assert.equal(isNavActive('/forever/guide', '/forever/guide'), true)
    assert.equal(isNavActive('/changelog/x', '/changelog'), true)
    assert.equal(isNavActive('/forever/guide', '/guide'), false)
  })
})
