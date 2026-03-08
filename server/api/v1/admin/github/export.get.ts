/**
 * GET /api/v1/admin/github/export
 *
 * Exports all string data as JSON for backup or manual GitHub sync.
 */

import { db } from '~/server/database'
import { profiles, wowupStrings, characterLayouts, changelogs, siteContent, settings } from '~/server/database/schema'

export default defineEventHandler(async (event) => {
  const allProfiles = db.select().from(profiles).all()
  const allWowup = db.select().from(wowupStrings).all()
  const allLayouts = db.select().from(characterLayouts).all()
  const allChangelogs = db.select().from(changelogs).all()
  const allContent = db.select().from(siteContent).all()
  const allSettings = db.select().from(settings).all()

  const exportData = {
    exportedAt: new Date().toISOString(),
    version: '2.0',
    profiles: allProfiles,
    wowupStrings: allWowup,
    characterLayouts: allLayouts,
    changelogs: allChangelogs,
    siteContent: allContent,
    settings: allSettings.filter(s => !s.key.startsWith('github_')), // Don't export github tokens
  }

  // Set download headers
  setHeader(event, 'Content-Type', 'application/json')
  setHeader(event, 'Content-Disposition', `attachment; filename="magguui-export-${new Date().toISOString().slice(0, 10)}.json"`)

  return exportData
})
