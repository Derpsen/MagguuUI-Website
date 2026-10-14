import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { aggregateVitals, normalizeVitalPath, p75, parseVitalsBeacon, vitalRating } from '../../server/utils/webVitals'
import { diffContentForms } from '../../utils/contentChanges'
import { SPECULATION_RULES } from '../../utils/speculationRules'

describe('web vitals', () => {
  it('keeps only public pathnames', () => {
    assert.equal(normalizeVitalPath('/guide?step=2#x'), '/guide')
    assert.equal(normalizeVitalPath('/faq/'), '/faq')
    assert.equal(normalizeVitalPath('/admin/login'), null)
    assert.equal(normalizeVitalPath('/api/v1/x'), null)
    assert.equal(normalizeVitalPath('https://evil.example/'), null)
    assert.equal(normalizeVitalPath('/<script>'), null)
  })

  it('parses beacons, scales CLS, drops junk', () => {
    const samples = parseVitalsBeacon({ path: '/', metrics: [
      { name: 'LCP', value: 2100.4 }, { name: 'CLS', value: 0.123 }, { name: 'FID', value: 5 },
      { name: 'INP', value: -1 }, { name: 'TTFB', value: 1e9 }, { name: 'INP', value: 80 },
    ] })
    assert.deepEqual(samples, [
      { path: '/', metric: 'LCP', value: 2100 },
      { path: '/', metric: 'CLS', value: 123 },
      { path: '/', metric: 'INP', value: 80 },
    ])
    assert.deepEqual(parseVitalsBeacon({ path: '/admin', metrics: [{ name: 'LCP', value: 1 }] }), [])
  })

  it('p75 + ratings + aggregation', () => {
    assert.equal(p75([1, 2, 3, 4]), 3)
    assert.equal(p75([10]), 10)
    assert.equal(vitalRating('LCP', 2500), 'good')
    assert.equal(vitalRating('INP', 300), 'needs improvement')
    assert.equal(vitalRating('CLS', 300), 'poor')
    const rows = aggregateVitals([
      { path: '/', metric: 'LCP', value: 1000 }, { path: '/', metric: 'LCP', value: 3000 },
      { path: '/', metric: 'LCP', value: 2000 }, { path: '/', metric: 'LCP', value: 4000 },
    ])
    assert.deepEqual(rows, [{ path: '/', metric: 'LCP', p75: 3000, samples: 4, rating: 'needs improvement' }])
  })
})

describe('content change preview', () => {
  it('lists changed fields only', () => {
    const changes = diffContentForms(
      { hero: { title: 'A', eyebrow: 'x' }, addons: { title: 'T' } },
      { hero: { title: 'B', eyebrow: 'x ' }, addons: { title: 'T' }, extra: { k: 'v' } },
    )
    assert.deepEqual(changes, [
      { section: 'hero', key: 'title', before: 'A', after: 'B' },
      { section: 'extra', key: 'k', before: '', after: 'v' },
    ])
  })
})

describe('speculation rules', () => {
  it('moderate prefetch, admin/api excluded', () => {
    const rule = SPECULATION_RULES.prefetch[0]
    assert.equal(rule.eagerness, 'moderate')
    const text = JSON.stringify(rule)
    assert.match(text, /\/admin\/\*/)
    assert.match(text, /\/api\/\*/)
  })
})
