import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { deserializeProfileBucket, emptyProfileBucket, increment, serializeProfileBucket } from '../../server/utils/blizzardMetaAggregate'

describe('profile bucket staging serialization', () => {
  it('round-trips counts maps, hero buckets and builds', () => {
    const bucket = emptyProfileBucket()
    bucket.profiles = 2
    increment(bucket.talents.class, '101', 'Known')
    increment(bucket.heroes, '800', 'Sunfury')
    bucket.builds.push({ heroId: 800, heroLabel: 'Sunfury', code: 'abc', treeHash: 'c0ffee', talentIds: [101] })
    bucket.ilvlSamples.set('HEAD', [668, 670])
    bucket.unknownTalentNodes = 1
    const again = deserializeProfileBucket(serializeProfileBucket(bucket))
    assert.equal(again.profiles, 2)
    assert.equal(again.talents.class.get('101')?.label, 'Known')
    assert.equal(again.heroes.get('800')?.count, 1)
    assert.deepEqual(again.ilvlSamples.get('HEAD'), [668, 670])
    assert.equal(again.builds[0]?.code, 'abc')
    assert.equal(again.unknownTalentNodes, 1)
  })
})
