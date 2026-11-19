import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import { createScrollResetFlow, shouldResetScroll } from '../../utils/scrollReset'

/**
 * The /news pages sit on the design tokens (--mg-*), not on palette classes or `isDark`
 * ternaries. The pages are parsed, so a stray `text-white` or a `btn-primary` fails here before axe or a screenshot does.
 */
const root = process.cwd()
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')

function newsFiles(): string[] {
  return [
    'components/NewsAlsoOnThisSite.vue',
    'pages/news/index.vue',
    'pages/news/[slug].vue',
  ]
}

const PALETTE = /\b(?:dark:)?(?:hover:)?(?:text|bg|border|ring|divide|from|to|via)-(?:white|black|gray|silver|brand|emerald|amber|red|sky|teal|green)(?:-[0-9]+)?(?:\/[0-9]+)?\b/

describe('news design tokens', () => {
  it('finds the news surface', () => {
    const files = newsFiles()
    assert.ok(files.includes('pages/news/index.vue'))
    assert.ok(files.includes('pages/news/[slug].vue'))
    assert.ok(files.includes('components/NewsAlsoOnThisSite.vue'))
  })

  it('uses no palette colour classes, hex colours, or btn-primary on news', () => {
    for (const file of newsFiles()) {
      const src = read(file)
      const template = src.slice(0, src.indexOf('<script'))
      assert.doesNotMatch(template, PALETTE, `${file} uses a palette class`)
      assert.doesNotMatch(template, /bg-\[#|text-\[#|border-\[#/, `${file} uses a hex class`)
      assert.doesNotMatch(src, /btn-primary/, `${file} uses a flashy button`)
      assert.doesNotMatch(src, /font-medium/, `${file} uses a weight that is not loaded`)
    }
  })

  it('does not pick class strings by theme in news templates (CSS tokens follow the theme)', () => {
    for (const file of newsFiles()) {
      const src = read(file)
      assert.doesNotMatch(src, /isDark/, `${file} branches on isDark`)
      assert.doesNotMatch(src, /tone\.isDark/, `${file} branches on tone.isDark`)
    }
  })

  it('writes every section heading as a green mini-label (.mg-kicker), not an ad-hoc mono uppercase class', () => {
    for (const file of newsFiles()) {
      assert.doesNotMatch(read(file), /font-mono[^"]*uppercase[^"]*"\s+:class="tone\.label\.value"|font-mono text-\[11px\] uppercase tracking-/, `${file} hand-rolls a kicker`)
    }
    assert.match(read('pages/news/index.vue'), /<p class="mg-kicker mb-3">Notes<\/p>/)
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

describe('soft-navigation CLS (/addons footer)', () => {
  it('awaits the addons fetch so the list is there when the page first appears', () => {
    const addons = read('pages/addons.vue')
    assert.match(addons, /const \{ data, error \} = await useFetch</)
  })

  it('decides the scroll reset by rule: only a committed push to another page, never Back/Forward', () => {
    const base = { firstNavigation: false, fromPath: '/guide', toPath: '/addons', scrollToTop: undefined, popped: false, failure: undefined, scrollY: 1400 }
    assert.equal(shouldResetScroll(base), true)
    assert.equal(shouldResetScroll({ ...base, popped: true }), false, 'Back/Forward keep the saved position')
    assert.equal(shouldResetScroll({ ...base, failure: new Error('cancelled') }), false, 'a failed or cancelled navigation')
    assert.equal(shouldResetScroll({ ...base, firstNavigation: true }), false)
    assert.equal(shouldResetScroll({ ...base, toPath: '/guide' }), false, 'hash-only / same page')
    assert.equal(shouldResetScroll({ ...base, scrollToTop: false }), false)
    assert.equal(shouldResetScroll({ ...base, scrollY: 0 }), false)
  })

  it('Back/Forward marks only the next navigation: a later footer click resets the scroll again', () => {
    const flow = createScrollResetFlow()
    const push = { firstNavigation: false, fromPath: '/guide', toPath: '/addons', scrollToTop: undefined, failure: undefined, scrollY: 1400 }
    assert.equal(flow.shouldReset(push), true, 'a plain push resets')
    flow.markPopped()
    assert.equal(flow.shouldReset(push), false, 'the navigation started by Back keeps the saved position')
    assert.equal(flow.shouldReset(push), true, 'the next footer click resets again (the mark is consumed)')
    flow.markPopped()
    assert.equal(flow.shouldReset({ ...push, failure: new Error('cancelled') }), false)
    assert.equal(flow.shouldReset(push), true, 'a failed Back navigation consumes the mark too')
  })

  it('wires the rule after the history save, with a capturing popstate flag, instant scroll', () => {
    const plugin = read('plugins/scroll-reset.client.ts')
    // beforeEach/beforeResolve run BEFORE vue-router stores the leaving scroll position (Code-Review #201).
    assert.doesNotMatch(plugin, /router\.before(Each|Resolve)\(/)
    assert.match(plugin, /router\.afterEach\(\(to, from, failure\) => \{/)
    assert.match(plugin, /window\.addEventListener\('popstate', \(\) => \{/)
    assert.match(plugin, /flow\.markPopped\(\)/)
    assert.match(plugin, /el\.focus\(\{ preventScroll: true \}\)/)
    assert.match(plugin, /\}, \{ capture: true \}\)/)
    assert.match(plugin, /flow\.shouldReset\(\{/)
    assert.match(plugin, /^\s+failure,$/m)
    assert.match(plugin, /window\.scrollTo\(\{ top: 0, left: 0, behavior: 'instant' \}\)/)
    assert.doesNotMatch(plugin, /behavior: 'smooth'/)
    // The smooth CSS default is what made the old scroll-to-top slow; anchors still rely on it.
    assert.match(read('assets/css/main.css'), /\* \{ scroll-behavior: smooth; \}/)
  })

  it('bounds the addons fetch and tells a failed load from an empty catalog', () => {
    const addons = read('pages/addons.vue')
    assert.match(addons, /const \{ data, error \} = await useFetch<\{ data: AddonsResponse \}>\('\/api\/v1\/addons', \{ timeout: 8000 \}\)/)
    assert.match(addons, /<p v-if="error"[^>]*role="status">The addon list could not be loaded\./)
    assert.match(addons, /<p v-else-if="!groups\.length"[^>]*role="status">No addons are listed yet\./)
  })
})
