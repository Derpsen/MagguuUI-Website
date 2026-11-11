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
