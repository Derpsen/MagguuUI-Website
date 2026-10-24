import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { queryTokens, searchEntries, withinOneEdit, type MatchableEntry } from '../../utils/searchMatch'

const entries: MatchableEntry[] = [
  { id: 'g1', group: 'Guide', label: '1. Install EllesmereUI', text: 'Download EllesmereUI from CurseForge', body: 'Download EllesmereUI from CurseForge, Wago or WoWInterface and unpack it.', to: '/guide#step-1' },
  { id: 'g2', group: 'Guide', label: 'Apply only one module', text: 'Import a single profile', body: 'Use the Import BigWigs profile button in Setup. Zebrafish.', to: '/guide#apply-one-module' },
  { id: 'c1', group: 'Changelog', label: 'Changelog · v12.1.8', text: 'Fixes the Setup page', body: 'Fixes the Setup page. A long list of notes follows here and the Zebrafish bug is gone for good, as the unit frame no longer flickers.', to: '/changelog#release-v12-1-8' },
  { id: 'c2', group: 'Changelog', label: 'Changelog · v12.1.7', text: 'Adds profiles', body: 'Adds profiles.', to: '/changelog#release-v12-1-7' },
  { id: 's1', group: 'Strings', label: 'BigWigs · Magguu', text: 'Addon profile import string', to: '/strings?tab=profiles' },
]

describe('queryTokens', () => {
  it('lowercases, splits on whitespace and caps the word count', () => {
    assert.deepEqual(queryTokens('  Big   WIGS '), ['big', 'wigs'])
    assert.deepEqual(queryTokens('   '), [])
    assert.equal(queryTokens('a b c d e f g h').length, 6)
  })
})

describe('searchEntries', () => {
  it('matches words that only occur in the full body and shows a snippet', () => {
    const hits = searchEntries(entries, 'zebrafish')
    assert.deepEqual(hits.map(h => h.entry.id), ['g2', 'c1'])
    assert.match(hits[1]!.snippet, /Zebrafish bug is gone/)
    assert.ok(hits[1]!.snippet.startsWith('…'), 'snippet is cut out of a longer body')
  })

  it('requires every word (AND) and is case-insensitive', () => {
    assert.deepEqual(searchEntries(entries, 'IMPORT bigwigs').map(h => h.entry.id), ['s1', 'g2'])
    assert.deepEqual(searchEntries(entries, 'bigwigs wago'), [])
  })

  it('ranks label hits above preview hits above body hits', () => {
    const ranked = searchEntries(entries, 'profile').map(h => h.entry.id)
    // s1: preview, g2: label? no. label has none; text hit (g2 "profile"), s1 text, c2 label? "Adds profiles" is text.
    assert.equal(ranked[0], 'g2')
    assert.ok(ranked.includes('c2') && ranked.includes('s1'))
    const byLabel = searchEntries(entries, 'install')
    assert.equal(byLabel[0]!.entry.id, 'g1')
  })

  it('keeps the entry preview as snippet when label or preview matched', () => {
    assert.equal(searchEntries(entries, 'curseforge')[0]!.snippet, 'Download EllesmereUI from CurseForge')
  })

  it('limits hits per group and returns the first entries per group for an empty query', () => {
    const many: MatchableEntry[] = Array.from({ length: 9 }, (_, i) => ({ id: `x${i}`, group: 'Guide', label: `Step ${i}`, text: '', to: '/' }))
    assert.equal(searchEntries(many, 'step', { perGroup: 3 }).length, 3)
    assert.equal(searchEntries(many, '').length, 5)
    assert.equal(searchEntries(entries, '').filter(h => h.entry.group === 'Changelog').length, 2)
  })

  it('returns nothing for a query that matches no entry', () => {
    assert.deepEqual(searchEntries(entries, 'qwertyuiop'), [])
  })
})

describe('typo fallback', () => {
  it('withinOneEdit allows one insert, delete or replace but not two', () => {
    assert.ok(withinOneEdit('bigwigs', 'bigwigs'))
    assert.ok(withinOneEdit('bigwigs', 'bigwigz'))
    assert.ok(withinOneEdit('bigwigs', 'bigwig'))
    assert.ok(withinOneEdit('bigwig', 'bigwigs'))
    assert.ok(withinOneEdit('bgwigs', 'bigwigs'))
    assert.ok(!withinOneEdit('bigwigs', 'bigwgz'))
    assert.ok(!withinOneEdit('abcd', 'dcba'))
    assert.ok(!withinOneEdit('abc', 'abcde'))
  })

  it('finds a misspelled word only when the strict pass returns nothing', () => {
    assert.deepEqual(searchEntries(entries, 'bigwgis'), [])
    assert.deepEqual(searchEntries(entries, 'bigwigz').map(h => h.entry.id), ['s1', 'g2'])
    assert.deepEqual(searchEntries(entries, 'ellesmerui instal').map(h => h.entry.id), ['g1'])
  })

  it('tolerates a typo in a half-typed word (prefix + one edit)', () => {
    assert.deepEqual(searchEntries(entries, 'zebrafsh').map(h => h.entry.id), ['g2', 'c1'])
    assert.deepEqual(searchEntries(entries, 'zxbrxf'), [])
    assert.deepEqual(searchEntries(entries, 'zebrfi').map(h => h.entry.id), ['g2', 'c1'])
  })

  it('never fuzzes short words and keeps strict hits untouched', () => {
    assert.deepEqual(searchEntries(entries, 'adx'), [])
    const strict = searchEntries(entries, 'zebrafish')
    assert.deepEqual(strict.map(h => h.entry.id), ['g2', 'c1'])
    assert.match(strict[1]!.snippet, /Zebrafish bug/)
  })

  it('still requires every word to match', () => {
    assert.deepEqual(searchEntries(entries, 'bigwigz wago'), [])
  })
})
