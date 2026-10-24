// Advisory Lighthouse budget check (never fails the build).
//
// Usage: node tools/lighthouse-budget.mjs <budgets.json> mobile=<lhci-dir> desktop=<lhci-dir>
// Each <lhci-dir> is a Lighthouse CI results folder (manifest.json + lhr-*.json).
// Writes a markdown table to $GITHUB_STEP_SUMMARY (or stdout) and prints one
// `::warning::` annotation per exceeded budget. Always exits 0.
import { appendFileSync, existsSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Metric definitions: how to read it from an LHR and which direction is "bad". */
export const METRICS = [
  { key: 'performance', label: 'Perf', kind: 'min', unit: '' },
  { key: 'lcp', label: 'LCP', kind: 'max', unit: ' ms' },
  { key: 'cls', label: 'CLS', kind: 'max', unit: '' },
  { key: 'tbt', label: 'TBT', kind: 'max', unit: ' ms' },
  { key: 'scriptKb', label: 'JS', kind: 'max', unit: ' KB' },
]

/** @param {any} lhr */
export function extractMetrics(lhr) {
  const audits = lhr?.audits ?? {}
  const num = (id) => {
    const v = audits[id]?.numericValue
    return typeof v === 'number' ? v : null
  }
  const score = lhr?.categories?.performance?.score
  const script = audits['resource-summary']?.details?.items?.find((i) => i.resourceType === 'script')
  return {
    performance: typeof score === 'number' ? Math.round(score * 100) : null,
    lcp: num('largest-contentful-paint') == null ? null : Math.round(num('largest-contentful-paint')),
    cls: num('cumulative-layout-shift') == null ? null : Math.round(num('cumulative-layout-shift') * 1000) / 1000,
    tbt: num('total-blocking-time') == null ? null : Math.round(num('total-blocking-time')),
    scriptKb: typeof script?.transferSize === 'number' ? Math.round(script.transferSize / 1024) : null,
  }
}

/**
 * @param {Record<string, number | null>} measured
 * @param {Record<string, number> | undefined} budget
 * @returns {{ key: string, label: string, value: number | null, limit: number | null, kind: string, unit: string, ok: boolean | null }[]}
 */
export function compare(measured, budget) {
  return METRICS.map((m) => {
    const value = measured[m.key] ?? null
    const limit = budget?.[m.key] ?? null
    let ok = null
    if (value != null && limit != null) ok = m.kind === 'min' ? value >= limit : value <= limit
    return { key: m.key, label: m.label, value, limit, kind: m.kind, unit: m.unit, ok }
  })
}

const escapeData = (s) => s.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')

/** @param {string} page @param {string} mode @param {ReturnType<typeof compare>} rows */
export function annotations(page, mode, rows) {
  return rows
    .filter((r) => r.ok === false)
    .map((r) => {
      const op = r.kind === 'min' ? 'below the minimum of' : 'above the budget of'
      const msg = `${page} (${mode}): ${r.label} ${r.value}${r.unit} is ${op} ${r.limit}${r.unit}. Advisory only, the job stays green.`
      return `::warning title=Lighthouse budget::${escapeData(msg)}`
    })
}

const cell = (r) => {
  if (r.value == null) return 'n/a'
  const mark = r.ok === false ? ' ⚠️' : ''
  const bound = r.limit == null ? '' : ` (${r.kind === 'min' ? '≥' : '≤'} ${r.limit})`
  return `${r.value}${r.unit}${bound}${mark}`
}

/** @param {{ page: string, mode: string, rows: ReturnType<typeof compare> }[]} results */
export function summaryMarkdown(results) {
  const lines = [
    '## Lighthouse budgets (advisory)',
    '',
    'Production build served locally on a shared runner, median of 3 runs per URL. ' +
      'Budgets live in `.github/lighthouse-budgets.json`; exceeding one only raises a warning.',
    '',
    `| Page | Mode | ${METRICS.map((m) => m.label).join(' | ')} |`,
    `|---|---|${METRICS.map(() => '---').join('|')}|`,
  ]
  for (const r of results) lines.push(`| \`${r.page}\` | ${r.mode} | ${r.rows.map(cell).join(' | ')} |`)
  const over = results.flatMap((r) => r.rows.filter((x) => x.ok === false)).length
  lines.push('', results.length === 0 ? 'No Lighthouse results were produced.' : over === 0 ? 'All measured values are within budget.' : `${over} value(s) outside budget (⚠️).`)
  return lines.join('\n') + '\n'
}

/** @param {string} dir @returns {{ path: string, lhr: any }[]} representative run per URL */
export function readRuns(dir) {
  const manifestPath = join(dir, 'manifest.json')
  if (!existsSync(manifestPath)) return []
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const runs = []
  for (const entry of manifest.filter((e) => e.isRepresentativeRun)) {
    const candidates = [entry.jsonPath, join(dir, basename(entry.jsonPath ?? ''))]
    const file = candidates.find((p) => p && existsSync(p))
    if (!file) continue
    runs.push({ path: new URL(entry.url).pathname || '/', lhr: JSON.parse(readFileSync(file, 'utf8')) })
  }
  return runs
}

export function main(argv) {
  const [budgetsPath, ...dirs] = argv
  const budgets = JSON.parse(readFileSync(budgetsPath, 'utf8')).pages ?? {}
  const results = []
  const warnings = []
  for (const arg of dirs) {
    const [mode, dir] = arg.split('=')
    const runs = readRuns(dir)
    if (runs.length === 0) warnings.push(`::warning title=Lighthouse budget::No Lighthouse results found for ${mode} (${dir}). Advisory only.`)
    for (const run of runs) {
      const rows = compare(extractMetrics(run.lhr), budgets[run.path]?.[mode])
      results.push({ page: run.path, mode, rows })
      warnings.push(...annotations(run.path, mode, rows))
    }
  }
  const md = summaryMarkdown(results)
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md)
  else process.stdout.write(md)
  for (const w of warnings) console.log(w)
  return { results, warnings }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2))
  } catch (error) {
    console.log(`::warning title=Lighthouse budget::Budget check could not run: ${escapeData(String(error?.message ?? error))}`)
  }
  process.exit(0)
}
