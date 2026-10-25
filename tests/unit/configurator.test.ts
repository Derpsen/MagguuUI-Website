import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  REQUIRED_SLUG, SINGLE_IMPORT_SLUGS, buildOutput, parseSelection, presetSelection, selectionToQuery, toggleAddon, toggleProfile,
  type ConfiguratorData,
} from '../../utils/configurator'
import { buildConfiguratorData } from '../../server/utils/configuratorData'

const data: ConfiguratorData = {
  addons: [
    { slug: 'ellesmereui', name: 'EllesmereUI', category: 'required', url: 'https://example.test/e', pack: 'starter', singleImport: true, profiles: [{ id: 1, name: 'Default' }] },
    { slug: 'bigwigs', name: 'BigWigs', category: 'core', url: null, pack: 'starter', singleImport: true, profiles: [{ id: 2, name: 'Default' }, { id: 3, name: 'Boss Options' }] },
    { slug: 'littlewigs', name: 'LittleWigs', category: 'optional', url: null, pack: 'starter', singleImport: false, profiles: [] },
    { slug: 'gtfo', name: 'GTFO', category: 'optional', url: null, pack: 'optional', singleImport: false, profiles: [{ id: 4, name: 'Default' }] },
    { slug: 'orphan', name: 'Orphan', category: 'optional', url: null, pack: null, singleImport: false, profiles: [] },
  ],
  packs: [
    { key: 'starter', label: 'Starter Addons', id: 10, addons: ['EllesmereUI', 'MagguuUI', 'BigWigs', 'LittleWigs'] },
    { key: 'optional', label: 'Optional Addons', id: 11, addons: ['GTFO', 'Auctionator'] },
  ],
}

describe('parseSelection', () => {
  it('always contains the required addon and ignores unknown slugs and duplicates', () => {
    assert.deepEqual(parseSelection({}, data).addons, ['ellesmereui'])
    assert.deepEqual(parseSelection({ addons: 'gtfo,nope,gtfo,bigwigs' }, data).addons, ['ellesmereui', 'gtfo', 'bigwigs'])
  })
  it('drops excludes for unselected addons or unknown profiles', () => {
    const sel = parseSelection({ addons: 'bigwigs', exclude: 'bigwigs:Boss Options,bigwigs:Ghost,gtfo:Default,broken' }, data)
    assert.deepEqual(sel.exclude, ['bigwigs:Boss Options'])
  })
  it('tolerates junk: arrays, bad escapes, huge values', () => {
    assert.deepEqual(parseSelection({ addons: ['gtfo', 'bigwigs'] }, data).addons, ['ellesmereui', 'gtfo'])
    assert.deepEqual(parseSelection({ addons: '%E0%A4%A,gtfo' }, data).addons, ['ellesmereui', 'gtfo'])
    assert.deepEqual(parseSelection({ addons: 'x,'.repeat(5000) }, data).addons, ['ellesmereui'])
  })
})

describe('selection ↔ query round trip', () => {
  it('keeps the default URL clean', () => {
    assert.deepEqual(selectionToQuery(parseSelection({}, data), data), {})
  })
  it('round-trips addons and excluded profiles, including names with spaces and commas', () => {
    const odd: ConfiguratorData = { ...data, addons: [...data.addons, { slug: 'x', name: 'X', category: 'optional', url: null, pack: null, singleImport: false, profiles: [{ id: 9, name: 'A, B' }, { id: 8, name: 'C' }] }] }
    const sel = toggleProfile(toggleAddon(parseSelection({}, odd), 'x', true), 'x', 'A, B', false)
    const query = selectionToQuery(sel, odd)
    assert.equal(query.addons, 'x')
    assert.equal(query.exclude, 'x:A%2C B')
    assert.deepEqual(parseSelection(query, odd), sel)
  })
})

describe('toggles and presets', () => {
  it('cannot switch the required addon off', () => {
    assert.deepEqual(toggleAddon(parseSelection({}, data), REQUIRED_SLUG, false).addons, ['ellesmereui'])
  })
  it('removing an addon also forgets its excluded profiles', () => {
    let sel = toggleAddon(parseSelection({}, data), 'bigwigs', true)
    sel = toggleProfile(sel, 'bigwigs', 'Default', false)
    assert.deepEqual(sel.exclude, ['bigwigs:Default'])
    sel = toggleAddon(sel, 'bigwigs', false)
    assert.deepEqual(sel, { addons: ['ellesmereui'], exclude: [] })
  })
  it('presets: required only, starter set, everything', () => {
    assert.deepEqual(presetSelection(data, 'required').addons, ['ellesmereui'])
    assert.deepEqual(presetSelection(data, 'starter').addons, ['ellesmereui', 'bigwigs', 'littlewigs'])
    assert.equal(presetSelection(data, 'all').addons.length, 5)
  })
})

describe('buildOutput', () => {
  it('covers only the packs that contain a selected addon and lists the extras honestly', () => {
    const out = buildOutput(data, parseSelection({ addons: 'gtfo' }, data))
    assert.deepEqual(out.packs.map(p => p.pack.key), ['starter', 'optional'])
    assert.deepEqual(out.packs[0]!.covers, ['EllesmereUI'])
    assert.deepEqual(out.packs[0]!.extras, ['MagguuUI', 'BigWigs', 'LittleWigs'])
    assert.deepEqual(out.packs[1]!.covers, ['GTFO'])
    assert.deepEqual(out.packs[1]!.extras, ['Auctionator'])
    const starterOnly = buildOutput(data, parseSelection({}, data))
    assert.deepEqual(starterOnly.packs.map(p => p.pack.key), ['starter'])
  })
  it('lists the selected addons and flags the ones outside every pack', () => {
    const out = buildOutput(data, parseSelection({ addons: 'orphan,littlewigs' }, data))
    assert.deepEqual(out.addonList, ['EllesmereUI', 'LittleWigs', 'Orphan'])
    assert.deepEqual(out.outsidePacks, ['Orphan'])
  })
  it('outputs profiles only for selected addons and honors excluded profiles', () => {
    const out = buildOutput(data, parseSelection({ addons: 'bigwigs,gtfo', exclude: 'bigwigs:Default' }, data))
    assert.deepEqual(out.profiles.map(p => [p.addon.slug, p.profiles.map(x => x.id)]), [['ellesmereui', [1]], ['bigwigs', [3]], ['gtfo', [4]]])
    const none = buildOutput(data, parseSelection({ addons: 'bigwigs', exclude: 'bigwigs:Default,bigwigs:Boss Options' }, data))
    assert.deepEqual(none.profiles.map(p => p.addon.slug), ['ellesmereui'])
  })
  it('separates single-import addons from apply-only ones and never implies per-module apply', () => {
    const out = buildOutput(data, parseSelection({ addons: 'bigwigs,gtfo,littlewigs' }, data))
    assert.deepEqual(out.singleImport, ['EllesmereUI', 'BigWigs'])
    assert.deepEqual(out.applyOnly, ['GTFO'])
    assert.deepEqual(out.noProfile, ['LittleWigs'])
  })
  it('SINGLE_IMPORT_SLUGS matches the verified Setup single-import list', () => {
    assert.deepEqual([...SINGLE_IMPORT_SLUGS].sort(), ['bigwigs', 'ellesmereui', 'exboss', 'northern-sky-raid-tools', 'smart-reminders', 'whisper-messenger'])
  })
})

describe('buildConfiguratorData', () => {
  const rows = [
    { slug: 'smart-reminders', name: 'Smart Reminders', category: 'optional', url: null, sortOrder: 2 },
    { slug: 'ellesmereui', name: 'EllesmereUI', category: 'required', url: null, sortOrder: 0 },
    { slug: 'bigwigs', name: 'BigWigs', category: 'core', url: null, sortOrder: 1 },
    { slug: 'littlewigs', name: 'LittleWigs', category: 'optional', url: null, sortOrder: 1 },
  ]
  const profiles = { EllesmereUI: [{ id: 1, profile: 'Default' }], BigWigs: [{ id: 3, profile: 'Default' }, { id: 4, profile: 'Default' }], NaowhSmartReminders: [{ id: 5, profile: 'Default' }] }
  const packs = {
    Required: { id: 10, addonNames: ['EllesmereUI', 'MagguuUI', 'BigWigs (Boss Timers & Tools)', 'LittleWigs'] },
    Optional: { id: 11, addonNames: ['Naowh Smart Reminders'] },
    'E2E Test Pack': { id: 12, addonNames: ['Everything'] },
  }
  it('orders by category, maps pack membership by display name and dedupes profile names', () => {
    const out = buildConfiguratorData(rows, profiles, packs)
    assert.deepEqual(out.addons.map(a => a.slug), ['ellesmereui', 'bigwigs', 'littlewigs', 'smart-reminders'])
    assert.deepEqual(out.addons.map(a => a.pack), ['starter', 'starter', 'starter', 'optional'])
    assert.deepEqual(out.addons[1]!.profiles, [{ id: 3, name: 'Default' }])
    assert.equal(out.addons[3]!.profiles.length, 1)
    assert.equal(out.addons[2]!.profiles.length, 0)
    assert.equal(out.addons[3]!.singleImport, true)
  })
  it('exposes only the two Magguu collections, with public labels and without third-party-hostile names', () => {
    const out = buildConfiguratorData(rows, profiles, packs)
    assert.deepEqual(out.packs.map(p => [p.key, p.label, p.id]), [['starter', 'Starter Addons', 10], ['optional', 'Optional Addons', 11]])
    assert.deepEqual(out.packs[1]!.addons, ['Smart Reminders'])
    assert.doesNotMatch(JSON.stringify(out), /naowh/i)
  })
  it('has no pack membership when a collection is unpublished', () => {
    const out = buildConfiguratorData(rows, profiles, { Optional: packs.Optional })
    assert.deepEqual(out.packs.map(p => p.key), ['optional'])
    assert.equal(out.addons[0]!.pack, null)
  })
})
