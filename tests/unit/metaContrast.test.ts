import assert from 'node:assert/strict'
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
})
