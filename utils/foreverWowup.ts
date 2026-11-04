/**
 * MagguuUI x Forever WowUp collection. The string itself lives only in the Forever repo
 * (MagguuUI_Forever/Data/WowUp.lua, `D.WowUpForever = "..."`); the server reads it at
 * runtime. Pure and strict: anything that is not a base64 WowUp collection with
 * client_type "Forever" is null, which the Strings page shows as "Coming soon".
 */

export const FOREVER_WOWUP_PATH = 'MagguuUI_Forever/Data/WowUp.lua'

/** The 11 addons of the verified collection (2026-11-04), shown even while the string is not available. */
export const FOREVER_PACK_ADDONS = [
  'EllesmereUI', 'BigWigs', 'Northern Sky Raid Tools', 'BugGrabber', 'BugSack', 'GTFO',
  'Talent Tree Tweaks', 'Waypoint UI', 'Whisper Messenger', 'HandyNotes', 'Auctionator',
] as const

export interface ForeverWowup { string: string, collectionName: string, addons: string[] }

const MAX_STRING = 20_000

export function parseForeverWowupLua(source: unknown): ForeverWowup | null {
  if (typeof source !== 'string') return null
  const m = /\bD\.WowUpForever\s*=\s*"([A-Za-z0-9+/=]+)"/.exec(source)
  const value = m?.[1]
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
