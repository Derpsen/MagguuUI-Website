import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import { ADMIN_FACES, ALL_FONT_FACES, DEFAULT_FACES, fontFacesForPath } from '../../utils/fontPreload'
import { contrastRatio } from '../../utils/metaCatalog'

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8')

/** Per-route font preloads (utils/fontPreload.ts, plugins/font-preload.ts). */
describe('font preload table', () => {
  it('public routes preload every face the first screen draws (measured: sans 400/600/700/800 + mono 400)', () => {
    for (const path of ['/', '/guide', '/strings', '/addons', '/meta', '/news', '/faq', '/changelog', '/forever', '/some/unknown']) {
      assert.deepEqual([...fontFacesForPath(path)].sort(), ['mono-400', 'sans-400', 'sans-600', 'sans-700', 'sans-800'], path)
    }
    assert.deepEqual(DEFAULT_FACES, ALL_FONT_FACES)
  })

  it('the admin shell preloads only the three faces the login screen draws', () => {
    for (const path of ['/admin', '/admin/login', '/admin/content']) {
      assert.deepEqual([...fontFacesForPath(path)].sort(), ['mono-400', 'sans-400', 'sans-600'], path)
    }
    assert.ok(ADMIN_FACES.length < DEFAULT_FACES.length)
  })

  it('query and hash do not change the route, and a prefix lookalike is not admin', () => {
    assert.deepEqual(fontFacesForPath('/admin/login?next=/x'), ADMIN_FACES)
    assert.deepEqual(fontFacesForPath('/admin#top'), ADMIN_FACES)
    assert.deepEqual(fontFacesForPath('/administrator'), DEFAULT_FACES)
    assert.deepEqual(fontFacesForPath('/adminx/y'), DEFAULT_FACES)
    assert.deepEqual(fontFacesForPath(''), DEFAULT_FACES)
  })

  it('every face id has a woff2 URL in the plugin', () => {
    const plugin = read('plugins/font-preload.ts')
    for (const id of ALL_FONT_FACES) assert.match(plugin, new RegExp(`'${id}':\\s*\\w+,`), id)
    assert.match(plugin, /fontFacesForPath\(route\.path\)/)
  })
})

/** Declarations with their enclosing at-rules (same tiny brace walker as the home page test). */
function declarations(source: string): Array<{ prop: string, value: string, atRules: string[] }> {
  const out: Array<{ prop: string, value: string, atRules: string[] }> = []
  const stack: Array<string | null> = []
  let buffer = ''
  function flush() {
    const m = buffer.trim().match(/^([a-z-]+)\s*:\s*([\s\S]+)$/)
    if (m && stack.length) out.push({ prop: m[1]!, value: m[2]!.trim(), atRules: stack.filter((a): a is string => !!a) })
  }
  for (const ch of source.replace(/\/\*[\s\S]*?\*\//g, '')) {
    if (ch === '{') { const prelude = buffer.trim(); stack.push(prelude.startsWith('@') ? prelude : null); buffer = '' }
    else if (ch === '}') { flush(); stack.pop(); buffer = '' }
    else if (ch === ';') { flush(); buffer = '' }
    else buffer += ch
  }
  return out
}

function themeBlock(css: string, selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`)
  assert.ok(start >= 0, `${selector} missing`)
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start))
  const out: Record<string, string> = {}
  for (const m of body.matchAll(/--mg-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) out[m[1]!] = m[2]!
  return out
}

const SETUP_CSS = ['assets/css/setup.css', 'assets/css/setup-addons.css', 'assets/css/setup-guide.css', 'assets/css/setup-strings.css']

/** Guide / Strings / Addons styles (assets/css/setup*.css, split per owner so /meta and the other pages do not ship them). */
describe('setup pages: setup.css', () => {
  const setup = SETUP_CSS.map(read).join('\n')
  const tokens = read('assets/css/tokens.css')

  it('is NOT in the global entry CSS: each page or component imports only what it draws', () => {
    assert.doesNotMatch(read('assets/css/main.css'), /setup[\w-]*\.css/)
    const owners: Record<string, string[]> = {
      'pages/guide.vue': ['setup.css', 'setup-guide.css'],
      'pages/addons.vue': ['setup.css', 'setup-addons.css'],
      'pages/strings.vue': ['setup.css', 'setup-strings.css'],
      'components/PublicSetupNav.vue': ['setup.css'],
      'components/CommunityPresets.vue': ['setup.css', 'setup-strings.css'],
      'components/StringsStringCard.vue': ['setup-strings.css'],
      'components/StringsClassSpecPicker.vue': ['setup-strings.css'],
      'components/StringCopyButton.vue': ['setup-strings.css'],
    }
    for (const [file, css] of Object.entries(owners)) {
      for (const name of css) assert.match(read(file), new RegExp(`import '~/assets/css/${name.replace('.', '\\.')}'`), `${file} imports ${name}`)
    }
    for (const file of ['pages/meta/index.vue', 'pages/news/index.vue', 'pages/index.vue']) {
      try { assert.doesNotMatch(read(file), /setup[\w-]*\.css/, file) } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e }
    }
  })

  it('every animation sits inside prefers-reduced-motion: no-preference and animates transform only', () => {
    const animated = declarations(setup).filter(d => /^animation(-|$)/.test(d.prop))
    assert.ok(animated.length >= 1, 'expected the rise animation')
    for (const d of animated) {
      assert.ok(d.atRules.some(a => /^@media\s*\(\s*prefers-reduced-motion:\s*no-preference\s*\)$/.test(a)), `${d.prop}: ${d.value} must be guarded`)
    }
    const keyframes = [...setup.matchAll(/@keyframes\s+[\w-]+\s*\{([\s\S]*?\}\s*)\}/g)].map(m => m[1]!)
    assert.ok(keyframes.length >= 1)
    for (const k of keyframes) {
      assert.doesNotMatch(k, /opacity|color|background/, 'contrast checkers sample real colours: keyframes move, they never fade')
      assert.match(k, /transform/)
    }
  })

  it('will-change only inside the guard', () => {
    for (const d of declarations(setup).filter(d => d.prop === 'will-change')) {
      assert.ok(d.atRules.some(a => a.includes('prefers-reduced-motion')), d.value)
    }
  })

  for (const [theme, selector] of [['dark', 'html.dark .public-shell'], ['light', 'html:not(.dark) .public-shell']] as const) {
    it(`${theme}: every colour stop of the .mg-title-grad headline is AA on the page background and surface`, () => {
      const t = themeBlock(tokens, selector)
      const block = setup.match(/\.mg-title-grad \{([^}]*)\}/)?.[1] ?? ''
      assert.match(block, /background-clip:\s*text/)
      const image = block.match(/background-image:\s*(linear-gradient\([^;]*\))\s*;/)?.[1]
      assert.ok(image, 'gradient missing')
      const stops = [...image!.matchAll(/var\(--mg-([a-z0-9-]+)\)|(#[0-9a-fA-F]{6})\b|(rgba?\([^)]*\)|hsla?\([^)]*\))/g)]
      assert.ok(stops.length >= 2)
      for (const m of stops) {
        assert.ok(!m[3], `stop ${m[3]} is not opaque`)
        const colour = m[1] ? t[m[1]] : m[2]
        assert.ok(colour, `${m[0]} does not resolve`)
        for (const surface of ['bg', 'surface']) {
          const ratio = contrastRatio(colour!, t[surface]!)
          assert.ok(ratio >= 4.5, `${theme}: ${m[0]} on ${surface} = ${ratio.toFixed(2)}`)
        }
      }
    })
  }

  it('the gradient headline falls back to a real colour under forced colours', () => {
    assert.match(setup, /@media \(forced-colors: active\)\s*\{\s*\.mg-title-grad \{[^}]*text-fill-color:\s*currentColor/)
  })

  it('global CSS never uses :deep() (it invalidates the whole selector list outside a scoped style)', () => {
    assert.doesNotMatch(setup, /:deep\(/)
  })

  it('card and list grids that hold long or truncating text can shrink (minmax(0, 1fr))', () => {
    assert.match(setup, /\.guide-layout \{[^}]*minmax\(0,\s*1fr\)/)
  })

  it('the strings tabs stack on mobile and only stick from 768px (a sticky multi-row block ate the viewport at 320px)', () => {
    const base = setup.match(/\.strings-tabs \{([^}]*)\}/)?.[1] ?? ''
    assert.doesNotMatch(base, /position:\s*sticky/)
    assert.match(setup, /@media \(min-width: 768px\)\s*\{[^}]*\.strings-tabs \{[^}]*position:\s*sticky/)
  })
})

/** Only the declared weights exist, so a class never silently resolves to a different face. */
describe('setup pages: font weights', () => {
  const files = [...SETUP_CSS, 'assets/css/main.css', 'assets/css/ui.css', 'assets/css/tokens.css', 'pages/index.vue', 'pages/guide.vue', 'pages/addons.vue', 'components/PublicSetupNav.vue', 'components/StringsStringCard.vue', 'components/StringsClassSpecPicker.vue', 'components/CommunityPresets.vue']

  it('public CSS uses only 400/600/700/800 (no 500 or 650: they would resolve to 400 and 700)', () => {
    for (const file of files) {
      for (const m of read(file).matchAll(/font-weight:\s*(\d+)/g)) assert.ok(['400', '600', '700', '800'].includes(m[1]!), `${file}: font-weight ${m[1]}`)
    }
  })

  it('mono is only used at 400 or 700 (the two declared mono faces)', () => {
    const fonts = read('assets/css/fonts.css')
    const mono = [...fonts.matchAll(/@font-face \{([^}]*)\}/g)].map(m => m[1]!).filter(f => /JetBrains Mono'/.test(f) && /url\(/.test(f))
    assert.deepEqual(mono.map(f => f.match(/font-weight:\s*(\d+)/)?.[1]).sort(), ['400', '700'])
  })

  it('the redesigned pages do not use Tailwind font-medium / font-light / font-black', () => {
    for (const file of files.filter(f => f.endsWith('.vue'))) {
      assert.doesNotMatch(read(file), /\bfont-(medium|light|thin|extralight|black)\b/, file)
    }
  })
})

/** Structure contracts of the redesigned pages: what the e2e specs and the screen readers depend on. */
describe('setup pages: structure', () => {
  const guide = read('pages/guide.vue')
  const addons = read('pages/addons.vue')
  const strings = read('pages/strings.vue')

  it('the pages read their colours from tokens, not from isDark class switches (guide and addons)', () => {
    assert.doesNotMatch(guide, /useIsDark|isDark/)
    assert.doesNotMatch(addons, /useIsDark|isDark/)
  })

  it('guide: numbered steps are an ordered list, the table of contents is an aside, the hero shot loads eagerly', () => {
    assert.match(guide, /<ol class="guide-steps"/)
    assert.match(guide, /<aside class="guide-toc[ "]/)
    assert.match(guide, /id="apply-one-module"/)
    assert.match(guide, /^\s+eager$/m)
  })

  it('addons: grouped sections with an h2 each and a list of rows', () => {
    assert.match(addons, /<section[^>]*>[\s\S]*?<h2/)
    assert.match(addons, /class="addon-list"/)
    assert.match(addons, /addon-required/)
  })

  it('strings: a real tablist with tab/tabpanel roles and the stable test ids', () => {
    assert.match(strings, /role="tablist"/)
    assert.match(strings, /role="tab"/)
    assert.match(strings, /role="tabpanel"/)
  })

  it('one h1 per page', () => {
    for (const [name, src] of [['guide', guide], ['addons', addons], ['strings', strings]] as const) {
      assert.equal((src.match(/<h1[\s>]/g) ?? []).length, 1, name)
    }
  })
})
