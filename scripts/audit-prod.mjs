import { spawnSync } from 'node:child_process'

// Build-only advisories with no patched release upstream. Neither package is
// traced into Nitro's .output (runtime image), see PR notes. Re-check by the
// review date; after it the gate fails again until the list is re-approved.
const ALLOWLIST = {
  'GHSA-vfj7-8cjw-p6xm': { pkg: 'braces', reason: 'nitropack > globby > fast-glob > micromatch; build-time only' },
  'GHSA-86w9-cpqp-85rv': { pkg: 'node-forge', reason: 'listhen (nuxt dev server certs); not in .output' },
  // simple-git 4.x drops default export and breaks @nuxt/devtools. Build/dev only.
  'GHSA-v5rq-49vh-5v5c': { pkg: '@simple-git/argv-parser', reason: '@nuxt/devtools > simple-git; build/dev only; 4.x breaks default import' },
  'GHSA-x6jw-m9v5-85vh': { pkg: 'simple-git', reason: '@nuxt/devtools; build/dev only; 4.x breaks default import' },
  'GHSA-g4wm-2vf7-vfgr': { pkg: 'simple-git', reason: '@nuxt/devtools; build/dev only; 4.x breaks default import' },
  'GHSA-858h-whjf-mvg5': { pkg: 'simple-git', reason: '@nuxt/devtools; build/dev only; 4.x breaks default import' },
}
const REVIEW_BY = '2026-11-30'
const BLOCKING = new Set(['high', 'critical'])

const res = spawnSync('npm audit --omit=dev --json', {
  encoding: 'utf8',
  shell: true,
  maxBuffer: 64 * 1024 * 1024,
})

let report
try {
  report = JSON.parse(res.stdout)
} catch {
  console.error('audit:prod: could not parse npm audit output')
  console.error(res.stderr || res.stdout)
  process.exit(1)
}

if (report.error || !report.metadata?.vulnerabilities) {
  console.error('audit:prod: npm audit returned no report')
  console.error(JSON.stringify(report.error ?? report).slice(0, 2000))
  process.exit(1)
}

const expired = new Date() > new Date(`${REVIEW_BY}T23:59:59Z`)
const blocking = []
const allowed = []

for (const [name, vuln] of Object.entries(report.vulnerabilities ?? {})) {
  for (const via of vuln.via ?? []) {
    if (typeof via !== 'object' || !BLOCKING.has(via.severity)) continue
    const id = String(via.url ?? '').split('/').pop()
    const entry = `${name} ${via.severity} ${id} ${via.title ?? ''}`.trim()
    if (!expired && ALLOWLIST[id]?.pkg === name) allowed.push(entry)
    else blocking.push(entry)
  }
}

for (const entry of allowed) console.log(`allowlisted: ${entry}`)
if (expired && Object.keys(ALLOWLIST).length) {
  console.error(`audit:prod: allowlist review date ${REVIEW_BY} passed; re-check upstream fixes`)
}
if (blocking.length) {
  for (const entry of blocking) console.error(`blocking: ${entry}`)
  process.exit(1)
}
console.log(`audit:prod: 0 blocking high/critical advisories (${allowed.length} allowlisted)`)
