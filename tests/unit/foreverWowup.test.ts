import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  FOREVER_OPTIONAL_ADDONS,
  FOREVER_PACK_ADDONS,
  FOREVER_STARTER_ADDONS,
  parseForeverWowupLua,
} from '../../utils/foreverWowup.ts'

const enc = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64')
const coll = { collection_name: 'MagguuUI Forever', client_type: 'Forever', addons: [{ id: '1', name: 'EllesmereUI' }, { id: '2', name: 'GTFO' }] }
const opt = { collection_name: 'MagguuUI Forever Optional', client_type: 'Forever', addons: [{ id: '3', name: 'Auctionator' }] }
const lua = (starter: string, optional?: string) => {
  const lines = [`local ns = MagguuUIForever and MagguuUIForever[1]`, `local D = ns.Data`, `D.WowUpForever = "${starter}"`]
  if (optional) lines.push(`D.WowUpForeverOptional = "${optional}"`)
  return lines.join('\n')
}

test('parses starter and optional Forever collections from Camelot WowUp.lua', () => {
  const s = enc(coll)
  const o = enc(opt)
  assert.deepEqual(parseForeverWowupLua(lua(s, o)), {
    starter: { string: s, collectionName: 'MagguuUI Forever', addons: ['EllesmereUI', 'GTFO'] },
    optional: { string: o, collectionName: 'MagguuUI Forever Optional', addons: ['Auctionator'] },
  })
})

test('parses starter alone when optional is missing', () => {
  const s = enc(coll)
  assert.deepEqual(parseForeverWowupLua(lua(s)), {
    starter: { string: s, collectionName: 'MagguuUI Forever', addons: ['EllesmereUI', 'GTFO'] },
    optional: null,
  })
})

test('rejects other client types, empty addons, bad base64 and non-strings', () => {
  assert.equal(parseForeverWowupLua(lua(enc({ ...coll, client_type: 'Retail' }))), null)
  assert.equal(parseForeverWowupLua(lua(enc({ ...coll, addons: [] }))), null)
  assert.equal(parseForeverWowupLua(lua(enc({ ...coll, addons: [{ id: '1' }] }))), null)
  assert.equal(parseForeverWowupLua(lua('bm90IGpzb24=')), null)
  assert.equal(parseForeverWowupLua('D.Other = "abc"'), null)
  assert.equal(parseForeverWowupLua(undefined), null)
  assert.equal(parseForeverWowupLua(lua('A'.repeat(20_001))), null)
})

test('the fixed pack lists match MagguuUI Camelot v12.1.9 (5 starter + 8 optional)', () => {
  assert.equal(FOREVER_STARTER_ADDONS.length, 5)
  assert.equal(FOREVER_OPTIONAL_ADDONS.length, 8)
  assert.equal(FOREVER_PACK_ADDONS.length, 13)
  assert.deepEqual([...FOREVER_STARTER_ADDONS], ['EllesmereUI', 'MagguuUI', 'BigWigs', 'LittleWigs', 'Northern Sky Raid Tools'])
  assert.ok(FOREVER_PACK_ADDONS.includes('Whisper Messenger'))
  assert.ok(!FOREVER_PACK_ADDONS.includes('WIM' as never))
})
