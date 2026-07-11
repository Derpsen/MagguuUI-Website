/**
 * Pure parser/contract for profile payloads stored in
 * MagguuUI_Data/AddOns/*.lua.
 *
 * This module deliberately has no database, Nitro, or GitHub dependencies so
 * both webhook and manual sync paths use exactly the same parsing rules and the
 * contract can be covered with focused unit tests.
 */

export const ADDON_DATA_ROOT = 'MagguuUI_Data/AddOns'
export const MAX_IMPORT_STRING_BYTES = 5 * 1024 * 1024
export const MAX_ADDON_LUA_SOURCE_BYTES = MAX_IMPORT_STRING_BYTES * 4 + 1024 * 1024
export const ELVUI_PACKED_PREFIX = '!MUIEUI!'
export const ELVUI_PACKED_SEPARATOR = '|-|'
export const REQUIRED_ADDON_LUA_FILES = [
  'Ayije_CDM.lua',
  'BetterCooldownManager.lua',
  'BigWigs.lua',
  'BliZzi_Interrupts.lua',
  'Blizzard_EditMode.lua',
  'BuffReminders.lua',
  'BugSack.lua',
  'CVars.lua',
  'CursorTrail.lua',
  'Details.lua',
  'Details_iLvlDisplay.lua',
  'EXBoss.lua',
  'EasyExperienceBar.lua',
  'ElvUI.lua',
  'ExwindTools.lua',
  'Falcon.lua',
  'GTFO.lua',
  'GroupfinderFlags.lua',
  'HandyNotes.lua',
  'HandyNotes_MapNotes.lua',
  'MPlusTimer.lua',
  'MRT.lua',
  'MiniCC.lua',
  'MiniCE.lua',
  'NorthernSkyRaidTools.lua',
  'Plater.lua',
  'Platynator.lua',
  'Plumber.lua',
  'TalentTreeTweaks.lua',
  'TargetedSpells.lua',
  'WIM.lua',
  'WaypointUI.lua',
  'WindTools.lua',
  'WowUp.lua',
] as const

const SAFE_ADDON_PATH_RE = /^MagguuUI_Data\/AddOns\/([A-Za-z][A-Za-z0-9_]*)\.lua$/
const LUA_IDENTIFIER_RE = /[A-Za-z0-9_]/
const LEGACY_ELVUI_KEYS = ['profile', 'private', 'global', 'aurafilters'] as const
const ELVUI_UI_SCALE_PROFILE = 'uiscale'

export type AddonProfileLuaErrorCode =
  | 'UNSAFE_PATH'
  | 'SPECIAL_FILE'
  | 'SOURCE_TOO_LARGE'
  | 'IMPORT_TOO_LARGE'
  | 'MALFORMED_LUA'
  | 'AMBIGUOUS_PROFILE'
  | 'INCOMPLETE_SNAPSHOT'
  | 'UNSUPPORTED_SNAPSHOT'

export class AddonProfileLuaError extends Error {
  constructor(
    public readonly code: AddonProfileLuaErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'AddonProfileLuaError'
  }
}

export interface SafeAddonLuaPath {
  path: string
  fileName: string
  addon: string
  isWowUp: boolean
}

export interface ParsedAddonProfileEntry {
  profile: string
  string: string
  variable: string
  isVisible?: boolean
}

export interface ParsedAddonProfileFile extends SafeAddonLuaPath {
  format: 'single' | 'packed-elvui' | 'legacy-elvui'
  entries: ParsedAddonProfileEntry[]
}

export interface ParsedWowUpFile extends SafeAddonLuaPath {
  required: string
  optional: string
}

interface ParsedLuaString {
  value: string
  end: number
}

interface ParsedLuaAssignment {
  variable: string
  kind: 'string' | 'table' | 'other'
  value?: string
  tableBody?: string
}

export function parseSafeAddonLuaPath(path: string): SafeAddonLuaPath {
  const match = SAFE_ADDON_PATH_RE.exec(path)
  if (!match?.[1]) {
    throw new AddonProfileLuaError(
      'UNSAFE_PATH',
      `Unsafe addon data path: ${path}`,
    )
  }

  const addon = match[1]
  return {
    path,
    fileName: `${addon}.lua`,
    addon,
    isWowUp: addon.toLowerCase() === 'wowup',
  }
}

export function assertCompleteAddonLuaSnapshot(fileNames: Iterable<string>) {
  const available = new Set(fileNames)
  const missing = REQUIRED_ADDON_LUA_FILES.filter(fileName => !available.has(fileName))
  if (missing.length) {
    throw new AddonProfileLuaError(
      'INCOMPLETE_SNAPSHOT',
      `Addon data snapshot is missing: ${missing.join(', ')}`,
    )
  }
  const supported = new Set<string>(REQUIRED_ADDON_LUA_FILES)
  const unexpected = [...available].filter(fileName => !supported.has(fileName)).sort()
  if (unexpected.length) {
    throw new AddonProfileLuaError(
      'UNSUPPORTED_SNAPSHOT',
      `Addon data snapshot contains unsupported files: ${unexpected.join(', ')}`,
    )
  }
}

export function assertImportStringSize(value: string, label = 'Import string') {
  const size = byteLength(value)
  if (size > MAX_IMPORT_STRING_BYTES) {
    throw new AddonProfileLuaError(
      'IMPORT_TOO_LARGE',
      `${label} exceeds the ${MAX_IMPORT_STRING_BYTES}-byte limit`,
    )
  }
}

export function parseAddonProfileLua(path: string, source: string): ParsedAddonProfileFile {
  const descriptor = parseSafeAddonLuaPath(path)
  if (descriptor.isWowUp) {
    throw new AddonProfileLuaError(
      'SPECIAL_FILE',
      'WowUp.lua must be parsed with parseWowUpLua()',
    )
  }
  assertSourceSize(source)

  const assignments = scanTopLevelDAssignments(source)

  if (descriptor.addon.toLowerCase() === 'elvui') {
    const elvuiAssignments = assignments.filter(item => item.variable.toLowerCase() === 'elvui')
    if (elvuiAssignments.length !== 1) {
      throw malformed(`Expected exactly one D.elvui assignment in ${descriptor.fileName}`)
    }

    const assignment = elvuiAssignments[0]!
    if (assignment.kind === 'string' && assignment.value !== undefined) {
      if (!assignment.value.startsWith(ELVUI_PACKED_PREFIX)) {
        throw malformed(`D.elvui in ${descriptor.fileName} must use the ${ELVUI_PACKED_PREFIX} packed contract`)
      }
      return { ...descriptor, format: 'packed-elvui', entries: parsePackedElvUi(assignment.value, descriptor.fileName) }
    }

    if (assignment.kind === 'table' && assignment.tableBody !== undefined) {
      const legacy = parseLegacyElvUiTable(assignment.tableBody)
      const entries: ParsedAddonProfileEntry[] = LEGACY_ELVUI_KEYS.map((key) => {
        const value = legacy.get(key)
        if (value === undefined) {
          throw malformed(`Legacy D.elvui table in ${descriptor.fileName} is missing ${key}`)
        }
        validateImportValue(value, `${descriptor.fileName}:${key}`)
        return { profile: key, string: value, variable: 'elvui', isVisible: true }
      })
      const uiScale = legacy.get(ELVUI_UI_SCALE_PROFILE)
      if (uiScale !== undefined) {
        entries.push(uiScaleEntry(validateElvUiScale(uiScale, `${descriptor.fileName}:uiscale`)))
      }
      return { ...descriptor, format: 'legacy-elvui', entries }
    }

    throw malformed(`D.elvui in ${descriptor.fileName} must be a quoted string, long bracket, or legacy table`)
  }

  const strings = assignments.filter(
    (item): item is ParsedLuaAssignment & { kind: 'string', value: string } =>
      item.kind === 'string' && item.value !== undefined,
  )

  if (strings.length === 0) {
    throw malformed(`No D.<key> profile string found in ${descriptor.fileName}`)
  }
  if (strings.length > 1) {
    throw new AddonProfileLuaError(
      'AMBIGUOUS_PROFILE',
      `${descriptor.fileName} contains multiple D.<key> strings; use a dedicated parser contract`,
    )
  }

  const assignment = strings[0]!
  validateImportValue(assignment.value, `${descriptor.fileName}:D.${assignment.variable}`)
  return {
    ...descriptor,
    format: 'single',
    entries: [{ profile: 'Default', string: assignment.value, variable: assignment.variable }],
  }
}

export function parseWowUpLua(path: string, source: string): ParsedWowUpFile {
  const descriptor = parseSafeAddonLuaPath(path)
  if (!descriptor.isWowUp) {
    throw new AddonProfileLuaError('SPECIAL_FILE', `${descriptor.fileName} is not WowUp.lua`)
  }
  assertSourceSize(source)

  const assignments = scanTopLevelDAssignments(source)
  const getUnique = (variable: 'WowUpRequired' | 'WowUpOptional') => {
    const matches = assignments.filter(item => item.variable === variable && item.kind === 'string')
    if (matches.length > 1) {
      throw new AddonProfileLuaError('AMBIGUOUS_PROFILE', `Multiple D.${variable} assignments found`)
    }
    const value = matches[0]?.value
    if (value === undefined) throw malformed(`WowUp.lua is missing D.${variable}`)
    validateImportValue(value, `${descriptor.fileName}:D.${variable}`)
    return value
  }

  const required = getUnique('WowUpRequired')
  const optional = getUnique('WowUpOptional')
  return { ...descriptor, required, optional }
}

function validateImportValue(value: string, label: string) {
  if (!value) throw malformed(`${label} is empty`)
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index)
    if (code <= 0x08 || code === 0x0B || code === 0x0C || (code >= 0x0E && code <= 0x1F) || (code >= 0x7F && code <= 0x9F)) {
      throw malformed(`${label} contains an unsupported control character`)
    }
  }
  assertImportStringSize(value, label)
}

function parsePackedElvUi(value: string, fileName: string): ParsedAddonProfileEntry[] {
  const parts = value.slice(ELVUI_PACKED_PREFIX.length).split(ELVUI_PACKED_SEPARATOR)
  if (parts.length !== LEGACY_ELVUI_KEYS.length + 1) {
    throw malformed(`${fileName}:D.elvui must contain four profile components and one UI scale`)
  }

  const entries: ParsedAddonProfileEntry[] = LEGACY_ELVUI_KEYS.map((profile, index) => {
    const component = parts[index] || ''
    validateImportValue(component, `${fileName}:${profile}`)
    return { profile, string: component, variable: 'elvui', isVisible: true }
  })
  entries.push(uiScaleEntry(validateElvUiScale(parts[4] || '', `${fileName}:uiscale`)))
  return entries
}

function uiScaleEntry(value: string): ParsedAddonProfileEntry {
  return {
    profile: ELVUI_UI_SCALE_PROFILE,
    string: value,
    variable: 'elvui',
    isVisible: false,
  }
}

function validateElvUiScale(value: string, label: string) {
  if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(value)) {
    throw malformed(`${label} is not a decimal number`)
  }
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric < 0.1 || numeric > 2) {
    throw malformed(`${label} must be between 0.1 and 2`)
  }
  return value
}

function assertSourceSize(source: string) {
  if (byteLength(source) > MAX_ADDON_LUA_SOURCE_BYTES) {
    throw new AddonProfileLuaError(
      'SOURCE_TOO_LARGE',
      `Lua source exceeds the ${MAX_ADDON_LUA_SOURCE_BYTES}-byte safety limit`,
    )
  }
}

function byteLength(value: string) {
  return new TextEncoder().encode(value).byteLength
}

function malformed(message: string) {
  return new AddonProfileLuaError('MALFORMED_LUA', message)
}

function scanTopLevelDAssignments(source: string): ParsedLuaAssignment[] {
  const assignments: ParsedLuaAssignment[] = []
  let index = 0

  while (index < source.length) {
    const triviaEnd = skipTrivia(source, index)
    if (triviaEnd !== index) {
      index = triviaEnd
      continue
    }

    const char = source[index]
    if (char === '"' || char === "'") {
      index = readQuotedString(source, index).end
      continue
    }
    const longOpen = matchLongBracketOpen(source, index)
    if (longOpen) {
      index = readLongBracketString(source, index).end
      continue
    }

    if (source.startsWith('D.', index) && isIdentifierBoundary(source[index - 1])) {
      const variableStart = index + 2
      let cursor = variableStart
      while (cursor < source.length && isIdentifierChar(source[cursor])) cursor++
      const variable = source.slice(variableStart, cursor)
      if (!variable || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(variable)) {
        index++
        continue
      }

      cursor = skipTrivia(source, cursor)
      if (source[cursor] !== '=') {
        index++
        continue
      }
      cursor = skipTrivia(source, cursor + 1)

      if (source[cursor] === '"' || source[cursor] === "'") {
        const parsed = readQuotedString(source, cursor)
        assignments.push({ variable, kind: 'string', value: parsed.value })
        index = parsed.end
        continue
      }
      if (matchLongBracketOpen(source, cursor)) {
        const parsed = readLongBracketString(source, cursor)
        assignments.push({ variable, kind: 'string', value: parsed.value })
        index = parsed.end
        continue
      }
      if (source[cursor] === '{') {
        const table = readBalancedTable(source, cursor)
        assignments.push({ variable, kind: 'table', tableBody: table.body })
        index = table.end
        continue
      }

      assignments.push({ variable, kind: 'other' })
      index = cursor + 1
      continue
    }

    index++
  }

  return assignments
}

function parseLegacyElvUiTable(source: string) {
  const supportedKeys = [...LEGACY_ELVUI_KEYS, ELVUI_UI_SCALE_PROFILE] as const
  type SupportedKey = (typeof supportedKeys)[number]
  const values = new Map<SupportedKey, string>()
  let index = 0
  let nestedDepth = 0

  while (index < source.length) {
    const triviaEnd = skipTrivia(source, index)
    if (triviaEnd !== index) {
      index = triviaEnd
      continue
    }

    const char = source[index]
    if (char === '"' || char === "'") {
      index = readQuotedString(source, index).end
      continue
    }
    if (matchLongBracketOpen(source, index)) {
      index = readLongBracketString(source, index).end
      continue
    }
    if (char === '{') {
      nestedDepth++
      index++
      continue
    }
    if (char === '}') {
      nestedDepth = Math.max(0, nestedDepth - 1)
      index++
      continue
    }

    if (nestedDepth === 0 && /[A-Za-z_]/.test(char || '')) {
      let cursor = index + 1
      while (cursor < source.length && isIdentifierChar(source[cursor])) cursor++
      const key = source.slice(index, cursor) as SupportedKey
      cursor = skipTrivia(source, cursor)
      if ((supportedKeys as readonly string[]).includes(key) && source[cursor] === '=') {
        cursor = skipTrivia(source, cursor + 1)
        let parsed: ParsedLuaString | null = null
        if (source[cursor] === '"' || source[cursor] === "'") {
          parsed = readQuotedString(source, cursor)
        } else if (matchLongBracketOpen(source, cursor)) {
          parsed = readLongBracketString(source, cursor)
        } else if (key === ELVUI_UI_SCALE_PROFILE) {
          const numberMatch = /^(?:\d+(?:\.\d+)?|\.\d+)(?![A-Za-z0-9_.])/.exec(source.slice(cursor))
          if (numberMatch) {
            parsed = { value: numberMatch[0], end: cursor + numberMatch[0].length }
          }
        }
        if (parsed) {
          if (values.has(key)) throw malformed(`Duplicate legacy ElvUI key: ${key}`)
          values.set(key, parsed.value)
          index = parsed.end
          continue
        }
      }
      index = cursor
      continue
    }

    index++
  }

  return values
}

function readQuotedString(source: string, start: number): ParsedLuaString {
  const quote = source[start]
  if (quote !== '"' && quote !== "'") throw malformed('Expected quoted Lua string')

  let value = ''
  let index = start + 1
  while (index < source.length) {
    const char = source[index]!
    if (char === quote) return { value, end: index + 1 }
    if (char === '\n' || char === '\r') throw malformed('Unescaped newline in quoted Lua string')
    if (char !== '\\') {
      value += char
      index++
      continue
    }

    index++
    if (index >= source.length) throw malformed('Trailing backslash in quoted Lua string')
    const escaped = source[index]!
    const simpleEscapes: Record<string, string> = {
      a: '\x07',
      b: '\b',
      f: '\f',
      n: '\n',
      r: '\r',
      t: '\t',
      v: '\v',
      '\\': '\\',
      '"': '"',
      "'": "'",
    }
    if (escaped in simpleEscapes) {
      value += simpleEscapes[escaped]
      index++
      continue
    }
    if (escaped === '\n') {
      value += '\n'
      index++
      continue
    }
    if (escaped === '\r') {
      value += '\n'
      index += source[index + 1] === '\n' ? 2 : 1
      continue
    }
    if (escaped === 'z') {
      index++
      while (index < source.length && /\s/.test(source[index]!)) index++
      continue
    }
    if (escaped === 'x') {
      const hex = source.slice(index + 1, index + 3)
      if (!/^[0-9A-Fa-f]{2}$/.test(hex)) throw malformed('Invalid hexadecimal Lua escape')
      value += String.fromCharCode(Number.parseInt(hex, 16))
      index += 3
      continue
    }
    if (escaped === 'u' && source[index + 1] === '{') {
      const close = source.indexOf('}', index + 2)
      if (close === -1) throw malformed('Unterminated Unicode Lua escape')
      const hex = source.slice(index + 2, close)
      if (!/^[0-9A-Fa-f]+$/.test(hex)) throw malformed('Invalid Unicode Lua escape')
      const codePoint = Number.parseInt(hex, 16)
      if (codePoint > 0x10FFFF) throw malformed('Unicode Lua escape is out of range')
      value += String.fromCodePoint(codePoint)
      index = close + 1
      continue
    }
    if (/\d/.test(escaped)) {
      let end = index + 1
      while (end < source.length && end < index + 3 && /\d/.test(source[end]!)) end++
      const decimal = Number.parseInt(source.slice(index, end), 10)
      if (decimal > 255) throw malformed('Decimal Lua escape is out of byte range')
      value += String.fromCharCode(decimal)
      index = end
      continue
    }

    throw malformed(`Unsupported Lua escape: \\${escaped}`)
  }

  throw malformed('Unterminated quoted Lua string')
}

function matchLongBracketOpen(source: string, start: number) {
  if (source[start] !== '[') return null
  let index = start + 1
  while (source[index] === '=') index++
  if (source[index] !== '[') return null
  return { equals: index - start - 1, contentStart: index + 1 }
}

function readLongBracketString(source: string, start: number): ParsedLuaString {
  const open = matchLongBracketOpen(source, start)
  if (!open) throw malformed('Expected long-bracket Lua string')
  const closeToken = `]${'='.repeat(open.equals)}]`
  const close = source.indexOf(closeToken, open.contentStart)
  if (close === -1) throw malformed('Unterminated long-bracket Lua string')

  let value = source.slice(open.contentStart, close)
  // Lua ignores one immediate newline after a long-bracket opener.
  if (value.startsWith('\r\n')) value = value.slice(2)
  else if (value.startsWith('\n') || value.startsWith('\r')) value = value.slice(1)
  return { value, end: close + closeToken.length }
}

function readBalancedTable(source: string, start: number) {
  let depth = 0
  let index = start
  while (index < source.length) {
    const triviaEnd = skipTrivia(source, index)
    if (triviaEnd !== index) {
      index = triviaEnd
      continue
    }
    const char = source[index]
    if (char === '"' || char === "'") {
      index = readQuotedString(source, index).end
      continue
    }
    if (matchLongBracketOpen(source, index)) {
      index = readLongBracketString(source, index).end
      continue
    }
    if (char === '{') depth++
    if (char === '}') {
      depth--
      if (depth === 0) {
        return { body: source.slice(start + 1, index), end: index + 1 }
      }
    }
    index++
  }
  throw malformed('Unterminated Lua table')
}

function skipTrivia(source: string, start: number) {
  let index = start
  while (index < source.length) {
    if (/\s/.test(source[index]!)) {
      index++
      continue
    }
    if (!source.startsWith('--', index)) break

    const longComment = matchLongBracketOpen(source, index + 2)
    if (longComment) {
      index = readLongBracketString(source, index + 2).end
      continue
    }
    const newline = source.indexOf('\n', index + 2)
    return newline === -1 ? source.length : newline + 1
  }
  return index
}

function isIdentifierChar(value: string | undefined) {
  return Boolean(value && LUA_IDENTIFIER_RE.test(value))
}

function isIdentifierBoundary(value: string | undefined) {
  return !isIdentifierChar(value) && value !== '.'
}
