/** Shared parser and DB upserts for MagguuUI_Data/Classes/*.lua. */

import { and, eq } from 'drizzle-orm'
import { db, sqlite } from '~/server/database'
import { characterLayouts } from '~/server/database/schema'
import { MAX_IMPORT_STRING_BYTES, assertImportStringSize } from '~/server/utils/addonProfileLua'

export const CLASS_DATA_ROOT = 'MagguuUI_Data/Classes'
export const MAX_CLASS_LUA_SOURCE_BYTES = MAX_IMPORT_STRING_BYTES * 4 + 1024 * 1024

export const CLASS_FILE_TO_NAME: Readonly<Record<string, string>> = {
  'DeathKnight.lua': 'Death Knight',
  'DemonHunter.lua': 'Demon Hunter',
  'Druid.lua': 'Druid',
  'Evoker.lua': 'Evoker',
  'Hunter.lua': 'Hunter',
  'Mage.lua': 'Mage',
  'Monk.lua': 'Monk',
  'Paladin.lua': 'Paladin',
  'Priest.lua': 'Priest',
  'Rogue.lua': 'Rogue',
  'Shaman.lua': 'Shaman',
  'Warlock.lua': 'Warlock',
  'Warrior.lua': 'Warrior',
}

const SAFE_CLASS_PATH_RE = /^MagguuUI_Data\/Classes\/([A-Za-z][A-Za-z0-9_]*)\.lua$/

export interface ClassLayoutSyncChange {
  spec: string
  status: 'created' | 'updated' | 'unchanged'
}

export interface ClassLayoutFileSyncResult {
  fileName: string
  className: string
  changes: ClassLayoutSyncChange[]
}

export function parseSafeClassLuaPath(path: string) {
  const match = SAFE_CLASS_PATH_RE.exec(path)
  const fileName = match?.[1] ? `${match[1]}.lua` : ''
  const className = CLASS_FILE_TO_NAME[fileName]
  if (!fileName || !className) throw new Error(`Unsafe or unsupported class data path: ${path}`)
  return { path, fileName, className }
}

export function syncClassLayoutFile(path: string, source: string): ClassLayoutFileSyncResult {
  const validated = validateClassLayoutFile(path, source)
  const { descriptor, parsed } = validated
  const changes = sqlite.transaction(() => parsed.map((item, index) => {
    const spec = item.spec || `Spec ${index + 1}`
    return {
      spec,
      status: upsertClassLayout(descriptor.className, spec, item.importString, index),
    }
  }))()
  return { ...descriptor, changes }
}

export function validateClassLayoutFile(path: string, source: string) {
  const descriptor = parseSafeClassLuaPath(path)
  if (new TextEncoder().encode(source).byteLength > MAX_CLASS_LUA_SOURCE_BYTES) {
    throw new Error(`${path} exceeds the ${MAX_CLASS_LUA_SOURCE_BYTES}-byte safety limit`)
  }
  const parsed = parseClassLua(source, descriptor.fileName)
  return { descriptor, parsed }
}

function parseClassLua(content: string, fileName: string) {
  const expectedVariable = fileName.replace(/\.lua$/, '').toLowerCase()
  const assignmentMatches = content.match(new RegExp(`D\\.${expectedVariable}\\s*=\\s*\\{`, 'gi')) || []
  if (assignmentMatches.length !== 1) {
    throw new Error(`${fileName} must contain exactly one D.${expectedVariable} table assignment`)
  }

  const specs: Array<{ spec: string, importString: string }> = []
  const entryRegex = /"((?:[^"\\]|\\.)*)"\s*,\s*--\s*(.+)/g
  let match: RegExpExecArray | null
  while ((match = entryRegex.exec(content)) !== null) {
    const rawImport = match[1]
    const rawSpec = match[2]
    if (rawImport === undefined || rawSpec === undefined) continue
    const importString = decodeQuotedValue(rawImport)
    const spec = rawSpec.trim()
    if (!importString || !spec) throw new Error(`${fileName} contains an empty class layout entry`)
    assertImportStringSize(importString, `${fileName}:${spec}`)
    specs.push({ spec, importString })
  }

  const noCommentRegex = /^\s*"((?:[^"\\]|\\.)+)"\s*,\s*$/gm
  while ((match = noCommentRegex.exec(content)) !== null) {
    const raw = match[1]
    if (raw === undefined) continue
    const importString = decodeQuotedValue(raw)
    assertImportStringSize(importString, `${fileName}:unnamed spec`)
    if (!specs.some(item => item.importString === importString)) specs.push({ spec: '', importString })
  }

  if (!specs.length) throw new Error(`${fileName} contains no class layout strings`)
  const names = specs.map((item, index) => (item.spec || `Spec ${index + 1}`).toLowerCase())
  if (new Set(names).size !== names.length) throw new Error(`${fileName} contains duplicate specialization labels`)
  return specs
}

function decodeQuotedValue(value: string) {
  return value.replace(/\\"/g, '"').replace(/\\\\/g, '\\')
}

function upsertClassLayout(
  className: string,
  spec: string,
  importString: string,
  sortOrder: number,
): 'created' | 'updated' | 'unchanged' {
  const existing = db.select().from(characterLayouts)
    .where(and(eq(characterLayouts.className, className), eq(characterLayouts.spec, spec)))
    .get()
  const layoutName = `${className} - ${spec}`

  if (existing) {
    if (existing.importString === importString && existing.name === layoutName && existing.sortOrder === sortOrder) {
      return 'unchanged'
    }
    db.update(characterLayouts)
      .set({ importString, name: layoutName, sortOrder, updatedAt: new Date() })
      .where(eq(characterLayouts.id, existing.id))
      .run()
    return 'updated'
  }

  db.insert(characterLayouts).values({
    name: layoutName,
    className,
    spec,
    importString,
    sortOrder,
    isVisible: true,
  }).run()
  return 'created'
}
