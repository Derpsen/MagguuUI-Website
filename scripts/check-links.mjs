#!/usr/bin/env node
// Broken-link check for the live site (or BASE_URL). Crawls same-origin public
// pages from the start set, checks every <a href>/<img src>/<link href> once,
// writes link-report.json + link-report.md, exits 1 on broken links.
// Usage: BASE_URL=https://ui.magguu.xyz node scripts/check-links.mjs
import { writeFileSync } from 'node:fs'

const base = new URL(process.env.BASE_URL || 'https://ui.magguu.xyz')
const start = ['/', '/guide', '/faq', '/strings', '/addons', '/profiles', '/changelog', '/about', '/imprint', '/privacy']
const MAX_PAGES = 60
const SKIP = [/^mailto:/, /^tel:/, /^javascript:/, /^#/, /^data:/]
const SKIP_PATH = [/^\/admin/, /^\/api\//, /^\/cdn-cgi\//]
const UA = 'MagguuUI-linkcheck/1.0 (+https://ui.magguu.xyz)'

const pages = new Set()
const queue = [...start]
const links = new Map() // url -> Set(sourcePage)

function extract(html) {
  const out = []
  for (const m of html.matchAll(/<(a|link|img|script)\b[^>]*?\s(href|src)="([^"]+)"/gi)) {
    if (m[1].toLowerCase() === 'link' && !/rel="(icon|apple-touch-icon|manifest|stylesheet|canonical)"/i.test(m[0])) continue
    out.push(m[3].replace(/&amp;/g, '&'))
  }
  return out
}

async function check(url) {
  const opts = { redirect: 'follow', headers: { 'user-agent': UA }, signal: AbortSignal.timeout(20_000) }
  try {
    let res = await fetch(url, { ...opts, method: 'HEAD' })
    if ([403, 405, 429, 501].includes(res.status)) res = await fetch(url, { ...opts, method: 'GET' })
    return res.status
  } catch (err) {
    return `error: ${err.cause?.code || err.name}`
  }
}

while (queue.length && pages.size < MAX_PAGES) {
  const path = queue.shift()
  if (pages.has(path)) continue
  pages.add(path)
  const pageUrl = new URL(path, base).toString()
  let html
  try {
    const res = await fetch(pageUrl, { headers: { 'user-agent': UA } })
    html = await res.text()
    if (!res.ok) { links.set(pageUrl, new Set(['(start set)'])); continue }
  } catch { links.set(pageUrl, new Set(['(start set)'])); continue }
  for (const raw of extract(html)) {
    if (SKIP.some(re => re.test(raw))) continue
    let u
    try { u = new URL(raw, pageUrl) } catch { continue }
    u.hash = ''
    if (u.origin === base.origin) {
      if (SKIP_PATH.some(re => re.test(u.pathname))) continue
      if (!/\.[a-z0-9]{2,5}$/i.test(u.pathname) && !u.search) queue.push(u.pathname)
    }
    const key = u.toString()
    if (!links.has(key)) links.set(key, new Set())
    links.get(key).add(path)
  }
}

const results = []
const entries = [...links.entries()]
for (let i = 0; i < entries.length; i += 8) {
  const batch = await Promise.all(entries.slice(i, i + 8).map(async ([url, from]) => ({ url, status: await check(url), from: [...from] })))
  results.push(...batch)
}
// Bot-protected stores answer 403/429 to any crawler: counted as OK (pass).
// Real 404s/5xx/network errors still fail the run.
const BOT_WALLED = /(^|\.)(curseforge\.com|wago\.io|wowinterface\.com)$/
const isWalled = r => (r.status === 403 || r.status === 429) && BOT_WALLED.test(new URL(r.url).hostname)
const unverified = results.filter(isWalled)
const broken = results.filter(r => !isWalled(r) && (typeof r.status !== 'number' || r.status >= 400))
writeFileSync('link-report.json', JSON.stringify({ base: base.toString(), pages: [...pages], checked: results.length, broken, unverified }, null, 2))
const md = [
  `## Broken links: ${broken.length} of ${results.length} checked (${pages.size} pages crawled)`,
  '',
  ...(broken.length ? ['| Status | URL | Found on |', '|---|---|---|', ...broken.map(b => `| ${b.status} | ${b.url} | ${b.from.slice(0, 3).join(', ')} |`)] : ['No broken links.']),
  '',
  `${unverified.length} links on bot-protected stores (CurseForge/Wago/WoWInterface) answered 403/429: treated as OK.`,
].join('\n')
writeFileSync('link-report.md', `${md}\n`)
console.log(md)
process.exit(broken.length ? 1 : 0)
