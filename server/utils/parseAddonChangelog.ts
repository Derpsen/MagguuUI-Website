/**
 * Parses the addon's CHANGELOG.md into structured entries.
 *
 * Expected format:
 *   ## v12.0.21 (2026-04-16)
 *   ## v12.0.21 (2026-04-16) - Optional subtitle
 *
 * Blocks are separated by `---` horizontal rules or the next `## ` header.
 */

export interface ChangelogEntry {
  version: string
  content: string
  publishedAt: Date
}

const HEADER_RE = /^## (v\d+\.\d+(?:\.\d+)*)\s*(?:\((\d{4}-\d{2}-\d{2})\))?/

export function parseAddonChangelog(markdown: string): ChangelogEntry[] {
  const lines = markdown.split('\n')
  const entries: ChangelogEntry[] = []

  let currentVersion: string | null = null
  let currentDate: Date | null = null
  let currentLines: string[] = []

  function flush() {
    if (!currentVersion) return
    const content = currentLines
      .join('\n')
      .replace(/^---\s*$/gm, '')   // strip HR separators (every occurrence)
      .trim()
    if (content) {
      entries.push({
        version: currentVersion,
        content,
        publishedAt: currentDate ?? new Date(),
      })
    }
    currentLines = []
  }

  for (const line of lines) {
    const match = HEADER_RE.exec(line)
    if (match && match[1]) {
      flush()
      currentVersion = match[1]
      currentDate = match[2] ? new Date(match[2] + 'T00:00:00Z') : new Date()
    } else if (currentVersion) {
      currentLines.push(line)
    }
  }
  flush()

  return entries
}
