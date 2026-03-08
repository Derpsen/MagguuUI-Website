/**
 * POST /api/v1/admin/github/pull
 *
 * Fetches Data/AddOns/*.lua and Data/Classes/*.lua files from the GitHub repo
 * and imports profile strings back into the website database.
 *
 * Flow: GitHub Repo → Lua files → Parse → Upsert DB
 */

import { eq, and } from 'drizzle-orm'
import { db } from '~/server/database'
import { profiles, wowupStrings, characterLayouts, settings, syncHistory } from '~/server/database/schema'
import { createSyncChangelog } from '~/server/utils/syncChangelog'

// ─── Addon Mapping (must match sync-profiles.py) ────────────

interface SimpleAddon {
  addon: string
  file: string
  style: 'simple'
  varName: string
}
interface TableAddon {
  addon: string
  file: string
  style: 'table'
  varName: string
  keys: string[]
}
type AddonConfig = SimpleAddon | TableAddon

const ADDON_MAP: AddonConfig[] = [
  { addon: 'ElvUI', file: 'Data/AddOns/ElvUI.lua', style: 'table', varName: 'elvui', keys: ['profile', 'private', 'global', 'aurafilters'] },
  { addon: 'Plater', file: 'Data/AddOns/Plater.lua', style: 'simple', varName: 'plater' },
  { addon: 'BigWigs', file: 'Data/AddOns/BigWigs.lua', style: 'simple', varName: 'bigwigs' },
  { addon: 'Details', file: 'Data/AddOns/Details.lua', style: 'simple', varName: 'details' },
  { addon: 'BetterCooldownManager', file: 'Data/AddOns/BetterCooldownManager.lua', style: 'simple', varName: 'bettercooldownmanager' },
  { addon: 'Blizzard_EditMode', file: 'Data/AddOns/Blizzard_EditMode.lua', style: 'simple', varName: 'blizzardeditmode' },
  { addon: 'WindTools', file: 'Data/AddOns/WindTools.lua', style: 'simple', varName: 'windtools' },
]

// ─── Class Mapping ───────────────────────────────────────────

const CLASS_MAP: Record<string, string> = {
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

// ─── Lua Parsers ─────────────────────────────────────────────

function parseSimpleLua(content: string, varName: string): string | null {
  const regex = new RegExp(`D\\.${varName}\\s*=\\s*"((?:[^"\\\\]|\\\\.)*)"`)
  const match = content.match(regex)
  if (match) {
    return match[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\')
  }
  return null
}

function parseTableLua(content: string, varName: string, keys: string[]): Record<string, string> {
  const result: Record<string, string> = {}
  for (const key of keys) {
    const regex = new RegExp(`${key}\\s*=\\s*"((?:[^"\\\\]|\\\\.)*)"`)
    const match = content.match(regex)
    if (match) {
      result[key] = match[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\')
    }
  }
  return result
}

function parseWowUpLua(content: string): { required: string | null; optional: string | null } {
  const reqMatch = content.match(/D\.WowUpRequired\s*=\s*"((?:[^"\\]|\\.)*)"/)
  const optMatch = content.match(/D\.WowUpOptional\s*=\s*"((?:[^"\\]|\\.)*)"/)
  return {
    required: reqMatch ? reqMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\') : null,
    optional: optMatch ? optMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\') : null,
  }
}

function parseClassLua(content: string): Array<{ spec: string; importString: string }> {
  const specs: Array<{ spec: string; importString: string }> = []

  // Match entries with spec comment: "importString", -- SpecName
  const entryRegex = /"((?:[^"\\]|\\.)*)"\s*,\s*--\s*(.+)/g
  let match
  while ((match = entryRegex.exec(content)) !== null) {
    const importString = match[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\')
    const specName = match[2].trim()
    specs.push({ spec: specName, importString })
  }

  // Also catch entries without spec comment: "importString",
  const noCommentRegex = /^\s*"((?:[^"\\]|\\.)+)"\s*,\s*$/gm
  while ((match = noCommentRegex.exec(content)) !== null) {
    const str = match[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\')
    if (!specs.find(s => s.importString === str)) {
      specs.push({ spec: '', importString: str })
    }
  }

  return specs
}

// ─── DB Upsert ───────────────────────────────────────────────

function upsertProfile(addon: string, profile: string, string: string): 'created' | 'updated' | 'unchanged' {
  const existing = db.select().from(profiles)
    .where(and(eq(profiles.addon, addon), eq(profiles.profile, profile)))
    .get()

  if (existing) {
    if (existing.string === string) return 'unchanged'
    db.update(profiles)
      .set({ string, updatedAt: new Date() })
      .where(eq(profiles.id, existing.id))
      .run()
    return 'updated'
  }

  db.insert(profiles).values({
    addon, profile, string,
    description: `${addon} - ${profile}`,
    sortOrder: 0,
    isVisible: true,
  }).run()
  return 'created'
}

function upsertWowUp(name: string, string: string): 'created' | 'updated' | 'unchanged' {
  const existing = db.select().from(wowupStrings)
    .where(eq(wowupStrings.name, name))
    .get()

  if (existing) {
    if (existing.string === string) return 'unchanged'
    db.update(wowupStrings)
      .set({ string, updatedAt: new Date() })
      .where(eq(wowupStrings.id, existing.id))
      .run()
    return 'updated'
  }

  db.insert(wowupStrings).values({
    name, string,
    description: `WowUp ${name}`,
    sortOrder: name === 'Required' ? 0 : 1,
    isVisible: true,
  }).run()
  return 'created'
}

function upsertClassLayout(className: string, spec: string, importString: string, sortOrder: number): 'created' | 'updated' | 'unchanged' {
  const existing = db.select().from(characterLayouts)
    .where(and(
      eq(characterLayouts.className, className),
      eq(characterLayouts.spec, spec)
    )).get()

  const layoutName = spec ? `${className} - ${spec}` : `${className} #${sortOrder + 1}`

  if (existing) {
    if (existing.importString === importString) return 'unchanged'
    db.update(characterLayouts)
      .set({ importString, name: layoutName, updatedAt: new Date() })
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

function upsertSetting(key: string, value: string) {
  const existing = db.select().from(settings).where(eq(settings.key, key)).get()
  if (existing) {
    db.update(settings).set({ value, updatedAt: new Date() }).where(eq(settings.id, existing.id)).run()
  } else {
    db.insert(settings).values({ key, value }).run()
  }
}

// ─── GitHub File Fetcher ─────────────────────────────────────

async function fetchFileFromGitHub(owner: string, repo: string, path: string, token: string): Promise<string | null> {
  try {
    const response = await $fetch<{ content: string; encoding: string }>(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          Authorization: `Bearer ${token}`,
          'User-Agent': 'MagguuUI-WebAdmin',
        },
        timeout: 15000,
      }
    )

    if (response.encoding === 'base64' && response.content) {
      return Buffer.from(response.content, 'base64').toString('utf-8')
    }
    return null
  } catch (err: any) {
    if (err?.response?.status === 404) return null
    throw err
  }
}

// ─── Handler ─────────────────────────────────────────────────

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()

  if (!config.githubToken || !config.githubRepo) {
    throw createError({ statusCode: 400, message: 'GitHub Token or Repo not configured.' })
  }

  const [owner, repo] = config.githubRepo.split('/')
  const results: { file: string; addon: string; status: string }[] = []
  let errors = 0

  try {
    // ── 1. Pull Addon Profiles ─────────────────────────
    for (const addonConfig of ADDON_MAP) {
      try {
        const content = await fetchFileFromGitHub(owner, repo, addonConfig.file, config.githubToken)

        if (!content) {
          results.push({ file: addonConfig.file, addon: addonConfig.addon, status: 'not found' })
          continue
        }

        if (addonConfig.style === 'simple') {
          const string = parseSimpleLua(content, addonConfig.varName)
          if (string && string.length > 0) {
            const status = upsertProfile(addonConfig.addon, 'Default', string)
            results.push({ file: addonConfig.file, addon: addonConfig.addon, status })
          } else {
            results.push({ file: addonConfig.file, addon: addonConfig.addon, status: 'empty' })
          }
        } else if (addonConfig.style === 'table') {
          const parsed = parseTableLua(content, addonConfig.varName, (addonConfig as TableAddon).keys)
          for (const [key, value] of Object.entries(parsed)) {
            if (value && value.length > 0) {
              const status = upsertProfile(addonConfig.addon, key, value)
              results.push({ file: addonConfig.file, addon: `${addonConfig.addon}/${key}`, status })
            }
          }
        }
      } catch (err: any) {
        results.push({ file: addonConfig.file, addon: addonConfig.addon, status: `error: ${err?.message || 'unknown'}` })
        errors++
      }
    }

    // ── 2. Pull WowUp Strings ──────────────────────────
    try {
      const wowupContent = await fetchFileFromGitHub(owner, repo, 'Data/AddOns/WowUp.lua', config.githubToken)

      if (wowupContent) {
        const { required, optional } = parseWowUpLua(wowupContent)

        if (required && required.length > 0) {
          const status = upsertWowUp('Required', required)
          results.push({ file: 'Data/AddOns/WowUp.lua', addon: 'WowUp/Required', status })
        }
        if (optional && optional.length > 0) {
          const status = upsertWowUp('Optional', optional)
          results.push({ file: 'Data/AddOns/WowUp.lua', addon: 'WowUp/Optional', status })
        }
      } else {
        results.push({ file: 'Data/AddOns/WowUp.lua', addon: 'WowUp', status: 'not found' })
      }
    } catch (err: any) {
      results.push({ file: 'Data/AddOns/WowUp.lua', addon: 'WowUp', status: `error: ${err?.message || 'unknown'}` })
      errors++
    }

    // ── 3. Pull Class Layouts ──────────────────────────
    for (const [filename, className] of Object.entries(CLASS_MAP)) {
      try {
        const content = await fetchFileFromGitHub(owner, repo, `Data/Classes/${filename}`, config.githubToken)

        if (!content) {
          results.push({ file: `Data/Classes/${filename}`, addon: className, status: 'not found' })
          continue
        }

        const specs = parseClassLua(content)
        if (specs.length === 0) {
          results.push({ file: `Data/Classes/${filename}`, addon: className, status: 'empty' })
          continue
        }

        let classStatus = 'unchanged'
        for (let i = 0; i < specs.length; i++) {
          const { spec, importString } = specs[i]
          if (!importString) continue

          const specLabel = spec || `Spec ${i + 1}`
          const status = upsertClassLayout(className, specLabel, importString, i)
          if (status !== 'unchanged') classStatus = status
        }

        results.push({ file: `Data/Classes/${filename}`, addon: `${className} (${specs.length} specs)`, status: classStatus })
      } catch (err: any) {
        results.push({ file: `Data/Classes/${filename}`, addon: className, status: `error: ${err?.message || 'unknown'}` })
        errors++
      }
    }

    // ── 4. Update version info ─────────────────────────
    try {
      const release = await $fetch<{ tag_name: string }>(
        `https://api.github.com/repos/${owner}/${repo}/releases/latest`,
        {
          headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${config.githubToken}`,
            'User-Agent': 'MagguuUI-WebAdmin',
          },
          timeout: 10000,
        }
      )
      const version = (release.tag_name || '').replace(/^v/, '')
      upsertSetting('github_latest_version', version)
      upsertSetting('github_last_check', new Date().toISOString())
    } catch {
      // Release info is optional
    }

    // ── Summary ────────────────────────────────────────
    const created = results.filter(r => r.status === 'created').length
    const updated = results.filter(r => r.status === 'updated').length
    const unchanged = results.filter(r => r.status === 'unchanged').length

    // Auto-generate public changelog entry
    createSyncChangelog(results, 'pull')

    db.insert(syncHistory).values({
      triggerSource: 'manual-pull',
      status: errors > 0 ? 'error' : 'success',
      details: `Pull: ${created} created, ${updated} updated, ${unchanged} unchanged, ${errors} errors`,
    }).run()

    return {
      success: true,
      data: {
        message: `Pull complete: ${created} created, ${updated} updated, ${unchanged} unchanged`,
        results,
        summary: { created, updated, unchanged, errors },
      },
    }
  } catch (err: any) {
    db.insert(syncHistory).values({
      triggerSource: 'manual-pull',
      status: 'error',
      details: err?.message || 'Unknown error',
    }).run()

    throw createError({ statusCode: 502, message: `GitHub API error: ${err?.message || 'Unknown'}` })
  }
})
