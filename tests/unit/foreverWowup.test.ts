import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FOREVER_PACK_ADDONS, parseForeverWowupLua } from '../../utils/foreverWowup.ts'

const enc = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64')
const lua = (v: string) => `local _, ns = ...\nlocal D = ns.Data\n\nD.WowUpForever = "${v}"\n`
const coll = { collection_name: 'MagguuUI Forever', client_type: 'Forever', addons: [{ id: '1', name: 'EllesmereUI' }, { id: '2', name: 'GTFO' }] }

test('parses a Forever collection from the Lua data file', () => {
  const v = enc(coll)
  assert.deepEqual(parseForeverWowupLua(lua(v)), { string: v, collectionName: 'MagguuUI Forever', addons: ['EllesmereUI', 'GTFO'] })
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

test('the fixed pack list has the 11 verified addons', () => {
  assert.equal(FOREVER_PACK_ADDONS.length, 11)
  assert.ok(FOREVER_PACK_ADDONS.includes('Auctionator'))
})
