import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import { META_CLASSES, contrastRatio, metaClassTextColor } from '../../utils/metaCatalog'
import { shouldResetScroll } from '../../utils/scrollReset'

/**
 * Redesign PR 4: the /meta and /news pages sit on the design tokens (--mg-*), not on palette classes or `isDark`
 * ternaries. The pages are parsed, so a stray `text-white` or a `btn-primary` fails here before axe or a screenshot does.
 */
const root = process.cwd()
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')

function metaFiles(): string[] {
  const walk = (dir: string): string[] => readdirSync(join(root, dir), { withFileTypes: true })
    .flatMap(e => (e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]))
  return [
    ...readdirSync(join(root, 'components')).filter(f => /^Meta.*\.vue$/.test(f)).map(f => `components/${f}`),
    ...walk('pages/meta'),
    'components/NewsAlsoOnThisSite.vue',
    'pages/news/index.vue',
    'pages/news/[slug].vue',
  ]
}

const PALETTE = /\b(?:dark:)?(?:hover:)?(?:text|bg|border|ring|divide|from|to|via)-(?:white|black|gray|silver|brand|emerald|amber|red|sky|teal|green)(?:-[0-9]+)?(?:\/[0-9]+)?\b/

describe('meta + news design tokens', () => {
  it('finds the whole meta + news surface', () => {
    const files = metaFiles()
    assert.ok(files.length >= 23, `only ${files.length} files`)
    assert.ok(files.includes('components/MetaShell.vue'))
    assert.ok(files.includes('pages/meta/[classSlug]/[specSlug].vue'))
  })

  it('uses no palette colour classes, hex colours, or btn-primary on meta + news', () => {
    for (const file of metaFiles()) {
      const src = read(file)
      const template = src.slice(0, src.indexOf('<script'))
      assert.doesNotMatch(template, PALETTE, `${file} uses a palette class`)
      assert.doesNotMatch(template, /bg-\[#|text-\[#|border-\[#/, `${file} uses a hex class`)
      assert.doesNotMatch(src, /btn-primary/, `${file} uses a flashy button`)
      assert.doesNotMatch(src, /font-medium/, `${file} uses a weight that is not loaded`)
    }
  })

  it('does not pick class strings by theme in meta + news templates (CSS tokens follow the theme)', () => {
    const allowed = new Set(['components/MetaSpecIndex.vue', 'pages/meta/[classSlug]/index.vue'])
    for (const file of metaFiles()) {
      if (allowed.has(file)) continue
      const src = read(file)
      assert.doesNotMatch(src, /isDark/, `${file} branches on isDark`)
      assert.doesNotMatch(src, /tone\.isDark/, `${file} branches on tone.isDark`)
    }
  })

  it('writes every section heading as a green mini-label (.mg-kicker), not an ad-hoc mono uppercase class', () => {
    for (const file of metaFiles()) {
      assert.doesNotMatch(read(file), /font-mono[^"]*uppercase[^"]*"\s+:class="tone\.label\.value"|font-mono text-\[11px\] uppercase tracking-/, `${file} hand-rolls a kicker`)
    }
    assert.match(read('components/MetaShell.vue'), /<p class="mg-kicker mb-3">/)
    assert.match(read('pages/news/index.vue'), /<p class="mg-kicker mb-3">Notes<\/p>/)
    for (const file of ['components/MetaClassPicker.vue', 'components/MetaFilterBar.vue', 'components/MetaSpecIndex.vue', 'components/MetaTalentHeatmap.vue']) {
      assert.match(read(file), /mg-kicker/, `${file} lost its mini-label`)
    }
  })

  it('keeps meta tone helpers on tokens and the filter chips quiet (no brand wash)', () => {
    const tone = read('composables/useMetaTone.ts')
    for (const key of ['label', 'strong', 'muted', 'heatMuted', 'rule', 'track', 'fill', 'lowRow']) {
      const line = tone.split('\n').find(l => l.trim().startsWith(`${key}:`)) ?? ''
      assert.match(line, /mg-/, `${key} is not a token class: ${line}`)
    }
    assert.doesNotMatch(tone, PALETTE)
    for (const file of ['components/MetaFilterBar.vue', 'components/MetaSpecSwitcher.vue']) {
      const src = read(file)
      assert.match(src, /border-mg-accent-text bg-mg-surface-2 text-mg-fg/, `${file} active chip`)
      assert.doesNotMatch(src, /brand-/, `${file} has a brand wash`)
    }
  })

  it('makes the hero call to action a quiet text link and the freshness block a plain ruled section', () => {
    const hero = read('components/MetaHomeHero.vue')
    assert.match(hero, /id="meta-hero-cta"[^>]*class="[^"]*underline/)
    assert.doesNotMatch(hero, /btn-|mg-btn/)
    const fresh = read('components/MetaFreshness.vue')
    assert.match(fresh, /<section class="mt-6 border-t pt-4 text-sm"/)
    assert.doesNotMatch(fresh, /border-l-2/)
  })

  it('shows the loadout copy field with the shared input and a secondary small button', () => {
    const copy = read('components/MetaCopyCode.vue')
    assert.match(copy, /class="mg-input /)
    assert.match(copy, /mg-btn mg-btn--secondary mg-btn--sm/)
  })
})

describe('news body styling', () => {
  const css = read('assets/css/news.css')

  it('uses tokens only: no hex, rgb, or html.light overrides', () => {
    const code = css.replace(/\/\*[\s\S]*?\*\//g, '')
    assert.doesNotMatch(code, /#[0-9a-fA-F]{3,8}\b/)
    assert.doesNotMatch(code, /rgba?\(/)
    assert.doesNotMatch(code, /html\.light|html\.dark/)
    for (const token of ['--mg-fg-muted', '--mg-fg', '--mg-accent-text', '--mg-line', '--mg-surface-2']) assert.ok(code.includes(token), `${token} unused`)
  })

  it('styles the headings, links, code and blockquote of the article body', () => {
    for (const selector of ['.news-body :is(h1, h2, h3, h4)', '.news-body a', '.news-body code', '.news-body blockquote', '.news-body pre']) {
      assert.ok(css.includes(selector), `${selector} missing`)
    }
    assert.match(css, /\.news-body a \{ color: var\(--mg-accent-text\)/)
    assert.match(css, /\.news-body \{[^}]*overflow-wrap: anywhere/)
  })

  it('loads per page (not in the global entry CSS) and replaces prose-custom on the article', () => {
    const slug = read('pages/news/[slug].vue')
    assert.match(slug, /import '~\/assets\/css\/news\.css'/)
    assert.match(slug, /class="news-body /)
    assert.doesNotMatch(slug, /prose-custom/)
    assert.doesNotMatch(read('nuxt.config.ts'), /news\.css/)
    assert.doesNotMatch(read('assets/css/main.css'), /news-body/)
  })
})

describe('class colours on the real page backgrounds', () => {
  const tokens = read('assets/css/tokens.css')
  const bg = (selector: string) => {
    const start = tokens.indexOf(`${selector} {`)
    const body = tokens.slice(tokens.indexOf('{', start) + 1, tokens.indexOf('}', start))
    return /--mg-bg:\s*(#[0-9a-fA-F]{6})/.exec(body)![1]!
  }

  it('keeps every class text colour at 4.5:1 on --mg-bg in dark and light', () => {
    const dark = bg('html.dark .public-shell')
    const light = bg('html:not(.dark) .public-shell')
    for (const cls of META_CLASSES) {
      assert.ok(contrastRatio(metaClassTextColor(cls.slug, true), dark) >= 4.5, `${cls.slug} dark on ${dark}`)
      assert.ok(contrastRatio(metaClassTextColor(cls.slug, false), light) >= 4.5, `${cls.slug} light on ${light}`)
    }
  })
})

describe('soft-navigation CLS (/addons footer)', () => {
  it('awaits the addons fetch so the list is there when the page first appears', () => {
    const addons = read('pages/addons.vue')
    assert.match(addons, /const \{ data \} = await useFetch</)
  })

  it('decides the scroll reset by rule: only a committed push to another page, never Back/Forward', () => {
    const base = { firstNavigation: false, fromPath: '/guide', toPath: '/addons', scrollToTop: undefined, popped: false, failed: false, scrollY: 1400 }
    assert.equal(shouldResetScroll(base), true)
    assert.equal(shouldResetScroll({ ...base, popped: true }), false, 'Back/Forward keep the saved position')
    assert.equal(shouldResetScroll({ ...base, failed: true }), false)
    assert.equal(shouldResetScroll({ ...base, firstNavigation: true }), false)
    assert.equal(shouldResetScroll({ ...base, toPath: '/guide' }), false, 'hash-only / same page')
    assert.equal(shouldResetScroll({ ...base, scrollToTop: false }), false)
    assert.equal(shouldResetScroll({ ...base, scrollY: 0 }), false)
  })

  it('wires the rule after the history save, with a capturing popstate flag, instant scroll', () => {
    const plugin = read('plugins/scroll-reset.client.ts')
    // beforeEach/beforeResolve run BEFORE vue-router stores the leaving scroll position (Code-Review #201).
    assert.doesNotMatch(plugin, /router\.before(Each|Resolve)\(/)
    assert.match(plugin, /router\.afterEach\(\(to, from, failure\) => \{/)
    assert.match(plugin, /window\.addEventListener\('popstate', \(\) => \{ popped = true \}, \{ capture: true \}\)/)
    assert.match(plugin, /popped: wasPopped/)
    assert.match(plugin, /window\.scrollTo\(\{ top: 0, left: 0, behavior: 'instant' \}\)/)
    assert.doesNotMatch(plugin, /behavior: 'smooth'/)
    // The smooth CSS default is what made the old scroll-to-top slow; anchors still rely on it.
    assert.match(read('assets/css/main.css'), /\* \{ scroll-behavior: smooth; \}/)
  })

  it('bounds the addons fetch and shows a note instead of a blank page when it fails', () => {
    const addons = read('pages/addons.vue')
    assert.match(addons, /useFetch<\{ data: AddonsResponse \}>\('\/api\/v1\/addons', \{ timeout: 8000 \}\)/)
    assert.match(addons, /v-if="!groups\.length"[^>]*role="status"/)
  })
})
