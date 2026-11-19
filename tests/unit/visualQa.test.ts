import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const read = (rel: string) => readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8')

describe('visual QA 2026-11-19 source guards', () => {
  it('home addon names and one-liners wrap instead of using truncate', () => {
    const src = read('pages/index.vue')
    assert.doesNotMatch(src, /home-addon__name truncate/)
    assert.doesNotMatch(src, /home-addon__line[^"]*truncate|mg-muted truncate/)
    assert.match(src, /home-addon__line/)
  })

  it('does not offset the second in-game screenshot card', () => {
    const src = read('pages/index.vue')
    assert.doesNotMatch(src, /home-bento__item:nth-child\(2\)\s*\{\s*margin-top/)
    assert.match(src, /align-items:\s*stretch/)
    assert.match(src, /aspect-ratio:\s*16 \/ 9/)
  })

  it('keeps descenders visible on the wordmark and gradient titles', () => {
    const tokens = read('assets/css/tokens.css')
    const tight = tokens.match(/--mg-lh-tight:\s*([0-9.]+)/)
    assert.ok(tight)
    assert.ok(Number(tight![1]) >= 1.15, `--mg-lh-tight is ${tight![1]}`)
    const ui = read('assets/css/ui.css')
    assert.match(ui, /\.mg-wordmark \{[^}]*line-height:\s*1\.15/)
    const home = read('pages/index.vue')
    assert.match(home, /\.home-hero__name \{[\s\S]*?line-height:\s*1\.15/)
    assert.match(home, /\.home-hero__name \{[\s\S]*?padding-bottom:\s*0\.1/)
    assert.doesNotMatch(home, /line-height:\s*0\.98/)
  })

  it('unifies long-form pages on mg-container', () => {
    for (const file of [
      'pages/faq.vue',
      'pages/changelog.vue',
      'pages/news/index.vue',
      'pages/news/[slug].vue',
      'components/PageView/About.vue',
      'components/PageView/Privacy.vue',
    ]) {
      const src = read(file)
      assert.match(src, /class="mg-container /, `${file} should use mg-container`)
      assert.doesNotMatch(src, /max-w-(?:2xl|3xl) mx-auto px-4/, `${file} still uses a centred narrow column`)
    }
  })

  it('sets the Unreleased changelog heading in the site sans, not mono', () => {
    const src = read('pages/changelog.vue')
    assert.match(src, /<h2 class="text-2xl font-semibold[\s\S]*Unreleased/)
    assert.doesNotMatch(src, /<h2 class="font-mono[^"]*"[\s\S]{0,80}Unreleased/)
  })

  it('caps the news article reading column at about 72ch, left-aligned on the container', () => {
    const css = read('assets/css/news.css')
    assert.match(css, /\.news-measure \{[^}]*max-width:\s*min\(72ch,\s*47\.5rem\)/)
    const page = read('pages/news/[slug].vue')
    assert.match(page, /class="news-measure"/)
    assert.match(page, /class="mg-lead news-lead /)
    assert.match(page, /class="news-body /)
    assert.doesNotMatch(page, /mg-lead mt-4 max-w-xl/)
  })

  it('ships a repeatable layout audit script for manual local runs', () => {
    const pkg = read('package.json')
    assert.match(pkg, /"audit:layout": "node scripts\/layout-audit.mjs"/)
    const src = read('scripts/layout-audit.mjs')
    assert.match(src, /EXCLUSIONS/)
    assert.match(src, /color-contrast/)
    assert.match(src, /Range/)
    assert.match(src, /\/api\/v1\/news/)
    assert.match(src, /Manual runs only/)
    assert.match(src, /--base http:\/\/127\.0\.0\.1:3202/)
    assert.doesNotMatch(src, /--base https:\/\/ui\.magguu\.xyz/)
  })

  it('keeps a sticky scroll-margin on guide steps and string cards', () => {
    assert.match(read('assets/css/setup-guide.css'), /scroll-margin-top:\s*calc\(var\(--mg-header-h/)
    assert.match(read('assets/css/setup-strings.css'), /scroll-margin-top:\s*calc\(var\(--mg-header-h/)
  })
})
