import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import { contrastRatio } from '../../utils/metaCatalog'

/**
 * Design system tokens (assets/css/tokens.css): every text colour must clear WCAG AA on every surface it can sit on,
 * in both themes. The file is parsed, so a changed hex that breaks a pair fails here before axe does.
 */
const css = readFileSync(join(process.cwd(), 'assets/css/tokens.css'), 'utf8')

function themeBlock(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`)
  assert.ok(start >= 0, `${selector} block missing in tokens.css`)
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start))
  const out: Record<string, string> = {}
  for (const m of body.matchAll(/--mg-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) out[m[1]!] = m[2]!
  return out
}

const THEMES = {
  dark: themeBlock('html.dark .public-shell'),
  light: themeBlock('html:not(.dark) .public-shell'),
}
const SURFACES = ['bg', 'surface', 'surface-2', 'surface-3']
const TEXT = ['fg', 'fg-muted', 'fg-subtle', 'accent-text', 'warn', 'danger']

describe('design tokens: contrast', () => {
  for (const [theme, t] of Object.entries(THEMES)) {
    it(`${theme}: text tokens are AA (4.5:1) on every surface`, () => {
      for (const surface of SURFACES) {
        assert.ok(t[surface], `${theme} ${surface} missing`)
        for (const text of TEXT) {
          assert.ok(t[text], `${theme} ${text} missing`)
          const ratio = contrastRatio(t[text]!, t[surface]!)
          assert.ok(ratio >= 4.5, `${theme}: ${text} ${t[text]} on ${surface} ${t[surface]} = ${ratio.toFixed(2)}`)
        }
      }
    })

    it(`${theme}: text on the accent button is AA`, () => {
      const ratio = contrastRatio(t['on-accent']!, t['accent']!)
      assert.ok(ratio >= 4.5, `${theme}: on-accent ${t['on-accent']} on accent ${t['accent']} = ${ratio.toFixed(2)}`)
    })

    it(`${theme}: focus ring has 3:1 against the page (WCAG 1.4.11)`, () => {
      const ratio = contrastRatio(t['focus']!, t['bg']!)
      assert.ok(ratio >= 3, `${theme}: focus ${t['focus']} on bg = ${ratio.toFixed(2)}`)
    })
  }

  it('dark and light define the same token names', () => {
    assert.deepEqual(Object.keys(THEMES.dark).sort(), Object.keys(THEMES.light).sort())
  })

  it('body background literals in main.css match --mg-bg', () => {
    const main = readFileSync(join(process.cwd(), 'assets/css/main.css'), 'utf8')
    assert.match(main, new RegExp(`html\\.dark body \\{\\s*background: ${THEMES.dark.bg};`))
    assert.match(main, new RegExp(`html\\.light body \\{\\s*background: ${THEMES.light.bg};`))
  })
})

/** Shell rules that live in CSS or templates and cannot be seen by the colour tests above (Code-Review LOWs of PR 1). */
describe('design system: shell source rules', () => {
  const ui = readFileSync(join(process.cwd(), 'assets/css/ui.css'), 'utf8')
  const layout = readFileSync(join(process.cwd(), 'layouts/default.vue'), 'utf8')

  it('skip link: accent fill + on-accent text (AA pair, tested above), not white on teal', () => {
    const block = ui.match(/\.mg-skip:focus \{([^}]*)\}/)?.[1] ?? ''
    assert.match(block, /background:\s*var\(--mg-accent\)/)
    assert.match(block, /color:\s*var\(--mg-on-accent\)/)
    assert.match(layout, /class="mg-skip /)
    assert.doesNotMatch(layout, /focus:bg-brand|focus:text-white/)
    for (const [theme, t] of Object.entries(THEMES)) {
      assert.ok(contrastRatio(t['on-accent']!, t['accent']!) >= 4.5, `${theme}: skip link pair`)
    }
  })

  it('ad region only takes margin when an ad rendered', () => {
    assert.match(ui, /\.mg-ad-region:has\(> \.ad-banner\) \{ margin-top/)
    assert.doesNotMatch(ui, /\.mg-ad-region \{ margin-top/)
  })

  it('header is exactly the header height: hairline is a shadow, not a border', () => {
    const block = ui.match(/\.mg-header \{([^}]*)\}/)?.[1] ?? ''
    assert.match(block, /box-shadow:\s*inset 0 -1px 0/)
    assert.doesNotMatch(block, /border-bottom/)
  })

  it('admin live preview frame uses the flat shell (no glow, no grid)', () => {
    assert.match(ui, /\.public-shell--flat::before,\s*\.public-shell--flat::after \{ content: none; \}/)
    const pages = readFileSync(join(process.cwd(), 'pages/admin/content/pages.vue'), 'utf8')
    assert.match(pages, /admin-draft-preview__frame public-shell public-shell--flat/)
  })

  it('hamburger exposes expanded state and the controlled dialog; menu has a no-JS fallback', () => {
    assert.match(layout, /:aria-expanded="mobileOpen"/)
    assert.match(layout, /aria-controls="mobile-menu"/)
    assert.match(layout, /id="mobile-menu"/)
    assert.match(layout, /<details v-else class="mg-nojs-menu/)
    assert.match(layout, /mg-scroll-lock/)
  })
})

