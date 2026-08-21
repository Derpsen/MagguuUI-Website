import assert from 'node:assert/strict'
import test from 'node:test'
import {
  AddonProfileLuaError,
  MAX_ADDON_LUA_SOURCE_BYTES,
  MAX_IMPORT_STRING_BYTES,
  OPTIONAL_ADDON_LUA_FILES,
  REQUIRED_ADDON_LUA_FILES,
  assertCompleteAddonLuaSnapshot,
  parseAddonProfileLua,
  parseSafeAddonLuaPath,
  parseWowUpLua,
} from '../../server/utils/addonProfileLua'

function expectCode(code: AddonProfileLuaError['code']) {
  return (error: unknown) => error instanceof AddonProfileLuaError && error.code === code
}

test('accepts the current Ellesmere data files and optional WowUp', () => {
  assert.deepEqual([...REQUIRED_ADDON_LUA_FILES], [
    'BigWigs.lua',
    'EllesmereUI.lua',
    'NorthernSkyRaidTools.lua',
  ])
  for (const fileName of REQUIRED_ADDON_LUA_FILES) {
    const parsed = parseSafeAddonLuaPath(`Data/AddOns/${fileName}`)
    assert.equal(parsed.fileName, fileName)
    assert.equal(parsed.isWowUp, false)
  }
  assert.equal(parseSafeAddonLuaPath('Data/AddOns/WowUp.lua').isWowUp, true)
  assert.doesNotThrow(() => assertCompleteAddonLuaSnapshot(REQUIRED_ADDON_LUA_FILES))
  assert.doesNotThrow(() => assertCompleteAddonLuaSnapshot([
    ...REQUIRED_ADDON_LUA_FILES,
    ...OPTIONAL_ADDON_LUA_FILES,
  ]))
  assert.deepEqual([...OPTIONAL_ADDON_LUA_FILES], ['WowUp.lua', 'WIM.lua', 'WaypointUI.lua'])
  assert.throws(
    () => assertCompleteAddonLuaSnapshot(REQUIRED_ADDON_LUA_FILES.filter(fileName => fileName !== 'BigWigs.lua')),
    expectCode('INCOMPLETE_SNAPSHOT'),
  )
  assert.throws(
    () => assertCompleteAddonLuaSnapshot([...REQUIRED_ADDON_LUA_FILES, 'Plater.lua']),
    expectCode('UNSUPPORTED_SNAPSHOT'),
  )
})

test('rejects paths outside the exact addon data contract', () => {
  for (const path of [
    '../Data/AddOns/BigWigs.lua',
    'Data/AddOns/../Classes/Mage.lua',
    'Data\\AddOns\\BigWigs.lua',
    'Data/AddOns/nested/BigWigs.lua',
    'Data/AddOns/!load.lua',
    'Data/AddOns/BigWigs.lua?ref=main',
    'MagguuUI_Data/AddOns/BigWigs.lua',
  ]) {
    assert.throws(() => parseSafeAddonLuaPath(path), expectCode('UNSAFE_PATH'))
  }
})

test('parses quoted and long-bracket single profile strings without matching comments', () => {
  const quoted = parseAddonProfileLua(
    'Data/AddOns/BigWigs.lua',
    'local decoy = "D.fake = \\"bad\\""\n-- D.other = "bad"\nD.bigwigs = "line\\nvalue\\x21"',
  )
  assert.equal(quoted.format, 'single')
  assert.deepEqual(quoted.entries, [{ profile: 'Default', string: 'line\nvalue!', variable: 'bigwigs' }])

  const longBracket = parseAddonProfileLua(
    'Data/AddOns/BigWigs.lua',
    'D.bigwigs = [===[\n!BW!{quoted="value",path="C:\\\\Games"}]===]',
  )
  assert.equal(longBracket.entries[0]?.string, '!BW!{quoted="value",path="C:\\\\Games"}')
})

test('parses Ellesmere, BigWigs, and NSRT array tables', () => {
  const ellesmere = parseAddonProfileLua(
    'Data/AddOns/EllesmereUI.lua',
    'D.ellesmereui = {\n  "!EUI_profile",\n  0.58,\n}',
  )
  assert.equal(ellesmere.format, 'table')
  assert.deepEqual(ellesmere.entries.map(entry => ({
    profile: entry.profile,
    string: entry.string,
    isVisible: entry.isVisible,
  })), [
    { profile: 'Default', string: '!EUI_profile', isVisible: true },
    { profile: 'uiscale', string: '0.58', isVisible: false },
  ])

  const bigwigs = parseAddonProfileLua(
    'Data/AddOns/BigWigs.lua',
    'D.bigwigs = { "BW2:general", "BWB1:boss" }',
  )
  assert.deepEqual(bigwigs.entries.map(entry => entry.profile), ['Default', 'Boss Options'])

  const nsrt = parseAddonProfileLua(
    'Data/AddOns/NorthernSkyRaidTools.lua',
    'D.nsrt = "profile-string"',
  )
  assert.equal(nsrt.format, 'single')
  assert.deepEqual(nsrt.entries.map(entry => [entry.profile, entry.string]), [
    ['Default', 'profile-string'],
  ])

  const wim = parseAddonProfileLua(
    'Data/AddOns/WIM.lua',
    'D.wim = [===[{font="Expressway"}]===]',
  )
  assert.equal(wim.format, 'single')
  assert.equal(wim.entries[0]?.string, '{font="Expressway"}')

  const waypoint = parseAddonProfileLua(
    'Data/AddOns/WaypointUI.lua',
    'D.waypointui = "{PinpointInfo=false}"',
  )
  assert.equal(waypoint.entries[0]?.profile, 'Default')
})

test('rejects malformed Ellesmere tables and ambiguous assignments', () => {
  assert.throws(
    () => parseAddonProfileLua('Data/AddOns/EllesmereUI.lua', 'D.ellesmereui = { "!EUI_profile" }'),
    expectCode('MALFORMED_LUA'),
  )
  assert.throws(
    () => parseAddonProfileLua('Data/AddOns/EllesmereUI.lua', 'D.ellesmereui = { "!EUI_profile", 2.1 }'),
    expectCode('MALFORMED_LUA'),
  )
  assert.throws(
    () => parseAddonProfileLua('Data/AddOns/BigWigs.lua', 'D.bigwigs = { "one", 0.58 }'),
    expectCode('MALFORMED_LUA'),
  )
  assert.throws(
    () => parseAddonProfileLua('Data/AddOns/BigWigs.lua', 'D.one = "a"\nD.two = "b"'),
    expectCode('AMBIGUOUS_PROFILE'),
  )
  assert.throws(
    () => parseAddonProfileLua('Data/AddOns/BigWigs.lua', 'D.bigwigs = "bad\\1value"'),
    expectCode('MALFORMED_LUA'),
  )
})

test('requires both unique WowUp strings and supports long brackets', () => {
  const parsed = parseWowUpLua('Data/AddOns/WowUp.lua', `
    D.WowUpRequired = "required"
    D.WowUpOptional = [==[optional]==]
    D.WowUpString = D.WowUpRequired .. D.WowUpOptional
  `)
  assert.equal(parsed.required, 'required')
  assert.equal(parsed.optional, 'optional')

  assert.throws(
    () => parseWowUpLua('Data/AddOns/WowUp.lua', 'D.WowUpRequired = "required"'),
    expectCode('MALFORMED_LUA'),
  )
  assert.throws(
    () => parseWowUpLua(
      'Data/AddOns/WowUp.lua',
      'D.WowUpRequired = "a"\nD.WowUpRequired = "b"\nD.WowUpOptional = "c"',
    ),
    expectCode('AMBIGUOUS_PROFILE'),
  )
})

test('enforces UTF-8 import and source byte limits', () => {
  const oversizedImport = 'x'.repeat(MAX_IMPORT_STRING_BYTES + 1)
  assert.throws(
    () => parseAddonProfileLua('Data/AddOns/BigWigs.lua', `D.bigwigs = "${oversizedImport}"`),
    expectCode('IMPORT_TOO_LARGE'),
  )

  const oversizedSource = ' '.repeat(MAX_ADDON_LUA_SOURCE_BYTES + 1)
  assert.throws(
    () => parseAddonProfileLua('Data/AddOns/BigWigs.lua', oversizedSource),
    expectCode('SOURCE_TOO_LARGE'),
  )
})
