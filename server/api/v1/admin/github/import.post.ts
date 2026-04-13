/**
 * POST /api/v1/admin/github/import
 *
 * Imports data from a JSON export.
 * strategy 'merge'     → skip records that already exist (match by addon+profile / name)
 * strategy 'overwrite' → wipe tables and re-insert everything
 *
 * Fields are mapped exactly to the database schema to prevent errors.
 */

import { eq, and } from 'drizzle-orm'
import { db } from '~/server/database'
import { profiles, wowupStrings, characterLayouts, changelogs, siteContent, syncHistory } from '~/server/database/schema'
import { validateBody, githubImportSchema } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const ip = getClientIp(event)
  const { allowed, retryAfter } = checkRateLimit(`admin-github-import:${ip}`, 5, 15 * 60 * 1000, 15 * 60 * 1000)
  if (!allowed) {
    setResponseHeader(event, 'Retry-After', String(retryAfter))
    throw createError({
      statusCode: 429,
      message: `Too many imports. Please wait ${Math.ceil(retryAfter / 60)} minutes.`,
    })
  }

  const body = await readBody(event)
  const validated = validateBody(githubImportSchema, body)

  let data: any
  try {
    data = typeof validated.data === 'string' ? JSON.parse(validated.data as string) : validated.data
  } catch {
    throw createError({ statusCode: 400, message: 'Invalid JSON format' })
  }

  const strategy = validated.strategy || 'merge'
  const stats = { profiles: 0, wowup: 0, layouts: 0, changelogs: 0, content: 0, skipped: 0, deleted: 0, errors: 0 }

  try {
    // Overwrite strategy: delete existing data first
    if (strategy === 'overwrite') {
      const pDel = db.delete(profiles).run()
      const wDel = db.delete(wowupStrings).run()
      const lDel = db.delete(characterLayouts).run()
      stats.deleted = (pDel.changes || 0) + (wDel.changes || 0) + (lDel.changes || 0)
    }

    // ── Import profiles ──────────────────────────
    if (Array.isArray(data.profiles)) {
      for (const p of data.profiles) {
        try {
          if (!p.addon || !p.profile || !p.string) { stats.errors++; continue }

          if (strategy === 'merge') {
            const existing = db.select({ id: profiles.id }).from(profiles)
              .where(and(eq(profiles.addon, p.addon), eq(profiles.profile, p.profile)))
              .get()
            if (existing) { stats.skipped++; continue }
          }

          db.insert(profiles).values({
            addon: p.addon,
            profile: p.profile,
            string: p.string,
            description: p.description || null,
            customFields: p.customFields || null,
            sortOrder: p.sortOrder ?? 0,
            isVisible: p.isVisible !== false,
          }).run()
          stats.profiles++
        } catch { stats.errors++ }
      }
    }

    // ── Import wowup strings ─────────────────────
    if (Array.isArray(data.wowupStrings)) {
      for (const w of data.wowupStrings) {
        try {
          if (!w.name || !w.string) { stats.errors++; continue }

          if (strategy === 'merge') {
            const existing = db.select({ id: wowupStrings.id }).from(wowupStrings)
              .where(eq(wowupStrings.name, w.name))
              .get()
            if (existing) { stats.skipped++; continue }
          }

          db.insert(wowupStrings).values({
            name: w.name,
            string: w.string,
            description: w.description || null,
            customFields: w.customFields || null,
            sortOrder: w.sortOrder ?? 0,
            isVisible: w.isVisible !== false,
          }).run()
          stats.wowup++
        } catch { stats.errors++ }
      }
    }

    // ── Import character layouts ──────────────────
    if (Array.isArray(data.characterLayouts)) {
      for (const l of data.characterLayouts) {
        try {
          if (!l.name) { stats.errors++; continue }

          if (strategy === 'merge') {
            const existing = db.select({ id: characterLayouts.id }).from(characterLayouts)
              .where(eq(characterLayouts.name, l.name))
              .get()
            if (existing) { stats.skipped++; continue }
          }

          db.insert(characterLayouts).values({
            name: l.name,
            className: l.className || null,
            spec: l.spec || null,
            description: l.description || null,
            screenshot: l.screenshot || null,
            importString: l.importString || null,
            customFields: l.customFields || null,
            sortOrder: l.sortOrder ?? 0,
            isVisible: l.isVisible !== false,
          }).run()
          stats.layouts++
        } catch { stats.errors++ }
      }
    }

    // ── Import changelogs (merge only: skip same version) ──
    if (Array.isArray(data.changelogs)) {
      for (const c of data.changelogs) {
        try {
          if (!c.version || !c.content) continue

          if (strategy === 'merge') {
            const existing = db.select({ id: changelogs.id }).from(changelogs)
              .where(eq(changelogs.version, c.version))
              .get()
            if (existing) { stats.skipped++; continue }
          }

          db.insert(changelogs).values({
            version: c.version,
            content: c.content,
            contentEn: c.contentEn || null,
            isPublished: c.isPublished !== false,
            publishedAt: c.publishedAt ? new Date(c.publishedAt) : new Date(),
          }).run()
          stats.changelogs++
        } catch { stats.errors++ }
      }
    }

    // ── Import site content (always upsert) ──────
    if (Array.isArray(data.siteContent)) {
      for (const sc of data.siteContent) {
        try {
          if (!sc.page || !sc.section || !sc.key) continue
          const locale = sc.locale || 'en'

          const existing = db.select({ id: siteContent.id }).from(siteContent)
            .where(and(
              eq(siteContent.page, sc.page),
              eq(siteContent.section, sc.section),
              eq(siteContent.key, sc.key),
              eq(siteContent.locale, locale),
            ))
            .get()

          if (existing) {
            db.update(siteContent)
              .set({ value: sc.value || '', updatedAt: new Date() })
              .where(eq(siteContent.id, existing.id))
              .run()
          } else {
            db.insert(siteContent).values({
              page: sc.page,
              section: sc.section,
              key: sc.key,
              value: sc.value || '',
              type: sc.type || 'text',
              locale,
            }).run()
          }
          stats.content++
        } catch { stats.errors++ }
      }
    }

    // Log import
    const parts = []
    if (stats.profiles) parts.push(`${stats.profiles} Profiles`)
    if (stats.wowup) parts.push(`${stats.wowup} WowUp`)
    if (stats.layouts) parts.push(`${stats.layouts} Layouts`)
    if (stats.changelogs) parts.push(`${stats.changelogs} Changelogs`)
    if (stats.content) parts.push(`${stats.content} Content`)

    const detail = strategy === 'overwrite'
      ? `Overwrite: Deleted ${stats.deleted}, imported ${parts.join(', ')}`
      : `Merge: ${parts.join(', ')} (${stats.skipped} skipped${stats.errors ? `, ${stats.errors} errors` : ''})`

    db.insert(syncHistory).values({
      triggerSource: `json-import-${strategy}`,
      status: stats.errors > 0 ? 'partial' : 'success',
      details: detail,
    }).run()

    return {
      success: true,
      data: { message: 'Import successful', imported: stats },
    }
  } catch (err: any) {
    db.insert(syncHistory).values({
      triggerSource: `json-import-${strategy}`,
      status: 'error',
      details: err?.message || 'Import failed',
    }).run()

    throw createError({
      statusCode: 500,
      message: `Import error: ${err?.message || 'Unknown'}`,
    })
  }
})
