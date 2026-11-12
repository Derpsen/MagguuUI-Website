import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import { explainMetaSnapshotRejection, parseMetaSnapshotPayload } from '../../utils/metaSnapshot'
import { META_MIN_BUILD_SAMPLE, META_MIN_SHOW_SAMPLE, specDataState } from '../../utils/metaTypes'

const fixturePath = new URL('../fixtures/blizzard-meta/snapshot.json', import.meta.url)

describe('meta snapshot fixture', () => {
  it('parses the canonical fixture, including normal, low-sample, collecting, empty, Augmentation and Devourer', () => {
    const raw = readFileSync(fixturePath, 'utf8')
    const payload = parseMetaSnapshotPayload(raw)
    assert.ok(payload)
    assert.equal(payload.region, 'eu')
    assert.equal(payload.focus, 'mythic-plus')
    assert.ok(payload.season && Number.isFinite(payload.season.id))
    assert.ok(payload.periods && payload.periods.included.length === 3)
    assert.equal(payload.periods.current.id, payload.periods.included[0]?.id)
    assert.ok(payload.talentTree?.hash)
    assert.equal(payload.freshness.source, 'blizzard')
    assert.ok(payload.freshness.fetchedAt < 1e12, 'fetchedAt is Unix seconds')
    assert.equal(payload.basis.players, payload.sampled.players)
    const fire = payload.classes.flatMap(cls => cls.specs).find(spec => spec.slug === 'fire')
    assert.ok(fire)
    assert.equal(fire.lowSample, false)
    assert.equal(fire.empty, false)
    assert.equal(fire.collecting, false)
    assert.ok(fire.n >= META_MIN_BUILD_SAMPLE)
    assert.ok(fire.bestBuild?.code)
    assert.ok(fire.loadouts.every(row => typeof row.code === 'string' && row.treeHash))
    assert.ok(fire.heroSplit.length >= 1)
    assert.ok(fire.gearSlots.some(slot => slot.items[0] && slot.items[0].ilvl != null))
    const frost = payload.classes.flatMap(cls => cls.specs).find(spec => spec.slug === 'frost')
    assert.ok(frost)
    assert.equal(specDataState(frost.n), 'collecting')
    assert.equal(frost.collecting, true)
    assert.ok(frost.n < META_MIN_SHOW_SAMPLE)
    assert.equal(frost.bestBuild, null)
    const arcane = payload.classes.flatMap(cls => cls.specs).find(spec => spec.slug === 'arcane')
    assert.ok(arcane)
    assert.equal(arcane.empty, true)
    assert.equal(arcane.n, 0)
    const aug = payload.classes.flatMap(cls => cls.specs).find(spec => spec.slug === 'augmentation')
    assert.ok(aug)
    assert.equal(aug.lowSample, false)
    assert.ok(aug.bestBuild)
    const devourer = payload.classes.flatMap(cls => cls.specs).find(spec => spec.slug === 'devourer')
    assert.ok(devourer)
    assert.equal(devourer.lowSample, true)
    assert.equal(devourer.bestBuild, null)
    assert.doesNotMatch(raw, /"name"|"realm"|"character"|playerName|characterName|battletag/i)
  })

  it('rejects malformed payloads, reserved keys, and mismatched sample flags', () => {
    assert.equal(parseMetaSnapshotPayload('{'), null)
    assert.equal(parseMetaSnapshotPayload({ region: 'us', focus: 'mythic-plus' }), null)
    const ok = parseMetaSnapshotPayload(readFileSync(fixturePath, 'utf8'))
    assert.ok(ok)
    assert.equal(parseMetaSnapshotPayload({ ...ok, playerName: 'Someone' }), null)
    assert.equal(parseMetaSnapshotPayload({ ...ok, freshness: { ...ok.freshness, Name: 'nope' } }), null)
    assert.equal(parseMetaSnapshotPayload({ ...ok, freshness: { ...ok.freshness, name: 'nope' } }), null)
    assert.equal(parseMetaSnapshotPayload({ ...ok, freshness: { ...ok.freshness, fetchedAt: ok.freshness.fetchedAt * 1000 } }), null)
    assert.equal(parseMetaSnapshotPayload({ ...ok, freshness: { ...ok.freshness, fetchedAt: -1 } }), null)
    assert.equal(parseMetaSnapshotPayload({
      ...ok,
      classes: [...ok.classes, { ...ok.classes[0]!, slug: 'not-a-class' }],
    }), null)
    assert.equal(parseMetaSnapshotPayload({
      ...ok,
      classes: [...ok.classes, ok.classes[0]!],
    }), null)
    const staleHash = ok.talentTree?.hash ? `${ok.talentTree.hash}-old` : 'stale'
    assert.equal(parseMetaSnapshotPayload({
      ...ok,
      classes: ok.classes.map(cls => ({
        ...cls,
        specs: cls.specs.map(spec => spec.slug === 'fire'
          ? { ...spec, loadouts: spec.loadouts.map((row, i) => i === 0 ? { ...row, treeHash: staleHash } : row) }
          : spec),
      })),
    }), null)
    const fire = ok.classes.flatMap(cls => cls.specs).find(spec => spec.slug === 'fire')
    assert.ok(fire)
    assert.equal(parseMetaSnapshotPayload({
      ...ok,
      classes: ok.classes.map(cls => ({
        ...cls,
        specs: cls.specs.map(spec => spec.slug === 'fire' ? { ...spec, lowSample: true } : spec),
      })),
    }), null)
  })
})

  it('explains why a live-shaped payload is rejected', () => {
    const ok = parseMetaSnapshotPayload(readFileSync(fixturePath, 'utf8'))
    assert.ok(ok)
    assert.match(explainMetaSnapshotRejection({ ...ok, region: 'us' }), /region\/focus/)
    const missingCurrent = {
      ...ok,
      periods: { current: { id: 100 }, included: [{ id: 99 }, { id: 98 }] },
      basis: { ...ok.basis, periods: { current: { id: 100 }, included: [{ id: 99 }, { id: 98 }] } },
    }
    assert.equal(parseMetaSnapshotPayload(missingCurrent), null)
    assert.match(explainMetaSnapshotRejection(missingCurrent), /periods\.current\.id 100 is not in periods\.included/)
    const fire = ok.classes.flatMap(cls => cls.specs).find(spec => spec.slug === 'fire')
    assert.ok(fire)
    if (fire.rings[0]) {
      const overShare = {
        ...ok,
        classes: ok.classes.map(cls => ({
          ...cls,
          specs: cls.specs.map(spec => spec.slug === 'fire'
            ? { ...spec, rings: [{ ...fire.rings[0]!, share: 1.6 }] }
            : spec),
        })),
      }
      assert.equal(parseMetaSnapshotPayload(overShare), null)
      assert.match(explainMetaSnapshotRejection(overShare), /rings\[0\]\.share is 1\.6/)
    }
  })
