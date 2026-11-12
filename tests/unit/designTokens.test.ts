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
    assert.match(layout, /setScrollLock\(document\.documentElement, open\)/)
    assert.match(ui, /html\.mg-scroll-lock \{ overflow: hidden; \}/)
  })
})


/** Home page CSS (pages/index.vue): the parts that colour tests on tokens alone cannot see. */
describe('home: motion guard and gradient headline', () => {
  const home = readFileSync(join(process.cwd(), 'pages/index.vue'), 'utf8')
  const style = home.slice(home.indexOf('<style'), home.indexOf('</style>'))

  /** Every declaration with its stack of enclosing at-rule preludes (a tiny brace walker, enough for this file). */
  function declarations(source: string): Array<{ prop: string, value: string, atRules: string[] }> {
    const out: Array<{ prop: string, value: string, atRules: string[] }> = []
    const stack: Array<{ at: string | null }> = []
    let buffer = ''
    const text = source.replace(/\/\*[\s\S]*?\*\//g, '')
    for (const ch of text) {
      if (ch === '{') {
        const prelude = buffer.trim()
        stack.push({ at: prelude.startsWith('@') ? prelude : null })
        buffer = ''
      } else if (ch === '}') {
        flush()
        stack.pop()
        buffer = ''
      } else if (ch === ';') {
        flush()
        buffer = ''
      } else buffer += ch
    }
    function flush() {
      const m = buffer.trim().match(/^([a-z-]+)\s*:\s*([\s\S]+)$/)
      if (m && stack.length) out.push({ prop: m[1]!, value: m[2]!.trim(), atRules: stack.map(s => s.at).filter((a): a is string => !!a) })
    }
    return out
  }

  it('the declaration walker sees guarded and unguarded animations (self-check)', () => {
    const d = declarations('.a { animation: x 1s; } @media (prefers-reduced-motion: no-preference) { .b { animation: y 1s; } @supports (animation-timeline: view()) { .c { animation-timeline: view(); } } }')
    assert.deepEqual(d.map(x => x.atRules.length), [0, 1, 2])
  })

  it('every animation declaration sits inside prefers-reduced-motion: no-preference', () => {
    const animated = declarations(style).filter(d => /^animation(-|$)/.test(d.prop))
    assert.ok(animated.length >= 3, 'expected the hero drift, the rise and the flatten animations')
    for (const d of animated) {
      assert.ok(
        d.atRules.some(a => /^@media\s*\(\s*prefers-reduced-motion:\s*no-preference\s*\)$/.test(a)),
        `${d.prop}: ${d.value} must be guarded by prefers-reduced-motion: no-preference`,
      )
    }
  })

  it('will-change (a standing compositor layer) is only promoted inside the guard', () => {
    for (const d of declarations(style).filter(d => d.prop === 'will-change')) {
      assert.ok(d.atRules.some(a => a.includes('prefers-reduced-motion')), `${d.prop}: ${d.value} must be guarded`)
    }
  })

  for (const [theme, t] of Object.entries(THEMES)) {
    it(`${theme}: every colour stop of the H1 gradient is AA on the page background and surface`, () => {
      const block = style.match(/\.home-hero__name \{([^}]*)\}/)?.[1] ?? ''
      const image = block.match(/background-image:\s*(linear-gradient\([^;]*\))\s*;/)?.[1]
      assert.ok(image, 'H1 gradient missing')
      assert.match(block, /background-clip:\s*text/)
      const stops = [...image!.matchAll(/var\(--mg-([a-z0-9-]+)\)|(#[0-9a-fA-F]{6})\b|(rgba?\([^)]*\)|hsla?\([^)]*\))/g)]
      assert.ok(stops.length >= 2, 'gradient needs at least two stops')
      for (const m of stops) {
        assert.ok(!m[3], `stop ${m[3]} is not an opaque hex/token colour`)
        const colour = m[1] ? t[m[1]] : m[2]
        assert.ok(colour, `stop ${m[0]} does not resolve to a token`)
        for (const surface of ['bg', 'surface']) {
          const ratio = contrastRatio(colour!, t[surface]!)
          assert.ok(ratio >= 4.5, `${theme}: ${m[0]} on ${surface} is ${ratio.toFixed(2)}:1`)
        }
      }
    })
  }
})

/** Self-managed fonts (assets/css/fonts.css): the contract that keeps the font swap from shifting the layout. */
describe('fonts: no layout shift from the webfont swap', () => {
  const fonts = readFileSync(join(process.cwd(), 'assets/css/fonts.css'), 'utf8')
  const main = readFileSync(join(process.cwd(), 'assets/css/main.css'), 'utf8')
  const preload = readFileSync(join(process.cwd(), 'plugins/font-preload.ts'), 'utf8')
  const faces = [...fonts.matchAll(/@font-face \{([^}]*)\}/g)].map(m => m[1]!)

  it('every real face is font-display: optional, every fallback face is metric-matched', () => {
    const real = faces.filter(f => /url\(/.test(f))
    const fallback = faces.filter(f => /local\(/.test(f))
    assert.ok(real.length >= 6, 'Jakarta 400/600/700/800 + Mono 400/700')
    for (const f of real) assert.match(f, /font-display:\s*optional/)
    assert.ok(fallback.length >= 6)
    for (const f of fallback) {
      assert.match(f, /size-adjust:\s*[\d.]+%/)
      assert.match(f, /ascent-override:\s*[\d.]+%/)
      assert.match(f, /descent-override:\s*[\d.]+%/)
      assert.match(f, /line-gap-override:\s*0%/)
    }
  })

  it('the font stacks put the metric-matched fallbacks right after the webfont', () => {
    assert.match(main, /--font-sans:\s*'Plus Jakarta Sans',\s*'MG Sans /)
    assert.match(main, /--font-mono:\s*'JetBrains Mono',\s*'MG Mono /)
  })

  it('the faces the first screen needs are preloaded (optional only swaps in when the file is early)', () => {
    for (const w of ['400', '600', '700', '800']) assert.match(preload, new RegExp(`plus-jakarta-sans-latin-${w}-normal\\.woff2`))
    assert.match(preload, /rel:\s*'preload'/)
    assert.match(preload, /crossorigin:\s*'anonymous'/)
  })

  it('@nuxt/fonts is kept out entirely (it would emit a second, swapping face)', () => {
    const cfg = readFileSync(join(process.cwd(), 'nuxt.config.ts'), 'utf8')
    assert.match(cfg, /ui: \{[\s\S]*?\bfonts: false,/)
    assert.doesNotMatch(cfg, /provider: 'none'/)
    assert.doesNotMatch(cfg, /fonts\.families|fonts: \{\s*families/)
  })

  it('Android has a metric-matched fallback too (Roboto), after Segoe UI and before the generic stack', () => {
    assert.match(fonts, /font-family:\s*'MG Sans Roboto';[^}]*local\('Roboto'\)/)
    assert.match(main, /--font-sans:[^;]*'MG Sans Segoe UI',\s*'MG Sans Roboto'/)
  })
})
