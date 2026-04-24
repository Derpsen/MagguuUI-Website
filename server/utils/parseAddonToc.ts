/**
 * Parses MagguuUI.toc to extract Required + Optional dependency lists.
 *
 * Format (from WoW addon toc):
 *   ## OptionalDeps: Foo, Bar, !Baz, ...
 *   ## RequiredDeps: ElvUI
 *
 * Lines starting with `## ` carry metadata. Dep tokens are comma-separated.
 * Names with a leading `!` are libraries that load before others (e.g. !BugGrabber).
 */

export interface TocAddonRef {
  tocName: string
  required: boolean
  isLibrary: boolean
}

const META_RE = /^##\s*([\w-]+)\s*:\s*(.*)$/

export function parseAddonToc(content: string): TocAddonRef[] {
  const lines = content.split(/\r?\n/)
  const result: TocAddonRef[] = []
  const seen = new Set<string>()

  let optional: string[] = []
  let required: string[] = []

  for (const line of lines) {
    const m = META_RE.exec(line.trim())
    if (!m) continue
    const key = m[1].toLowerCase()
    const value = m[2].trim()
    if (key === 'optionaldeps') {
      optional = splitDeps(value)
    } else if (key === 'requireddeps') {
      required = splitDeps(value)
    }
  }

  for (const dep of required) {
    if (seen.has(dep)) continue
    seen.add(dep)
    result.push({ tocName: dep, required: true, isLibrary: dep.startsWith('!') })
  }
  for (const dep of optional) {
    if (seen.has(dep)) continue
    seen.add(dep)
    result.push({ tocName: dep, required: false, isLibrary: dep.startsWith('!') })
  }

  return result
}

function splitDeps(value: string): string[] {
  return value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
}
