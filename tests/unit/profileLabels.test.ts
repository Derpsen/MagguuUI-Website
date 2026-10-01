import assert from 'node:assert/strict'
import { test } from 'node:test'
import { OPTIONAL_ADDON_LUA_FILES, REQUIRED_ADDON_LUA_FILES } from '../../server/utils/addonProfileLua'
import { compareProfileAddons, profileAddonLabel } from '../../utils/profileLabels'

const EXPECTED: Record<string, string> = {
  EllesmereUI: 'EllesmereUI',
  BigWigs: 'BigWigs',
  NorthernSkyRaidTools: 'Northern Sky',
  EXBoss: 'EXBoss',
  WhisperMessenger: 'Whisper Messenger',
  WIM: 'WIM',
  WaypointUI: 'Waypoint UI',
  HandyNotes: 'HandyNotes',
  TalentTreeTweaks: 'Talent Tree Tweaks',
  GTFO: 'GTFO',
  BugSack: 'BugSack',
  PremadeGroupsFilter: 'Premade Groups Filter',
  NaowhSmartReminders: 'Smart Reminders',
}

test('profile dropdown labels use player names and a stable order', () => {
  for (const [addon, label] of Object.entries(EXPECTED)) {
    assert.equal(profileAddonLabel(addon), label)
    assert.doesNotMatch(label, /Naowh/)
  }
  assert.equal(profileAddonLabel('FutureAddon'), 'FutureAddon')
  assert.deepEqual(Object.keys(EXPECTED).sort(compareProfileAddons), Object.keys(EXPECTED))
})

test('every shipped profile lua file has a player label', () => {
  const files = [...REQUIRED_ADDON_LUA_FILES, ...OPTIONAL_ADDON_LUA_FILES].filter(file => file !== 'WowUp.lua')
  for (const file of files) {
    const addon = file.replace(/\.lua$/, '')
    assert.equal(profileAddonLabel(addon), EXPECTED[addon], file)
  }
})
