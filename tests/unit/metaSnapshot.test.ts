import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import { parseMetaSnapshotPayload } from '../../utils/metaSnapshot'
import { META_MIN_SAMPLE } from '../../utils/metaTypes'

const fixturePath = new URL('../fixtures/blizzard-meta/snapshot.json', import.meta.url)

describe('meta snapshot fixture', () => {
  it('parses the canonical fixture and keeps player names out of the schema', () => {
    const raw = readFileSync(fixturePath, 'utf8')
    const payload = parseMetaSnapshotPayload(raw)
    assert.ok(payload)
    assert.equal(payload.region, 'eu')
    assert.equal(payload.focus, 'mythic-plus')
    assert.ok(payload.season && Number.isFinite(payload.season.id))
    assert.ok(payload.period && Number.isFinite(payload.period.id))
    assert.equal(payload.freshness.source, 'blizzard')
    assert.equal(payload.freshness.region, 'eu')
    assert.ok(payload.freshness.fetchedAt < 1e12, 'fetchedAt is Unix seconds')
    const fire = payload.classes.flatMap(cls => cls.specs).find(spec => spec.slug === 'fire')
    assert.ok(fire)
    assert.ok(fire.loadouts.length >= 1)
    assert.ok(fire.loadouts.every(row => typeof row.code === 'string' && row.code.length > 0))
    assert.ok(fire.heroSplit.length >= 1)
    assert.ok(fire.gearSlots.some(slot => slot.items[0] && slot.items[0].share >= 0 && slot.items[0].share <= 1))
    assert.ok(fire.stats.length >= 1)
    assert.equal(fire.belowMinSample, fire.characterCount < META_MIN_SAMPLE)
    const frost = payload.classes.flatMap(cls => cls.specs).find(spec => spec.slug === 'frost')
    assert.ok(frost)
    assert.equal(frost.belowMinSample, true)
    assert.ok(frost.characterCount < META_MIN_SAMPLE)
    assert.doesNotMatch(raw, /playerName|characterName|battletag/i)
  })

  it('rejects malformed payloads and player-name keys', () => {
    assert.equal(parseMetaSnapshotPayload('{'), null)
    assert.equal(parseMetaSnapshotPayload({ region: 'us', focus: 'mythic-plus' }), null)
    const ok = parseMetaSnapshotPayload(readFileSync(fixturePath, 'utf8'))
    assert.ok(ok)
    assert.equal(parseMetaSnapshotPayload({ ...ok, playerName: 'Someone' }), null)
    assert.equal(parseMetaSnapshotPayload({ ...ok, freshness: { ...ok.freshness, region: 'us' } }), null)
  })
})
