#!/usr/bin/env node
/**
 * Repeatable visual layout audit (Playwright).
 *
 *   npm run audit:layout -- --base https://ui.magguu.xyz --out ./layout-audit-out
 *   npm run audit:layout -- --base http://127.0.0.1:3202 --out ./layout-audit-out
 *
 * Coverage: all public routes, every published news article from /api/v1/news,
 * a 404 URL, and /admin/login. Viewports 1280, 768, 390 × light and dark.
 *
 * Categories:
 *   clipping      text overflow / ellipsis truncation / descenders clipped
 *                 (Range.getBoundingClientRect vs nearest clipping ancestor;
 *                 wordmark and background-clip:text are always checked)
 *   alignment     cards/buttons in the same visual row with top or height
 *                 differing by more than 2px
 *   stickyOverlap fixed/sticky elements covering in-flow text
 *   overflowX     horizontal page overflow
 *   contrast      axe color-contrast below WCAG AA 4.5:1
 *   brokenMedia   images with naturalWidth 0, or failed image/font/icon requests
 *
 * CI: advisory only — this script is not a required GitHub check (do not hit
 * production from CI). Justified exclusions are listed in EXCLUSIONS below.
 */

import { chromium } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const STATIC_ROUTES = [
  '/',
  '/guide',
  '/strings',
  '/addons',
  '/configurator',
  '/news',
  '/faq',
  '/changelog',
  '/about',
  '/privacy',
  '/forever',
  '/forever/guide',
  '/forever/strings',
  '/forever/download',
  '/imprint',
  '/status',
  '/submit-preset',
  '/admin/login',
  '/this-page-does-not-exist-layout-audit',
]

const VIEWPORTS = [
  { name: '1280', width: 1280, height: 800 },
  { name: '768', width: 768, height: 1024 },
  { name: '390', width: 390, height: 844 },
]

const THEMES = ['dark', 'light']

const CATEGORIES = ['clipping', 'alignment', 'stickyOverlap', 'overflowX', 'contrast', 'brokenMedia']

/**
 * Justified exclusions (the collector implements these; keep this list in
 * sync with collectLayoutFindings below).
 */
export const EXCLUSIONS = [
  {
    rule: 'sticky-site-header',
    reason: 'The sticky .mg-header is meant to sit over scrolled main content. Only non-header fixed/sticky overlays (back-to-top, sticky subnavs) are flagged when they cover text.',
  },
  {
    rule: 'sr-only-and-hidden',
    reason: 'sr-only, [hidden], aria-hidden, and visibility/display-none nodes are not visible clipping.',
  },
  {
    rule: 'decorative-bleed',
    reason: 'Pointer-events:none / aria-hidden decorative layers and CSS overflow-x:clip on the shell (aurora, hero glow) are ignored unless a real content box also crosses the viewport.',
  },
  {
    rule: 'card-glow-overflow-hidden',
    reason: 'Cards such as .home-step, .home-latest and .addon-required use overflow:hidden only to clip an absolutely positioned decorative glow to the rounded frame. scrollWidth/scrollHeight excess from that glow is not text clipping; the Range/ellipsis checks still run on the same nodes.',
  },
  {
    rule: 'collapsed-disclosure',
    reason: 'Closed FAQ answers and changelog bodies (.release-content--collapsed, clientHeight 0, [hidden], [aria-hidden=true] panels) are intentionally clipped until opened. Text inside a closed <details> (the Strings intro accordion) is also ignored when testing sticky overlap — it is not painted.',
  },
  {
    rule: 'native-form-ellipsis',
    reason: 'input, textarea, and select may natively clip or ellipsize values; that is platform UI, not page typography.',
  },
  {
    rule: 'numeric-display-type',
    reason: 'Tight line-height on numeric step/group markers (.home-step__n, .guide-step__n, .addon-group__n, .home-feature__n, .home-facts__v) is intentional: digits have no descenders.',
  },
  {
    rule: 'footer-and-nav-columns',
    reason: 'Footer link columns and wrapping nav rows are not cards; unequal column height is expected. Alignment checks only look at card/button-like siblings in the same visual row.',
  },
  {
    rule: 'intentional-scrollers',
    reason: 'Children of overflow-x: auto|scroll containers may extend past their parent; they are not page overflow if the scroller itself stays in the viewport.',
  },
  {
    rule: 'subpixel-and-focus-rings',
    reason: 'Differences or overflow of 1px (subpixel rounding) and 3px outline/focus rings at the viewport edge are ignored.',
  },
  {
    rule: 'consent-cookie',
    reason: 'The audit sets the mg_consent cookie so the consent bar does not cover the footer (a visitor who already chose is the normal state).',
  },
]

function parseArgs(argv) {
  const out = { base: '', out: '' }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--base') out.base = argv[++i]
    else if (a === '--out') out.out = argv[++i]
    else if (a === '--help' || a === '-h') out.help = true
  }
  return out
}

function usage() {
  console.error('usage: node scripts/layout-audit.mjs --base <url> --out <dir>')
  process.exit(2)
}

function slug(s) {
  return String(s).replace(/[^\w.-]+/g, '_').replace(/^_|_$/g, '').slice(0, 80) || 'x'
}

function emptyCounts() {
  return Object.fromEntries(CATEGORIES.map(c => [c, 0]).concat([['total', 0]]))
}

async function discoverRoutes(base) {
  const routes = [...STATIC_ROUTES]
  try {
    const res = await fetch(new URL('/api/v1/news', base))
    if (res.ok) {
      const json = await res.json()
      const items = Array.isArray(json) ? json : (json?.data || json?.items || [])
      for (const item of items) {
        const s = item?.slug
        if (s) routes.push(`/news/${s}`)
      }
    } else {
      console.warn('news API:', res.status, '— continuing with static routes only')
    }
  } catch (e) {
    console.warn('news API failed:', e.message)
  }
  return [...new Set(routes)]
}

/**
 * Runs in the page. Returns an array of { category, selector, message, box }.
 */
function collectLayoutFindings(vw) {
  const findings = []
  const seen = new Set()

  const push = (category, el, message, box) => {
    const selector = selectorOf(el)
    const key = `${category}|${selector}|${Math.round((box || {}).x || 0)}|${Math.round((box || {}).y || 0)}|${message}`
    if (seen.has(key)) return
    seen.add(key)
    const already = findings.filter(f => f.category === category).length
    if (already >= 25) return
    findings.push({ category, selector, message, box: box || boxOf(el) })
  }

  function selectorOf(el) {
    if (!el || el === document.documentElement) return 'html'
    if (el === document.body) return 'body'
    if (el.id) return `${el.tagName.toLowerCase()}#${CSS.escape(el.id)}`
    const testid = el.getAttribute && el.getAttribute('data-testid')
    if (testid) return `[data-testid="${testid}"]`
    const cls = typeof el.className === 'string' ? el.className : ''
    const first = cls.split(/\s+/).filter(Boolean).slice(0, 3).join('.')
    return first ? `${el.tagName.toLowerCase()}.${first}` : el.tagName.toLowerCase()
  }

  function boxOf(el) {
    const r = el.getBoundingClientRect()
    return { x: r.x, y: r.y, width: r.width, height: r.height }
  }

  function isHidden(el) {
    if (!el || !el.isConnected) return true
    if (el.closest('[hidden], [aria-hidden="true"]')) return true
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return true
    if (cs.clipPath === 'inset(50%)' || /sr-only|visually-hidden/.test(el.className || '')) return true
    const r = el.getBoundingClientRect()
    if (r.width <= 1 && r.height <= 1) return true
    return false
  }

  function isDecorative(el) {
    if (!el) return false
    const cs = getComputedStyle(el)
    if (el.getAttribute('aria-hidden') === 'true' && cs.pointerEvents === 'none') return true
    if (/(^| )(aurora|glow|bloom|grid-overlay|sr-only)( |$)/.test(el.className || '')) return true
    return false
  }

  function isFormControl(el) {
    return !!el.closest('input, textarea, select, option')
  }

  function isNumericDisplay(el) {
    return !!el.closest('.home-step__n, .guide-step__n, .addon-group__n, .home-feature__n, .home-facts__v')
  }

  function inScroller(el) {
    let n = el.parentElement
    while (n && n !== document.body) {
      const ox = getComputedStyle(n).overflowX
      if (ox === 'auto' || ox === 'scroll') return true
      n = n.parentElement
    }
    return false
  }

  function clippingAncestor(el) {
    let n = el
    while (n && n !== document.documentElement) {
      const cs = getComputedStyle(n)
      const clip = (v) => v === 'hidden' || v === 'clip'
      const bgClip = cs.webkitBackgroundClip === 'text' || cs.backgroundClip === 'text'
      const backdrop = (cs.backdropFilter && cs.backdropFilter !== 'none') || (cs.webkitBackdropFilter && cs.webkitBackdropFilter !== 'none')
      if (clip(cs.overflowX) || clip(cs.overflowY) || bgClip || backdrop) return n
      n = n.parentElement
    }
    return null
  }

  // (d) horizontal page overflow
  const docOverflow = document.documentElement.scrollWidth - document.documentElement.clientWidth
  if (docOverflow > 1) {
    const offenders = []
    for (const el of document.querySelectorAll('body *')) {
      if (isHidden(el) || isDecorative(el) || inScroller(el)) continue
      const r = el.getBoundingClientRect()
      if (r.width <= 1 && r.height <= 1) continue
      if (r.right > vw + 1 || r.left < -1) {
        offenders.push(el)
        if (offenders.length >= 8) break
      }
    }
    const target = offenders[0] || document.documentElement
    push('overflowX', target, `document scrollWidth exceeds clientWidth by ${Math.round(docOverflow)}px`, boxOf(target))
  } else {
    for (const el of document.querySelectorAll('main *, .public-shell *, .admin-login *')) {
      if (isHidden(el) || isDecorative(el) || inScroller(el)) continue
      const r = el.getBoundingClientRect()
      if (r.width <= 1 && r.height <= 1) continue
      if (r.right > vw + 3 || r.left < -3) {
        push('overflowX', el, `element extends past the ${vw}px viewport (${Math.round(r.left)}..${Math.round(r.right)})`, boxOf(el))
      }
    }
  }

  // (a) ellipsis that actually truncates. scrollWidth > clientWidth under
  // overflow:hidden is not enough on its own: cards clip decorative glows.
  for (const el of document.querySelectorAll('body *')) {
    if (isHidden(el) || isDecorative(el) || isFormControl(el)) continue
    if (el.clientHeight === 0 || el.closest('[class*="--collapsed"]')) continue
    const cs = getComputedStyle(el)
    if (cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) {
      push('clipping', el, 'text-overflow:ellipsis is truncating visible text', boxOf(el))
    }
  }

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT
      const el = n.parentElement
      if (!el || isHidden(el) || isDecorative(el) || isFormControl(el) || isNumericDisplay(el)) return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    },
  })

  const wordmarkRoots = document.querySelectorAll('.mg-wordmark, .home-hero__name, .mg-title-grad, .admin-brand-name')
  const alwaysCheck = new Set(wordmarkRoots)

  while (walker.nextNode()) {
    const node = walker.currentNode
    const el = node.parentElement
    if (!el) continue
    const cs = getComputedStyle(el)
    const bgClip = cs.webkitBackgroundClip === 'text' || cs.backgroundClip === 'text'
    const clipper = clippingAncestor(el)
    if (!clipper && !bgClip && !alwaysCheck.has(el) && !el.closest('.mg-wordmark, .home-hero__name, .mg-title-grad')) continue

    const range = document.createRange()
    range.selectNodeContents(node)
    const rr = range.getBoundingClientRect()
    if (rr.width < 0.5 || rr.height < 0.5) continue
    const boxEl = bgClip ? el : (clipper || el)
    const cr = boxEl.getBoundingClientRect()
    if (cr.height < 4 || boxEl.clientHeight < 4) continue
    if (boxEl.className && /collapsed/.test(String(boxEl.className))) continue
    if (el.closest('[class*="--collapsed"], details:not([open])')) continue
    // Fully hidden inside a closed disclosure — not a visible typography bug.
    const visibleH = Math.min(rr.bottom, cr.bottom) - Math.max(rr.top, cr.top)
    if (visibleH <= 0) continue
    const overflowBottom = rr.bottom - cr.bottom
    const overflowTop = cr.top - rr.top
    if (overflowBottom > 0.75 || overflowTop > 0.75) {
      const where = bgClip ? 'background-clip:text' : selectorOf(boxEl)
      push('clipping', el, `descenders or caps extend ${Math.max(overflowBottom, overflowTop).toFixed(1)}px past ${where}`, {
        x: rr.x, y: rr.y, width: rr.width, height: rr.height,
      })
    }
  }

  // (b) cards / buttons in the same visual row
  const CARDISH = 'button, [role="button"], a.mg-btn, .mg-btn, .home-bento__item, .home-step, .home-feature, .feature-item, .mg-card, figure, [class*="card"]:not(html):not(body)'
  const skipAlign = (el) => {
    if (isHidden(el) || isDecorative(el)) return true
    if (el.closest('footer, .mg-footer, nav, .mg-nav, .mg-header, .mg-segment')) return true
    return false
  }
  const parents = new Set()
  for (const el of document.querySelectorAll(CARDISH)) {
    if (skipAlign(el) || !el.parentElement) continue
    parents.add(el.parentElement)
  }
  for (const parent of parents) {
    const items = [...parent.children].filter((el) => {
      if (skipAlign(el)) return false
      if (!el.matches(CARDISH)) return false
      const r = el.getBoundingClientRect()
      return r.width > 8 && r.height > 8
    })
    if (items.length < 2) continue
    const boxes = items.map(el => ({ el, r: el.getBoundingClientRect() }))
    // Visual rows: mid-Y overlap
    const used = new Set()
    for (let i = 0; i < boxes.length; i++) {
      if (used.has(i)) continue
      const row = [boxes[i]]
      used.add(i)
      for (let j = i + 1; j < boxes.length; j++) {
        if (used.has(j)) continue
        const a = boxes[i].r
        const b = boxes[j].r
        const overlap = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
        const minH = Math.min(a.height, b.height)
        if (overlap > minH * 0.4) {
          row.push(boxes[j])
          used.add(j)
        }
      }
      if (row.length < 2) continue
      const tops = row.map(x => x.r.top)
      const heights = row.map(x => x.r.height)
      const topDiff = Math.max(...tops) - Math.min(...tops)
      const heightDiff = Math.max(...heights) - Math.min(...heights)
      if (topDiff > 2 || heightDiff > 2) {
        const el = row[0].el
        push('alignment', el, `same-row ${row.length} items: top Δ ${topDiff.toFixed(1)}px, height Δ ${heightDiff.toFixed(1)}px`, boxOf(el))
      }
    }
  }

  // (c) fixed/sticky overlapping text (not the site header)
  const stickies = [...document.querySelectorAll('body *')].filter((el) => {
    if (isHidden(el)) return false
    const cs = getComputedStyle(el)
    if (cs.position !== 'fixed' && cs.position !== 'sticky') return false
    if (el.closest('.mg-header, .mg-skip')) return false
    const r = el.getBoundingClientRect()
    return r.width > 8 && r.height > 8 && r.bottom > 0 && r.top < window.innerHeight
  })
  for (const s of stickies) {
    const sr = s.getBoundingClientRect()
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT
        const el = n.parentElement
        if (!el || isHidden(el) || isDecorative(el)) return NodeFilter.FILTER_REJECT
        if (s.contains(el)) return NodeFilter.FILTER_REJECT
        if (el.closest('details:not([open])')) return NodeFilter.FILTER_REJECT
        return NodeFilter.FILTER_ACCEPT
      },
    })
    while (tw.nextNode()) {
      const range = document.createRange()
      range.selectNodeContents(tw.currentNode)
      const tr = range.getBoundingClientRect()
      if (tr.width < 2 || tr.height < 8) continue
      const overlapH = Math.min(sr.bottom, tr.bottom) - Math.max(sr.top, tr.top)
      const overlapW = Math.min(sr.right, tr.right) - Math.max(sr.left, tr.left)
      if (overlapH > 8 && overlapW > 16) {
        push('stickyOverlap', s, `fixed/sticky ${selectorOf(s)} overlaps text “${(tw.currentNode.nodeValue || '').trim().slice(0, 48)}"`, boxOf(s))
        break
      }
    }
  }

  // (f) broken images (requests are collected in Node)
  for (const img of document.images) {
    if (isHidden(img)) continue
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) {
      push('brokenMedia', img, `image naturalWidth is 0 (${img.getAttribute('src')})`, boxOf(img))
    }
  }

  return findings
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help || !args.base || !args.out) usage()

  const base = args.base.replace(/\/$/, '')
  const outDir = path.resolve(args.out)
  fs.mkdirSync(path.join(outDir, 'pages'), { recursive: true })
  fs.mkdirSync(path.join(outDir, 'crops'), { recursive: true })

  const routes = await discoverRoutes(base)
  console.log(`audit:layout ${routes.length} routes × ${VIEWPORTS.length} viewports × ${THEMES.length} themes against ${base}`)

  const consent = encodeURIComponent(JSON.stringify({ v: 1, stats: false, ts: Date.now() }))
  const allFindings = []
  const counts = emptyCounts()
  let combos = 0
  let errors = []

  const browser = await chromium.launch()
  try {
    for (const theme of THEMES) {
      for (const vp of VIEWPORTS) {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: 1,
          colorScheme: theme,
          reducedMotion: 'reduce',
        })
        const host = new URL(base).hostname
        await context.addCookies([{ name: 'mg_consent', value: consent, domain: host, path: '/' }])
        await context.addInitScript((t) => {
          try { localStorage.setItem('nuxt-color-mode', t) } catch { /* ignore */ }
        }, theme)

        for (const route of routes) {
          const page = await context.newPage()
          const failed = []
          page.on('requestfailed', (req) => {
            const type = req.resourceType()
            if (!['image', 'font', 'media', 'stylesheet'].includes(type)) return
            failed.push({ url: req.url(), type, error: req.failure()?.errorText || 'failed' })
          })
          const url = base + route
          let status = 0
          try {
            const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
            status = res?.status() || 0
            await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
            await page.waitForTimeout(250)
          } catch (e) {
            errors.push({ route, viewport: vp.name, theme, error: e.message })
            console.warn('goto failed', route, vp.name, theme, e.message)
            await page.close()
            continue
          }

          const pageName = `${slug(route)}-${vp.name}-${theme}`
          const fullPageRel = `pages/${pageName}.png`
          const fullPagePath = path.join(outDir, fullPageRel)
          try {
            await page.screenshot({ path: fullPagePath, fullPage: true })
          } catch {
            await page.screenshot({ path: fullPagePath, fullPage: false }).catch(() => {})
          }

          let local = []
          try {
            local = await page.evaluate(collectLayoutFindings, vp.width)
          } catch (e) {
            errors.push({ route, viewport: vp.name, theme, error: 'collect: ' + e.message })
          }

          try {
            const axe = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze()
            for (const v of axe.violations) {
              for (const node of v.nodes.slice(0, 10)) {
                const target = node.target?.[0] || 'unknown'
                let box = { x: 0, y: 0, width: 0, height: 0 }
                try {
                  const h = page.locator(String(target)).first()
                  const b = await h.boundingBox()
                  if (b) box = b
                } catch { /* ignore */ }
                local.push({
                  category: 'contrast',
                  selector: String(target),
                  message: (node.failureSummary || v.help || 'color-contrast').slice(0, 280),
                  box,
                })
              }
            }
          } catch (e) {
            errors.push({ route, viewport: vp.name, theme, error: 'axe: ' + e.message })
          }

          for (const f of failed) {
            local.push({
              category: 'brokenMedia',
              selector: f.type,
              message: `${f.type} failed: ${f.error} (${f.url})`,
              box: { x: 0, y: 0, width: 0, height: 0 },
            })
          }

          for (const f of local) {
            const id = `${f.category}-${pageName}-${slug(f.selector)}-${allFindings.length}`
            let cropRel = null
            const b = f.box || {}
            if (b.width > 0 && b.height > 0) {
              const pad = 12
              const clip = {
                x: Math.max(0, (b.x || 0) - pad),
                y: Math.max(0, (b.y || 0) - pad),
                width: Math.min(vp.width, (b.width || 0) + pad * 2),
                height: Math.min(vp.height, (b.height || 0) + pad * 2),
              }
              if (clip.width >= 2 && clip.height >= 2) {
                cropRel = `crops/${f.category}/${id}.png`
                const cropPath = path.join(outDir, cropRel)
                fs.mkdirSync(path.dirname(cropPath), { recursive: true })
                try {
                  await page.screenshot({ path: cropPath, clip })
                } catch {
                  cropRel = null
                }
              }
            }
            const rec = {
              id,
              category: f.category,
              path: route,
              viewport: vp.name,
              theme,
              selector: f.selector,
              message: f.message,
              box: f.box,
              httpStatus: status,
              fullPage: fullPageRel,
              crop: cropRel,
            }
            allFindings.push(rec)
            counts[f.category] = (counts[f.category] || 0) + 1
            counts.total++
          }

          combos++
          if (local.length) {
            console.log(`  ${route} @${vp.name} ${theme}: ${local.length} finding(s)`)
          }
          await page.close()
        }
        await context.close()
      }
    }
  } finally {
    await browser.close()
  }

  const byPage = {}
  for (const f of allFindings) {
    const key = `${f.path} @${f.viewport} ${f.theme}`
    byPage[key] = (byPage[key] || 0) + 1
  }

  const summary = {
    base,
    generatedAt: new Date().toISOString(),
    routes,
    viewports: VIEWPORTS.map(v => v.name),
    themes: THEMES,
    combos,
    counts,
    countsByPage: byPage,
    exclusions: EXCLUSIONS,
    errors,
    findings: allFindings,
  }
  const summaryPath = path.join(outDir, 'summary.json')
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2))

  const lines = [
    `# Layout audit`,
    ``,
    `- Base: ${base}`,
    `- Generated: ${summary.generatedAt}`,
    `- Combos: ${combos} (${routes.length} routes × ${VIEWPORTS.length} viewports × ${THEMES.length} themes)`,
    ``,
    `## Counts`,
    ``,
    ...CATEGORIES.map(c => `- ${c}: ${counts[c]}`),
    `- total: ${counts.total}`,
    ``,
    errors.length ? `## Navigation errors\n\n${errors.map(e => `- ${e.path || ''} ${e.route || ''} @${e.viewport} ${e.theme}: ${e.error}`).join('\n')}\n` : '',
  ]
  fs.writeFileSync(path.join(outDir, 'README.md'), lines.filter(Boolean).join('\n') + '\n')

  console.log(`audit:layout wrote ${summaryPath}`)
  console.log(JSON.stringify(counts))
  if (errors.length) console.warn(`audit:layout ${errors.length} navigation/collect error(s)`)
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
