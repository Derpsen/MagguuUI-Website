import assert from 'node:assert/strict'
import { test } from 'node:test'
import { annotations, compare, extractMetrics, hardBudgetFailed, isHardBudgetPage, missingHardCoverage, summaryMarkdown } from './lighthouse-budget.mjs'

const lhr = {
  categories: { performance: { score: 0.83 } },
  audits: {
    'largest-contentful-paint': { numericValue: 4071.4 },
    'cumulative-layout-shift': { numericValue: 0.00715 },
    'total-blocking-time': { numericValue: 47.2 },
    'resource-summary': {
      details: { items: [{ resourceType: 'script', transferSize: 239386 }, { resourceType: 'image', transferSize: 10 }] },
    },
  },
}

test('extractMetrics reads score, vitals and script size', () => {
  assert.deepEqual(extractMetrics(lhr), { performance: 83, lcp: 4071, cls: 0.007, tbt: 47, scriptKb: 234 })
})

test('extractMetrics tolerates missing audits', () => {
  assert.deepEqual(extractMetrics({}), { performance: null, lcp: null, cls: null, tbt: null, scriptKb: null })
})

test('compare flags only exceeded budgets', () => {
  const rows = compare(extractMetrics(lhr), { performance: 85, lcp: 4800, cls: 0.05, tbt: 30 })
  const bad = rows.filter((r) => r.ok === false).map((r) => r.key)
  assert.deepEqual(bad, ['performance', 'tbt'])
  assert.equal(rows.find((r) => r.key === 'scriptKb')?.ok, null)
})

test('annotations are advisory warnings, never errors', () => {
  const rows = compare(extractMetrics(lhr), { performance: 90, lcp: 3000 })
  const lines = annotations('/', 'mobile', rows)
  assert.equal(lines.length, 2)
  for (const line of lines) assert.match(line, /^::warning title=Lighthouse budget::/)
  assert.match(lines[0], /Perf 83 is below the minimum of 90/)
})

test('summary renders a table and the outside-budget count', () => {
  const rows = compare(extractMetrics(lhr), { performance: 90 })
  const md = summaryMarkdown([{ page: '/', mode: 'mobile', rows }])
  assert.match(md, /\| `\/` \| mobile \| 83 \(≥ 90\) ⚠️ \|/)
  assert.match(md, /1 value\(s\) outside budget/)
})

test(' /meta pages are a hard gate; other pages stay advisory', () => {
  assert.equal(isHardBudgetPage('/meta'), true)
  assert.equal(isHardBudgetPage('/meta/mage/fire'), true)
  assert.equal(isHardBudgetPage('/'), false)
  assert.equal(isHardBudgetPage('/guide'), false)
  const metaRows = compare(extractMetrics(lhr), { performance: 90 })
  const metaLines = annotations('/meta', 'mobile', metaRows)
  assert.equal(metaLines.length, 1)
  assert.match(metaLines[0], /^::error title=Lighthouse budget::/)
  assert.match(metaLines[0], /This fails the Lighthouse job/)
  const homeLines = annotations('/', 'mobile', metaRows)
  assert.match(homeLines[0], /^::warning title=Lighthouse budget::/)
  assert.equal(hardBudgetFailed([{ page: '/', mode: 'mobile', rows: metaRows }]), false)
  assert.equal(hardBudgetFailed([{ page: '/meta', mode: 'mobile', rows: metaRows }]), true)
})

test('missing /meta coverage is reported', () => {
  const budgets = { '/': { mobile: {} }, '/meta': { mobile: {}, desktop: {} }, '/meta/mage/fire': { mobile: {}, desktop: {} } }
  const missing = missingHardCoverage([{ page: '/meta', mode: 'mobile' }], budgets)
  assert.deepEqual(missing, ['/meta (desktop)', '/meta/mage/fire (mobile)', '/meta/mage/fire (desktop)'])
})
