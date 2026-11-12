import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

describe('meta own tooltips', () => {
  it('keeps heatmap and gear free of Wowhead links and third-party tooltip scripts', () => {
    const heatmap = readFileSync(new URL('../../components/MetaTalentHeatmap.vue', import.meta.url), 'utf8')
    const gear = readFileSync(new URL('../../components/MetaGearSlots.vue', import.meta.url), 'utf8')
    const tip = readFileSync(new URL('../../components/MetaTooltip.vue', import.meta.url), 'utf8')
    for (const [name, source] of [['heatmap', heatmap], ['gear', gear], ['tooltip', tip]] as const) {
      assert.doesNotMatch(source, /wowhead/i, name)
      assert.doesNotMatch(source, /PowerTip|WowheadPower|tooltip\.js/i, name)
    }
    assert.match(heatmap, /<MetaTooltip/)
    assert.match(gear, /<MetaTooltip/)
    assert.match(tip, /role="tooltip"/)
    assert.match(tip, /aria-describedby/)
    assert.match(tip, /keydown\.escape/)
  })

  it('defers hydration of the below-fold heatmap, gear and tooltips until they are visible', () => {
    const page = readFileSync(new URL('../../pages/meta/[classSlug]/[specSlug].vue', import.meta.url), 'utf8')
    assert.match(page, /<LazyMetaSpecBelowFold\b/)
    assert.match(page, /hydrate-on-visible/)
    assert.doesNotMatch(page, /<MetaTalentHeatmap\b/)
    assert.doesNotMatch(page, /<MetaGearSlots\b/)
  })
})
