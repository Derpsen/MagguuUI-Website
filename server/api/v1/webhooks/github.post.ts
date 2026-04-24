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
import { syncHistory, settings, profiles, wowupStrings, characterLayouts, changelogs } from '~/server/database/schema'
import { createSyncChangelog } from '~/server/utils/syncChangelog'
import { checkRateLimit, getClientIp } from '~/server/utils/rateLimit'
import { parseAddonChangelog } from '~/server/utils/parseAddonChangelog'

// GitHub webhook payloads are typically <1MB; cap well above that to reject abuse.
const MAX_WEBHOOK_BODY_BYTES = 2 * 1024 * 1024 // 2 MB

// Real ElvUI/Plater/etc. import strings top out around a few hundred KB.
// Reject anything beyond this to prevent an addon-repo compromise (or a
// malformed push) from filling the DB with garbage blobs that users would
// then paste straight into WoW.
const MAX_IMPORT_STRING_CHARS = 5 * 1024 * 1024 // 5 MB

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
  // Length check first — timingSafeEqual throws on mismatched lengths which
  // leaks a slightly different timing signature than a real byte compare.
  if (Buffer.byteLength(signature) !== Buffer.byteLength(expected)) return false
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

  // Rate limit unauthenticated hits (signature check is not enough: an attacker
  // flooding with bad signatures still triggers a DB insert per request).
  const ip = getClientIp(event)
  const rl = checkRateLimit(`webhook:${ip}`, 60, 60 * 1000, 5 * 60 * 1000)
  if (!rl.allowed) {
    setResponseHeader(event, 'Retry-After', String(rl.retryAfter))
    throw createError({ statusCode: 429, message: 'Too many webhook requests' })
  }

  // Reject oversized bodies early (Content-Length hint; raw-body read is still
  // capped below in case the header is missing or lying).
  const contentLength = Number(getHeader(event, 'content-length') || 0)
  if (contentLength && contentLength > MAX_WEBHOOK_BODY_BYTES) {
    throw createError({ statusCode: 413, message: 'Webhook payload too large' })
  }

  // Read raw body for signature verification
  const rawBody = await readRawBody(event) || ''
  const bodyByteLength = typeof rawBody === 'string'
    ? Buffer.byteLength(rawBody)
    : Buffer.isBuffer(rawBody) ? rawBody.length : 0
  if (bodyByteLength > MAX_WEBHOOK_BODY_BYTES) {
    throw createError({ statusCode: 413, message: 'Webhook payload too large' })
  }

  // Webhook secret is REQUIRED — refuse all calls if unset, to prevent
  // unauthenticated writes into the DB via the auto-pull path. Check BEFORE
  // JSON.parse so an unauthenticated attacker can't force large-payload parse
  // cycles on the server.
  if (!webhookSecret) {
    throw createError({ statusCode: 503, message: 'Webhook secret not configured' })
  }
  const bodyStr = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody)
  if (!verifySignature(bodyStr, signature, webhookSecret)) {
    db.insert(syncHistory).values({
      triggerSource: `webhook-${eventType}`,
      status: 'error',
      details: 'Invalid webhook signature',
    }).run()
    throw createError({ statusCode: 401, message: 'Invalid signature' })
  }

  interface WebhookBody {
    zen?: string
    action?: string
    release?: { tag_name?: string, body?: string, name?: string, published_at?: string, html_url?: string }
    ref?: string
    repository?: { full_name?: string }
    commits?: Array<{ added?: string[], modified?: string[], removed?: string[], message?: string, id?: string }>
    pusher?: { name?: string }
    workflow_run?: { name?: string, conclusion?: string, html_url?: string, head_branch?: string }
  }
  let body: WebhookBody
  try {
    body = (typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody) as WebhookBody
  } catch {
    throw createError({ statusCode: 400, message: 'Invalid JSON payload' })
  }

  // Handle ping event (GitHub sends this when webhook is first configured)
  if (eventType === 'ping') {
    db.insert(syncHistory).values({
      triggerSource: 'webhook-ping',
      status: 'success',
      details: `Webhook connected: ${body.zen || 'OK'}`,
    }).run()
    return apiSuccess({ message: 'pong' })
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

    return apiSuccess({
      event: 'release',
      version,
      name: release.name,
    })
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
                  if (str.length > MAX_IMPORT_STRING_CHARS) { errors++; continue }
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
                    if (str.length > MAX_IMPORT_STRING_CHARS) { errors++; continue }
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
                  if (str.length > MAX_IMPORT_STRING_CHARS) { errors++; continue }
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
                if (importString.length > MAX_IMPORT_STRING_CHARS) { errors++; continue }
                const specName = entryMatch[2].trim()
                specs.push({ spec: specName, importString })
              }

              // Also catch entries without spec comment: "importString",
              const noCommentRegex = /^\s*"((?:[^"\\]|\\.)+)"\s*,\s*$/gm
              let ncMatch
              while ((ncMatch = noCommentRegex.exec(content)) !== null) {
                const str = ncMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\')
                if (str.length > MAX_IMPORT_STRING_CHARS) { errors++; continue }
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
          } catch (err: unknown) {
            errors++
            console.error(`Webhook auto-pull error for ${filePath}:`, err instanceof Error ? err.message : String(err))
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

        return apiSuccess({ event: 'push', ref, commits: commitCount, autoPull: true, imported, errors })
      }
    }

    // Changelog sync — fires when CHANGELOG.md is touched in the addon repo
    const repoName = body.repository?.full_name || ''
    const changelogTouched = commits.some(c =>
      [...(c.added || []), ...(c.modified || [])].includes('CHANGELOG.md')
    )

    if (repoName === 'Derpsen/MagguuUI' && changelogTouched) {
      const token = config.githubToken as string | undefined
      let clResult = { inserted: 0, updated: 0, skipped: 0 }

      try {
        const rawUrl = `https://raw.githubusercontent.com/Derpsen/MagguuUI/main/CHANGELOG.md`
        const fetchHeaders: Record<string, string> = { 'User-Agent': 'MagguuUI-WebAdmin' }
        if (token) fetchHeaders['Authorization'] = `Bearer ${token}`

        const markdown = await $fetch<string>(rawUrl, { headers: fetchHeaders, timeout: 15000 })
        const entries = parseAddonChangelog(markdown)

        for (const entry of entries) {
          const existing = db.select().from(changelogs).where(eq(changelogs.version, entry.version)).get()
          if (existing) {
            if (existing.content !== entry.content) {
              db.update(changelogs)
                .set({ content: entry.content, contentEn: entry.content, updatedAt: new Date() })
                .where(eq(changelogs.id, existing.id))
                .run()
              clResult.updated++
            } else {
              clResult.skipped++
            }
          } else {
            db.insert(changelogs).values({
              version: entry.version,
              content: entry.content,
              contentEn: entry.content,
              isPublished: true,
              publishedAt: entry.publishedAt,
            }).run()
            clResult.inserted++
          }
        }

        db.insert(syncHistory).values({
          triggerSource: 'github-changelog',
          status: 'success',
          details: JSON.stringify(clResult),
        }).run()

        return apiSuccess({ ok: true, result: clResult })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('Changelog webhook error:', msg)
        db.insert(syncHistory).values({
          triggerSource: 'github-changelog',
          status: 'error',
          details: msg,
        }).run()
        throw createError({ statusCode: 500, message: 'Changelog sync failed' })
      }
    }

    // Normal push (no Data/ changes or no GitHub config)
    db.insert(syncHistory).values({
      triggerSource: 'webhook-push',
      status: 'success',
      details: `Push to ${ref} by ${pusher} (${commitCount} commit${commitCount !== 1 ? 's' : ''})`,
    }).run()

    return apiSuccess({ event: 'push', ref, commits: commitCount })
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

    return apiSuccess({ event: 'workflow_run', name, status })
  }

  // Unhandled event type — log and accept
  db.insert(syncHistory).values({
    triggerSource: `webhook-${eventType || 'unknown'}`,
    status: 'info',
    details: `Unhandled event type: ${eventType}`,
  }).run()

  return apiSuccess({ event: eventType, handled: false })
})
