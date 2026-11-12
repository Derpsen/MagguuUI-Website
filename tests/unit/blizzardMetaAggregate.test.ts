import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { absorbProfile, buildClassSummaries, emptyProfileBucket, isTalentMapped, majorityBestBuild, parseTalentTreeLayout } from '../../server/utils/blizzardMetaAggregate'
import { FIXTURE_TALENT_TREE_FIRE } from '../fixtures/blizzard-meta/responses'
import { encodeLoadoutHeader } from '../../utils/metaLoadout'

describe('majorityBestBuild', () => {
  it('groups by hero tree and core talents, then copies the most common exact code', () => {
    const core = [1, 2, 3, 4, 5]
    const builds = [
      { heroId: 8, heroLabel: 'Sunfury', code: 'AAAA', treeHash: 'aa', talentIds: [...core, 10] },
      { heroId: 8, heroLabel: 'Sunfury', code: 'AAAA', treeHash: 'aa', talentIds: [...core, 11] },
      { heroId: 8, heroLabel: 'Sunfury', code: 'BBBB', treeHash: 'aa', talentIds: [...core, 12] },
      { heroId: 9, heroLabel: 'Spellslinger', code: 'CCCC', treeHash: 'aa', talentIds: [...core] },
    ]
    const best = majorityBestBuild(builds, 0.8)
    assert.ok(best)
    assert.equal(best.code, 'AAAA')
    assert.equal(best.count, 3)
    assert.equal(best.heroTree?.id, 8)
    assert.ok(best.share > 0.5)
  })
})

describe('unmapped talent picks', () => {
  it('keeps the loadout and marks picks that are not in the published layout, including empty CHOICE nodes', () => {
    const layout = parseTalentTreeLayout(FIXTURE_TALENT_TREE_FIRE, 63)
    assert.ok(layout)
    assert.ok(layout.class.some(node => node.node === 99830 && node.type === 'CHOICE' && node.choices.length === 0))
    const knownNodes = new Set(layout.class.map(node => node.node))
    const knownTalentIds = new Set(layout.class.flatMap(node => node.choices.map(choice => choice.talentId)))
    assert.equal(isTalentMapped({ id: 101, node: 101 }, knownNodes, knownTalentIds), true)
    assert.equal(isTalentMapped({ id: 55555, node: 55555 }, knownNodes, knownTalentIds), false)

    const code = encodeLoadoutHeader(1, 63, 'c0ffee00c0ffee00c0ffee00c0ffee00')
    const bucket = emptyProfileBucket()
    absorbProfile(bucket, {
      specsBody: {
        specializations: [{
          loadouts: [{
            is_active: true,
            talent_loadout_code: code,
            selected_class_talents: [
              { id: 101, talent: { id: 101, name: 'Known' } },
              { id: 55555, talent: { id: 55555, name: 'Hidden choice' } },
            ],
          }],
        }],
      },
      equipmentBody: { equipped_items: [] },
      knownNodes,
      knownTalentIds,
      tree: { hash: 'c0ffee00c0ffee00c0ffee00c0ffee00', build: null, nodeIds: knownNodes },
    })
    assert.equal(bucket.unknownTalentNodes, 1)
    assert.equal(bucket.builds.length, 1)
    assert.equal(bucket.talents.class.get('55555')?.extra.unmapped, true)
  })
})

describe('combined-slot gear share', () => {
  it('clamps ring/trinket/embellishment share to 1 when stacked slot counts exceed the profile total', () => {
    const bucket = emptyProfileBucket()
    bucket.profiles = 100
    bucket.gear.set('FINGER_1:123', { count: 80, label: 'Loop', extra: { slot: 'FINGER_1', itemId: 123, crafted: false, embellished: false } })
    bucket.gear.set('FINGER_2:123', { count: 80, label: 'Loop', extra: { slot: 'FINGER_2', itemId: 123, crafted: false, embellished: false } })
    bucket.gear.set('TRINKET_1:456', { count: 90, label: 'Charm', extra: { slot: 'TRINKET_1', itemId: 456, crafted: false, embellished: false } })
    bucket.gear.set('TRINKET_2:456', { count: 70, label: 'Charm', extra: { slot: 'TRINKET_2', itemId: 456, crafted: false, embellished: false } })
    bucket.gear.set('HEAD:789', { count: 40, label: 'Cinder Helm', extra: { slot: 'HEAD', itemId: 789, crafted: false, embellished: true } })
    bucket.gear.set('WRIST:321', { count: 80, label: 'Cinder Cuffs', extra: { slot: 'WRIST', itemId: 321, crafted: false, embellished: true } })
    const specPop = new Map([
      ['Mage|Fire', { className: 'Mage', specName: 'Fire', count: 100, keyLevels: [] }],
    ])
    const classes = buildClassSummaries(specPop, new Map([['Mage|Fire', bucket]]), 100)
    const fire = classes.find(cls => cls.slug === 'mage')?.specs.find(spec => spec.slug === 'fire')
    assert.ok(fire)
    const ring = fire.rings.find(item => item.itemId === 123)
    const trinket = fire.trinkets.find(item => item.itemId === 456)
    assert.ok(ring)
    assert.ok(trinket)
    assert.equal(ring.count, 160)
    assert.equal(trinket.count, 160)
    assert.equal(ring.share, 1)
    assert.equal(trinket.share, 1)
    assert.ok(fire.embellishments.length >= 1)
    assert.ok(fire.embellishments.every(item => item.share <= 1))
  })
})

describe('buildClassSummaries catalog guard', () => {
  it('drops leaderboard specs that are not in the Meta catalog', () => {
    const bucket = emptyProfileBucket()
    const specPop = new Map([
      ['Mage|Fire', { className: 'Mage', specName: 'Fire', count: 10, keyLevels: [] }],
      ['Mage|Chronomancer', { className: 'Mage', specName: 'Chronomancer', count: 8, keyLevels: [] }],
    ])
    const classes = buildClassSummaries(specPop, new Map([['Mage|Fire', bucket], ['Mage|Chronomancer', bucket]]), 18)
    const mage = classes.find(cls => cls.slug === 'mage')
    assert.ok(mage)
    assert.equal(mage.specs.some(spec => spec.slug === 'chronomancer'), false)
    assert.ok(mage.specs.some(spec => spec.slug === 'fire'))
  })
})
