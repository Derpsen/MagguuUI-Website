// renovate.json drives all dependency PRs, security fixes included (Dependabot updates are off since 2026-11-02; alerts stay on).
// These tests pin the safety rules: locks with reasons, no automerge for majors/0.x/overrides, 7-day release age.
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const cfg = JSON.parse(readFileSync(new URL('../../renovate.json', import.meta.url), 'utf8'))
type Rule = { description: string, matchPackageNames?: string[], allowedVersions?: string, matchUpdateTypes?: string[], matchDepTypes?: string[], automerge?: boolean, matchCurrentVersion?: string, minimumReleaseAge?: string, enabled?: boolean }
const rules: Rule[] = cfg.packageRules
const lock = (name: string) => rules.find(r => r.matchPackageNames?.includes(name) && r.allowedVersions)

describe('renovate.json', () => {
  test('locks are packageRules with a reason: typescript <7, h3 <2 (satori is gone, OG renders with Takumi)', () => {
    assert.equal(lock('typescript')?.allowedVersions, '<7')
    assert.match(lock('typescript')!.description, /typescript-eslint/)
    assert.equal(lock('h3')?.allowedVersions, '<2')
    assert.match(lock('h3')!.description, /Nitro/)
    assert.equal(lock('satori'), undefined, 'satori is not a dependency any more')
    assert.equal(lock('js-yaml'), undefined, 'js-yaml 5 is allowed')
  })

  test('automerge only for patch/pin/digest and stable minors, never majors, 0.x minors or overrides', () => {
    const merge = rules.filter(r => r.automerge === true)
    assert.ok(merge.length >= 2)
    for (const r of merge) assert.ok(!r.matchUpdateTypes?.includes('major'), r.description)
    const stableMinor = merge.find(r => r.matchUpdateTypes?.includes('minor'))
    assert.equal(stableMinor?.matchCurrentVersion, '!/^0/')
    const off = (re: RegExp) => rules.find(r => re.test(r.description))
    assert.equal(off(/^Majors never/)?.automerge, false)
    assert.equal(off(/^0\.x minors/)?.automerge, false)
    assert.equal(rules.find(r => r.matchDepTypes?.includes('overrides'))?.automerge, false)
    const ovMajor = rules.find(r => r.matchDepTypes?.includes('overrides') && r.matchUpdateTypes?.includes('major'))
    assert.equal(ovMajor?.enabled, false, 'an override must never jump a major on its own (consumers declare the range)')
    // the overrides rule must come after the automerge rules (later rules win)
    assert.ok(rules.findIndex(r => r.matchDepTypes?.includes('overrides')) > rules.lastIndexOf(merge.at(-1)!))
  })

  test('security fixes come from Renovate vulnerabilityAlerts, labelled, majors never automerged', () => {
    assert.equal(cfg.vulnerabilityAlerts?.enabled, true)
    assert.deepEqual(cfg.vulnerabilityAlerts?.labels, ['security'])
    // no automerge override here: the packageRules decide (patch/minor yes, majors and overrides no)
    assert.equal('automerge' in cfg.vulnerabilityAlerts, false)
    assert.equal(rules.find(r => r.matchUpdateTypes?.length === 1 && r.matchUpdateTypes[0] === 'major')?.automerge, false)
  })

  test('checks must be green (ignoreTests false, PR automerge), 7 day release age, engines respected, Node majors manual', () => {
    assert.equal(cfg.ignoreTests, false)
    assert.equal(cfg.automergeType, 'pr')
    assert.equal(cfg.constraintsFiltering, 'strict')
    assert.equal(cfg.internalChecksFilter, 'strict')
    assert.ok(rules.some(r => r.minimumReleaseAge === '7 days'))
    assert.ok(!rules.some(r => r.minimumReleaseAge === '3 days'))
    const node = rules.find(r => r.matchPackageNames?.includes('node') && r.enabled === false)
    assert.deepEqual(node?.matchUpdateTypes, ['major'])
  })

  test('the Dockerfile carries the annotation the custom manager matches', () => {
    const docker = readFileSync(new URL('../../Dockerfile', import.meta.url), 'utf8')
    const rx = new RegExp(cfg.customManagers[0].matchStrings[0])
    const m = rx.exec(docker)
    assert.equal(m?.groups?.depName, 'node')
    assert.equal(m?.groups?.currentValue, '26-bookworm-slim')
    assert.match(m?.groups?.currentDigest ?? '', /^sha256:[a-f0-9]{64}$/)
  })
})
