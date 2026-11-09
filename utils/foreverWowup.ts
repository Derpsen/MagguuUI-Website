/**
 * Forever WowUp collections live in MagguuUI Camelot
 * (`Game/Camelot/Modules/Data/AddOns/WowUp.lua`: `D.WowUpForever` + `D.WowUpForeverOptional`).
 * The server reads that file at runtime. Anything that is not a base64 WowUp
 * collection with client_type "Forever" is null.
 */

/** Canonical MagguuUI path (v12.1.9 one-package Camelot). */
export const FOREVER_WOWUP_PATH = 'Game/Camelot/Modules/Data/AddOns/WowUp.lua'

/** Transitional MagguuUI-Forever path kept as a read fallback. */
export const FOREVER_WOWUP_PATH_LEGACY = 'MagguuUI_Forever/Data/WowUp.lua'

/** Forever Starter pack (5), verified against MagguuUI Camelot WowUp.lua at v12.1.9. */
export const FOREVER_STARTER_ADDONS = [
  'EllesmereUI',
  'MagguuUI',
  'BigWigs',
  'LittleWigs',
  'Northern Sky Raid Tools',
] as const

/** Forever Optional pack (8), same source. */
export const FOREVER_OPTIONAL_ADDONS = [
  'Auctionator',
  'HandyNotes',
  'Whisper Messenger',
  'Waypoint UI',
  'Talent Tree Tweaks',
  'GTFO',
  'BugSack',
  'BugGrabber',
] as const

/** Starter then Optional (13). Shown even while a live string cannot be read. */
export const FOREVER_PACK_ADDONS = [
  ...FOREVER_STARTER_ADDONS,
  ...FOREVER_OPTIONAL_ADDONS,
] as const

export interface ForeverWowup {
  string: string
  collectionName: string
  addons: string[]
}

export interface ForeverWowupPacks {
  starter: ForeverWowup
  optional: ForeverWowup | null
}

const MAX_STRING = 20_000

function decodeCollection(value: string): ForeverWowup | null {
  if (!value || value.length > MAX_STRING) return null
  let data: unknown
  try {
    data = JSON.parse(Buffer.from(value, 'base64').toString('utf8'))
  } catch {
    return null
  }
  if (!data || typeof data !== 'object') return null
  const d = data as Record<string, unknown>
  if (d.client_type !== 'Forever' || !Array.isArray(d.addons) || d.addons.length === 0) return null
  const addons = d.addons.flatMap(a => a && typeof a === 'object' && typeof (a as { name?: unknown }).name === 'string'
    ? [String((a as { name: string }).name).trim()].filter(Boolean)
    : [])
  if (addons.length !== d.addons.length) return null
  return { string: value, collectionName: typeof d.collection_name === 'string' ? d.collection_name : '', addons }
}

function extractAssignment(source: string, key: 'WowUpForever' | 'WowUpForeverOptional'): string | null {
  const m = new RegExp(String.raw`\bD\.${key}\s*=\s*"([A-Za-z0-9+/=]+)"`).exec(source)
  return m?.[1] ?? null
}

/** Parse starter (required) and optional (when present) Forever collections from Camelot WowUp.lua. */
export function parseForeverWowupLua(source: unknown): ForeverWowupPacks | null {
  if (typeof source !== 'string') return null
  const starterRaw = extractAssignment(source, 'WowUpForever')
  if (!starterRaw) return null
  const starter = decodeCollection(starterRaw)
  if (!starter) return null
  const optionalRaw = extractAssignment(source, 'WowUpForeverOptional')
  const optional = optionalRaw ? decodeCollection(optionalRaw) : null
  return { starter, optional }
}
