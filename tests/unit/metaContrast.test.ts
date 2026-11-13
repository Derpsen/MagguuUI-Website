import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import {
  META_CLASSES,
  META_MIN_CONTRAST_RATIO,
  META_TEXT_BG_DARK,
  META_TEXT_BG_LIGHT,
  contrastRatio,
  contrastSafeColor,
  metaClassColor,
  metaClassTextColor,
} from '../../utils/metaCatalog'

describe('class color contrast', () => {
  it('gives every class a text colour of at least 4.5:1 on the light and dark page backgrounds', () => {
    assert.ok(META_CLASSES.length >= 13)
    for (const cls of META_CLASSES) {
      const official = metaClassColor(cls.slug)
      const light = metaClassTextColor(cls.slug, false)
      const dark = metaClassTextColor(cls.slug, true)
      const lightRatio = contrastRatio(light, META_TEXT_BG_LIGHT)
      const darkRatio = contrastRatio(dark, META_TEXT_BG_DARK)
      assert.ok(lightRatio >= META_MIN_CONTRAST_RATIO, `${cls.slug} light ${light} on ${META_TEXT_BG_LIGHT} = ${lightRatio.toFixed(2)} (official ${official})`)
      assert.ok(darkRatio >= META_MIN_CONTRAST_RATIO, `${cls.slug} dark ${dark} on ${META_TEXT_BG_DARK} = ${darkRatio.toFixed(2)} (official ${official})`)
    }
    assert.equal(contrastSafeColor('#ffffff', false) === '#ffffff', false)
  })

  it('lightens Shaman on dark backgrounds instead of greying it out', () => {
    const official = metaClassColor('shaman')
    const dark = metaClassTextColor('shaman', true)
    assert.notEqual(dark.toLowerCase(), official.toLowerCase())
    assert.ok(contrastRatio(dark, META_TEXT_BG_DARK) >= META_MIN_CONTRAST_RATIO)
    const channels = dark.replace('#', '')
    const r = Number.parseInt(channels.slice(0, 2), 16)
    const g = Number.parseInt(channels.slice(2, 4), 16)
    const b = Number.parseInt(channels.slice(4, 6), 16)
    assert.ok(b > r && b > g, `expected a blue-leaning tint, got ${dark}`)
    assert.ok(!['#e5e7eb', '#111827', '#9ca3af', '#6b7280'].includes(dark.toLowerCase()))
  })
})

describe('low-sample rows stay contrast-safe', () => {
  it('does not dim Meta rows with opacity-60', () => {
    const dir = join(process.cwd(), 'components')
    const leftovers: string[] = []
    for (const name of readdirSync(dir)) {
      if (!/^Meta.*\.vue$/.test(name)) continue
      const text = readFileSync(join(dir, name), 'utf8')
      if (text.includes('opacity-60')) leftovers.push(name)
    }
    assert.deepEqual(leftovers, [])
    const index = readFileSync(join(dir, 'MetaSpecIndex.vue'), 'utf8')
    assert.match(index, /tone\.lowRow/)
    const tone = readFileSync(join(process.cwd(), 'composables/useMetaTone.ts'), 'utf8')
    assert.match(tone, /lowRow:[\s\S]*shadow-\[inset_3px_0_0_0_/)
    assert.equal(/lowRow:[\s\S]*?bg-/.test(tone), false)
  })
})

function mixHex(fg: string, bg: string, amount: number): string {
  const parse = (hex: string) => [1, 3, 5].map(i => Number.parseInt(hex.slice(i, i + 2), 16))
  const f = parse(fg)
  const b = parse(bg)
  const mixed = f.map((v, i) => Math.round(v * amount + b[i]! * (1 - amount)))
  return `#${mixed.map(v => v.toString(16).padStart(2, '0')).join('')}`
}

describe('meta ad slot placement and heatmap contrast', () => {
  it('shows the sidebar slot only from the xl breakpoint with a 150px gap from the main column', () => {
    const page = readFileSync(join(process.cwd(), 'pages/meta/[classSlug]/[specSlug].vue'), 'utf8')
    assert.match(page, /xl:grid xl:grid-cols-\[minmax\(0,1fr\)_16rem\] xl:gap-x-\[150px\]/)
    assert.match(page, /<aside class="hidden xl:block">/)
    assert.match(page, /placement="sidebar"/)
    assert.doesNotMatch(page, /hidden lg:block/)
  })

  it('keeps heatmap cell muted text at least 4.5:1 on the darkest wash in dark and light', () => {
    const heatmap = readFileSync(join(process.cwd(), 'components/MetaTalentHeatmap.vue'), 'utf8')
    const tone = readFileSync(join(process.cwd(), 'composables/useMetaTone.ts'), 'utf8')
    assert.match(tone, /heatMuted:[\s\S]*text-mg-fg'/)
    assert.match(heatmap, /tone\.heatMuted/)
    const darkHeat = mixHex('#0AA882', META_TEXT_BG_DARK, 0.28)
    const lightHeat = mixHex('#0AA882', META_TEXT_BG_LIGHT, 0.22)
    // heatMuted is `text-mg-fg`: read the real foreground of each theme from tokens.css.
    const tokens = readFileSync(join(process.cwd(), 'assets/css/tokens.css'), 'utf8')
    const fg = (selector: string) => {
      const start = tokens.indexOf(`${selector} {`)
      assert.ok(start >= 0, `${selector} missing in tokens.css`)
      const body = tokens.slice(tokens.indexOf('{', start) + 1, tokens.indexOf('}', start))
      return /--mg-fg:\s*(#[0-9a-fA-F]{6})/.exec(body)![1]!
    }
    assert.ok(contrastRatio(fg('html.dark .public-shell'), darkHeat) >= META_MIN_CONTRAST_RATIO, `dark heat ${darkHeat}`)
    assert.ok(contrastRatio(fg('html:not(.dark) .public-shell'), lightHeat) >= META_MIN_CONTRAST_RATIO, `light heat ${lightHeat}`)
  })
})
