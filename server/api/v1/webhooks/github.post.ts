/**
 * POST /api/v1/webhooks/github
 *
 * Receives GitHub webhook events (release, push).
 * Validates webhook signature if NUXT_GITHUB_WEBHOOK_SECRET is set.
 * Public endpoint — no JWT auth required.
 */

import { createHmac, timingSafeEqual } from 'crypto'
import { eq, and } from 'drizzle-orm'
import { db } from '~/server/database'
import { syncHistory, settings, profiles, wowupStrings, characterLayouts } from '~/server/database/schema'
import { createSyncChangelog } from '~/server/utils/syncChangelog'

function upsertSetting(key: string, value: string) {
  const existing = db.select().from(settings).where(eq(settings.key, key)).get()
  if (existing) {
    db.update(settings).set({ value, updatedAt: new Date() }).where(eq(settings.id, existing.id)).run()
  } else {
    db.insert(settings).values({ key, value }).run()
  }
}

function verifySignature(payload: string, signature: string | null, secret: string): boolean {
  const expected = 'sha256=' + createHmac('sha256', secret).update(payload).digest('hex')
  // Always compute expected hash to prevent timing attacks on missing signatures
  if (!signature) return false
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const webhookSecret = config.githubWebhookSecret || ''
  const eventType = getHeader(event, 'x-github-event') || ''
  const signature = getHeader(event, 'x-hub-signature-256') || null

  // Read raw body for signature verification
  const rawBody = await readRawBody(event) || ''
  let body: any
  try {
    body = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody
  } catch {
    throw createError({ statusCode: 400, message: 'Invalid JSON payload' })
  }

  // Verify webhook signature if secret is configured
  if (webhookSecret) {
    const bodyStr = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody)
    if (!verifySignature(bodyStr, signature, webhookSecret)) {
      db.insert(syncHistory).values({
        triggerSource: `webhook-${eventType}`,
        status: 'error',
        details: 'Invalid webhook signature',
      }).run()
      throw createError({ statusCode: 401, message: 'Invalid signature' })
    }
  }

  // Handle ping event (GitHub sends this when webhook is first configured)
  if (eventType === 'ping') {
    db.insert(syncHistory).values({
      triggerSource: 'webhook-ping',
      status: 'success',
      details: `Webhook connected: ${body.zen || 'OK'}`,
    }).run()
    return { success: true, data: { message: 'pong' } }
  }

  // Handle release events
  if (eventType === 'release' && body.action === 'published') {
    const release = body.release
    if (!release) {
      throw createError({ statusCode: 400, message: 'Missing release data' })
    }

    const version = (release.tag_name || '').replace(/^v/, '')

    // Update stored version info
    upsertSetting('github_latest_version', version)
    upsertSetting('github_last_check', new Date().toISOString())

    db.insert(syncHistory).values({
      triggerSource: 'webhook-release',
      status: 'success',
      details: `Release ${release.tag_name}: ${release.name || 'Unnamed'}`,
    }).run()

    return {
      success: true,
      data: {
        event: 'release',
        version,
        name: release.name,
      },
    }
  }

  // Handle push events — auto-pull Data/*.lua changes into DB
  if (eventType === 'push') {
    const ref = body.ref || ''
    const commits = body.commits || []
    const pusher = body.pusher?.name || 'unknown'
    const commitCount = commits.length || 0

    // Check if any Data/*.lua files were changed
    const dataFiles = new Set<string>()
    for (const commit of commits) {
      for (const file of [...(commit.added || []), ...(commit.modified || [])]) {
        if (typeof file === 'string' && file.startsWith('Data/') && file.endsWith('.lua')) {
          dataFiles.add(file)
        }
      }
    }

    if (dataFiles.size > 0) {
      // Auto-pull: fetch changed Lua files from GitHub and import into DB
      const config = useRuntimeConfig()
      if (config.githubToken && config.githubRepo) {
        const [owner, repo] = config.githubRepo.split('/')
        let imported = 0
        let errors = 0
        const syncResults: { file: string; addon: string; status: string }[] = []

        for (const filePath of dataFiles) {
          const importedBefore = imported
          try {
            const fileResp = await $fetch<{ content: string; encoding: string }>(
              `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
              {
                headers: {
                  Accept: 'application/vnd.github.v3+json',
                  Authorization: `Bearer ${config.githubToken}`,
                  'User-Agent': 'MagguuUI-WebAdmin',
                },
                timeout: 15000,
              }
            )

            if (fileResp.encoding !== 'base64' || !fileResp.content) continue
            const content = Buffer.from(fileResp.content, 'base64').toString('utf-8')

            // Parse and import based on file path
            // Data/AddOns/*.lua → Addon profiles + WowUp
            // Data/Classes/*.lua → Class layouts

            if (filePath.startsWith('Data/AddOns/')) {
              const filename = filePath.replace('Data/AddOns/', '')

              if (filename === 'WowUp.lua') {
              // Parse WowUp Required/Optional strings
              const reqMatch = content.match(/D\.WowUpRequired\s*=\s*"((?:[^"\\]|\\.)*)"/)
              const optMatch = content.match(/D\.WowUpOptional\s*=\s*"((?:[^"\\]|\\.)*)"/)
              for (const [name, match] of [['Required', reqMatch], ['Optional', optMatch]] as const) {
                if (match) {
                  const str = match[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\')
                  const existing = db.select().from(wowupStrings).where(eq(wowupStrings.name, name)).get()
                  if (existing) {
                    if (existing.string !== str) {
                      db.update(wowupStrings).set({ string: str, updatedAt: new Date() }).where(eq(wowupStrings.id, existing.id)).run()
                      imported++
                    }
                  } else {
                    db.insert(wowupStrings).values({ name, string: str, description: `WowUp ${name}`, sortOrder: name === 'Required' ? 0 : 1, isVisible: true }).run()
                    imported++
                  }
                }
              }
            } else {
              // Addon profile Lua files — detect simple vs table style
              const ADDON_SIMPLE: Record<string, string> = {
                'Plater.lua': 'plater', 'BigWigs.lua': 'bigwigs', 'Details.lua': 'details',
                'BetterCooldownManager.lua': 'bettercooldownmanager', 'Ayije_CDM.lua': 'ayije_cdm', 'Blizzard_EditMode.lua': 'blizzardeditmode',
                'WindTools.lua': 'windtools',
              }
              const addonName = filename.replace('.lua', '')

              if (filename === 'ElvUI.lua') {
                // Table style: parse profile, private, global, aurafilters
                for (const key of ['profile', 'private', 'global', 'aurafilters']) {
                  const regex = new RegExp(`${key}\\s*=\\s*"((?:[^"\\\\]|\\\\.)*)"`)
                  const match = content.match(regex)
                  if (match) {
                    const str = match[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\')
                    const existing = db.select().from(profiles).where(and(eq(profiles.addon, 'ElvUI'), eq(profiles.profile, key))).get()
                    if (existing) {
                      if (existing.string !== str) {
                        db.update(profiles).set({ string: str, updatedAt: new Date() }).where(eq(profiles.id, existing.id)).run()
                        imported++
                      }
                    } else {
                      db.insert(profiles).values({ addon: 'ElvUI', profile: key, string: str, description: `ElvUI - ${key}`, sortOrder: 0, isVisible: true }).run()
                      imported++
                    }
                  }
                }
              } else if (ADDON_SIMPLE[filename]) {
                // Simple style: D.varname = "..."
                const varName = ADDON_SIMPLE[filename]
                const regex = new RegExp(`D\\.${varName}\\s*=\\s*"((?:[^"\\\\]|\\\\.)*)"`)
                const match = content.match(regex)
                if (match) {
                  const str = match[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\')
                  const existing = db.select().from(profiles).where(and(eq(profiles.addon, addonName), eq(profiles.profile, 'Default'))).get()
                  if (existing) {
                    if (existing.string !== str) {
                      db.update(profiles).set({ string: str, updatedAt: new Date() }).where(eq(profiles.id, existing.id)).run()
                      imported++
                    }
                  } else {
                    db.insert(profiles).values({ addon: addonName, profile: 'Default', string: str, description: `${addonName} profile`, sortOrder: 0, isVisible: true }).run()
                    imported++
                  }
                }
              }
            }

            } else if (filePath.startsWith('Data/Classes/')) {
              // ── Class Layout Lua files ──
              // Format: D.classname = { "string1", -- Spec1   "string2", -- Spec2 }
              const filename = filePath.replace('Data/Classes/', '')
              if (filename === '!load.xml') continue

              // Map filename to class display name
              const CLASS_NAMES: Record<string, string> = {
                'DeathKnight.lua': 'Death Knight', 'DemonHunter.lua': 'Demon Hunter',
                'Druid.lua': 'Druid', 'Evoker.lua': 'Evoker', 'Hunter.lua': 'Hunter',
                'Mage.lua': 'Mage', 'Monk.lua': 'Monk', 'Paladin.lua': 'Paladin',
                'Priest.lua': 'Priest', 'Rogue.lua': 'Rogue', 'Shaman.lua': 'Shaman',
                'Warlock.lua': 'Warlock', 'Warrior.lua': 'Warrior',
              }
              const className = CLASS_NAMES[filename]
              if (!className) continue

              // Parse all entries: "importString", -- SpecName
              const entryRegex = /"((?:[^"\\]|\\.)*)"\s*,\s*--\s*(.+)/g
              const specs: Array<{ spec: string; importString: string }> = []
              let entryMatch
              while ((entryMatch = entryRegex.exec(content)) !== null) {
                const importString = entryMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\')
                const specName = entryMatch[2].trim()
                specs.push({ spec: specName, importString })
              }

              // Also catch entries without spec comment: "importString",
              const noCommentRegex = /^\s*"((?:[^"\\]|\\.)+)"\s*,\s*$/gm
              let ncMatch
              while ((ncMatch = noCommentRegex.exec(content)) !== null) {
                const str = ncMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\')
                // Skip if already matched with a comment
                if (!specs.find(s => s.importString === str)) {
                  specs.push({ spec: '', importString: str })
                }
              }

              // Upsert each spec into character_layouts
              for (let i = 0; i < specs.length; i++) {
                const { spec, importString } = specs[i]
                if (!importString) continue

                const layoutName = spec ? `${className} - ${spec}` : `${className} #${i + 1}`
                const existing = db.select().from(characterLayouts)
                  .where(and(
                    eq(characterLayouts.className, className),
                    eq(characterLayouts.spec, spec || `Spec ${i + 1}`)
                  )).get()

                if (existing) {
                  if (existing.importString !== importString) {
                    db.update(characterLayouts)
                      .set({ importString, name: layoutName, updatedAt: new Date() })
                      .where(eq(characterLayouts.id, existing.id)).run()
                    imported++
                  }
                } else {
                  db.insert(characterLayouts).values({
                    name: layoutName,
                    className,
                    spec: spec || `Spec ${i + 1}`,
                    importString,
                    sortOrder: i,
                    isVisible: true,
                  }).run()
                  imported++
                }
              }
            }
          } catch (err: any) {
            errors++
            console.error(`Webhook auto-pull error for ${filePath}:`, err?.message)
          }

          // Track result for changelog
          if (imported > importedBefore) {
            const addonLabel = filePath.startsWith('Data/Classes/')
              ? filePath.replace('Data/Classes/', '').replace('.lua', '')
              : filePath.startsWith('Data/AddOns/')
                ? filePath.replace('Data/AddOns/', '').replace('.lua', '')
                : filePath
            syncResults.push({ file: filePath, addon: addonLabel, status: 'updated' })
          }
        }

        // Auto-generate public changelog entry
        createSyncChangelog(syncResults, 'webhook')

        db.insert(syncHistory).values({
          triggerSource: 'webhook-push-autopull',
          status: errors > 0 ? 'error' : 'success',
          details: `Push by ${pusher}: ${dataFiles.size} Data/ files changed, ${imported} imported, ${errors} errors`,
        }).run()

        return {
          success: true,
          data: { event: 'push', ref, commits: commitCount, autoPull: true, imported, errors },
        }
      }
    }

    // Normal push (no Data/ changes or no GitHub config)
    db.insert(syncHistory).values({
      triggerSource: 'webhook-push',
      status: 'success',
      details: `Push to ${ref} by ${pusher} (${commitCount} commit${commitCount !== 1 ? 's' : ''})`,
    }).run()

    return {
      success: true,
      data: { event: 'push', ref, commits: commitCount },
    }
  }

  // Handle workflow_run events (GitHub Actions completed)
  if (eventType === 'workflow_run') {
    const run = body.workflow_run
    const status = run?.conclusion || run?.status || 'unknown'
    const name = run?.name || 'Unknown workflow'

    db.insert(syncHistory).values({
      triggerSource: 'webhook-workflow',
      status: status === 'success' ? 'success' : 'error',
      details: `${name}: ${status}`,
    }).run()

    return {
      success: true,
      data: { event: 'workflow_run', name, status },
    }
  }

  // Unhandled event type — log and accept
  db.insert(syncHistory).values({
    triggerSource: `webhook-${eventType || 'unknown'}`,
    status: 'info',
    details: `Unhandled event type: ${eventType}`,
  }).run()

  return { success: true, data: { event: eventType, handled: false } }
})
