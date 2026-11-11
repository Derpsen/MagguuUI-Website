import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { absorbProfile, emptyProfileBucket, isTalentMapped, majorityBestBuild, parseTalentTreeLayout } from '../../server/utils/blizzardMetaAggregate'
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
