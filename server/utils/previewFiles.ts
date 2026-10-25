/**
 * Lists the files in `public/previews/` at runtime so a dropped-in image shows
 * up without a code change. Looks next to the built server (`.output/public`),
 * then in the working directory (`public/`, used by `nuxt dev`). Cached for a
 * few seconds in production, not at all in dev. Only file NAMES leave this
 * module, filtered by `isPreviewFileName`.
 */

import { existsSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PREVIEW_PUBLIC_DIR, isPreviewFileName } from '~/utils/previewImages'

export const PREVIEW_FILES_CACHE_MS = 10_000

export function candidatePreviewDirs(cwd = process.cwd(), here = import.meta.url): string[] {
  const dirs: string[] = []
  try {
    const serverDir = dirname(fileURLToPath(here))
    // .output/server/chunks/... and .output/server/index.mjs → .output/public
    dirs.push(join(serverDir, '..', 'public', PREVIEW_PUBLIC_DIR), join(serverDir, '..', '..', 'public', PREVIEW_PUBLIC_DIR))
  } catch { /* not a file URL (bundled differently): rely on cwd */ }
  dirs.push(join(cwd, '.output', 'public', PREVIEW_PUBLIC_DIR), join(cwd, 'public', PREVIEW_PUBLIC_DIR))
  return dirs
}

/** File names of the first existing candidate directory; [] when none exists. */
export function readPreviewFiles(dirs: string[] = candidatePreviewDirs()): string[] {
  for (const dir of dirs) {
    if (!existsSync(dir)) continue
    try {
      return readdirSync(dir).filter(isPreviewFileName).sort()
    } catch {
      return []
    }
  }
  return []
}

let cached: { at: number, files: string[] } | null = null

export function listPreviewFiles(dev = import.meta.dev, now = Date.now()): string[] {
  if (!dev && cached && now - cached.at < PREVIEW_FILES_CACHE_MS) return cached.files
  const files = readPreviewFiles()
  cached = { at: now, files }
  return files
}
