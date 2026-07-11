import assert from 'node:assert/strict'
import test from 'node:test'
import {
  AddonProfileLuaError,
  ELVUI_PACKED_PREFIX,
  ELVUI_PACKED_SEPARATOR,
  MAX_ADDON_LUA_SOURCE_BYTES,
  MAX_IMPORT_STRING_BYTES,
  REQUIRED_ADDON_LUA_FILES,
  assertCompleteAddonLuaSnapshot,
  parseAddonProfileLua,
  parseSafeAddonLuaPath,
  parseWowUpLua,
} from '../../server/utils/addonProfileLua'

const currentAddonFiles = REQUIRED_ADDON_LUA_FILES.filter(fileName => fileName !== 'WowUp.lua')

function expectCode(code: AddonProfileLuaError['code']) {
  return (error: unknown) => error instanceof AddonProfileLuaError && error.code === code
}

test('accepts every current addon filename and the WowUp special file', () => {
  assert.equal(currentAddonFiles.length, 33)
  for (const fileName of currentAddonFiles) {
    const parsed = parseSafeAddonLuaPath(`MagguuUI_Data/AddOns/${fileName}`)
    assert.equal(parsed.fileName, fileName)
    assert.equal(parsed.isWowUp, false)
  }
  assert.equal(parseSafeAddonLuaPath('MagguuUI_Data/AddOns/WowUp.lua').isWowUp, true)
  assert.doesNotThrow(() => assertCompleteAddonLuaSnapshot(REQUIRED_ADDON_LUA_FILES))
  assert.throws(
    () => assertCompleteAddonLuaSnapshot(REQUIRED_ADDON_LUA_FILES.filter(fileName => fileName !== 'Plater.lua')),
    expectCode('INCOMPLETE_SNAPSHOT'),
  )
  assert.throws(
    () => assertCompleteAddonLuaSnapshot([...REQUIRED_ADDON_LUA_FILES, 'Unexpected.lua']),
    expectCode('UNSUPPORTED_SNAPSHOT'),
  )
})

test('rejects paths outside the exact addon data contract', () => {
  for (const path of [
    '../MagguuUI_Data/AddOns/Plater.lua',
    'MagguuUI_Data/AddOns/../Classes/Mage.lua',
    'MagguuUI_Data\\AddOns\\Plater.lua',
    'MagguuUI_Data/AddOns/nested/Plater.lua',
    'MagguuUI_Data/AddOns/!load.lua',
    'MagguuUI_Data/AddOns/Plater.lua?ref=main',
  ]) {
    assert.throws(() => parseSafeAddonLuaPath(path), expectCode('UNSAFE_PATH'))
  }
})

test('parses quoted and long-bracket single profile strings without matching comments', () => {
  const quoted = parseAddonProfileLua(
    'MagguuUI_Data/AddOns/Plater.lua',
    'local decoy = "D.fake = \\"bad\\""\n-- D.other = "bad"\nD.plater = "line\\nvalue\\x21"',
  )
  assert.deepEqual(quoted.entries, [{ profile: 'Default', string: 'line\nvalue!', variable: 'plater' }])

  const longBracket = parseAddonProfileLua(
    'MagguuUI_Data/AddOns/CVars.lua',
    'D.cvars = [===[\n!CVARS!{quoted="value",path="C:\\\\Games"}]===]',
  )
  assert.equal(longBracket.entries[0]?.string, '!CVARS!{quoted="value",path="C:\\\\Games"}')
})

test('rejects ambiguous profile files and unsupported control characters', () => {
  assert.throws(
    () => parseAddonProfileLua('MagguuUI_Data/AddOns/Plater.lua', 'D.one = "a"\nD.two = "b"'),
    expectCode('AMBIGUOUS_PROFILE'),
  )
  assert.throws(
    () => parseAddonProfileLua('MagguuUI_Data/AddOns/Plater.lua', 'D.plater = "bad\\1value"'),
    expectCode('MALFORMED_LUA'),
  )
})

test('unpacks a strict ElvUI container into four public strings and one hidden scale', () => {
  const packed = ELVUI_PACKED_PREFIX + [
    '!E1!profile',
    '!E1!private',
    '!E1!global',
    '!E1!filters',
    '0.61',
  ].join(ELVUI_PACKED_SEPARATOR)
  const parsed = parseAddonProfileLua('MagguuUI_Data/AddOns/ElvUI.lua', `D.elvui = "${packed}"`)

  assert.equal(parsed.format, 'packed-elvui')
  assert.deepEqual(parsed.entries.map(entry => ({
    profile: entry.profile,
    string: entry.string,
    isVisible: entry.isVisible,
  })), [
    { profile: 'profile', string: '!E1!profile', isVisible: true },
    { profile: 'private', string: '!E1!private', isVisible: true },
    { profile: 'global', string: '!E1!global', isVisible: true },
    { profile: 'aurafilters', string: '!E1!filters', isVisible: true },
    { profile: 'uiscale', string: '0.61', isVisible: false },
  ])
  assert.equal(parsed.entries.some(entry => entry.string.startsWith(ELVUI_PACKED_PREFIX)), false)
})

test('rejects malformed, incomplete, non-packed, and unsafe-scale ElvUI strings', () => {
  const invalidValues = [
    '!E1!ordinary-profile',
    `${ELVUI_PACKED_PREFIX}profile${ELVUI_PACKED_SEPARATOR}private`,
    `${ELVUI_PACKED_PREFIX}profile${ELVUI_PACKED_SEPARATOR}private${ELVUI_PACKED_SEPARATOR}global${ELVUI_PACKED_SEPARATOR}${ELVUI_PACKED_SEPARATOR}0.61`,
    `${ELVUI_PACKED_PREFIX}profile${ELVUI_PACKED_SEPARATOR}private${ELVUI_PACKED_SEPARATOR}global${ELVUI_PACKED_SEPARATOR}filters${ELVUI_PACKED_SEPARATOR}1e0`,
    `${ELVUI_PACKED_PREFIX}profile${ELVUI_PACKED_SEPARATOR}private${ELVUI_PACKED_SEPARATOR}global${ELVUI_PACKED_SEPARATOR}filters${ELVUI_PACKED_SEPARATOR}2.1`,
  ]
  for (const value of invalidValues) {
    assert.throws(
      () => parseAddonProfileLua('MagguuUI_Data/AddOns/ElvUI.lua', `D.elvui = "${value}"`),
      expectCode('MALFORMED_LUA'),
    )
  }
})

test('parses the complete legacy ElvUI table and keeps its UI scale private', () => {
  const parsed = parseAddonProfileLua('MagguuUI_Data/AddOns/ElvUI.lua', `
    D.elvui = {
      profile = "profile-data",
      private = [=[private-data]=],
      global = "global-data",
      aurafilters = "filter-data",
      uiscale = 0.71,
    }
  `)
  assert.equal(parsed.format, 'legacy-elvui')
  assert.deepEqual(parsed.entries.map(entry => [entry.profile, entry.string, entry.isVisible]), [
    ['profile', 'profile-data', true],
    ['private', 'private-data', true],
    ['global', 'global-data', true],
    ['aurafilters', 'filter-data', true],
    ['uiscale', '0.71', false],
  ])

  assert.throws(
    () => parseAddonProfileLua(
      'MagguuUI_Data/AddOns/ElvUI.lua',
      'D.elvui = { profile = "p", private = "x", global = "g" }',
    ),
    expectCode('MALFORMED_LUA'),
  )
})

test('requires both unique WowUp strings and supports long brackets', () => {
  const parsed = parseWowUpLua('MagguuUI_Data/AddOns/WowUp.lua', `
    D.WowUpRequired = "required"
    D.WowUpOptional = [==[optional]==]
    D.WowUpString = D.WowUpRequired .. D.WowUpOptional
  `)
  assert.equal(parsed.required, 'required')
  assert.equal(parsed.optional, 'optional')

  assert.throws(
    () => parseWowUpLua('MagguuUI_Data/AddOns/WowUp.lua', 'D.WowUpRequired = "required"'),
    expectCode('MALFORMED_LUA'),
  )
  assert.throws(
    () => parseWowUpLua(
      'MagguuUI_Data/AddOns/WowUp.lua',
      'D.WowUpRequired = "a"\nD.WowUpRequired = "b"\nD.WowUpOptional = "c"',
    ),
    expectCode('AMBIGUOUS_PROFILE'),
  )
})

test('enforces UTF-8 import and source byte limits', () => {
  const oversizedImport = 'x'.repeat(MAX_IMPORT_STRING_BYTES + 1)
  assert.throws(
    () => parseAddonProfileLua('MagguuUI_Data/AddOns/Plater.lua', `D.plater = "${oversizedImport}"`),
    expectCode('IMPORT_TOO_LARGE'),
  )

  const oversizedSource = ' '.repeat(MAX_ADDON_LUA_SOURCE_BYTES + 1)
  assert.throws(
    () => parseAddonProfileLua('MagguuUI_Data/AddOns/Plater.lua', oversizedSource),
    expectCode('SOURCE_TOO_LARGE'),
  )
})
