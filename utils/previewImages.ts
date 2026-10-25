/**
 * Profile preview images: naming convention and resolution (pure, shared by the
 * server and the tests). A preview is a file `public/previews/<slug>.<ext>`;
 * the slug is the addon slug from the catalogue (e.g. `ellesmereui`,
 * `northern-sky-raid-tools`). No file means the page shows a neutral placeholder.
 */

export const PREVIEW_PUBLIC_DIR = 'previews'
/** Preferred first: when several formats exist for one slug the first wins. */
export const PREVIEW_EXTENSIONS = ['webp', 'avif', 'png', 'jpg', 'jpeg'] as const
/** Frame every preview is shown in (16:10). Fixed so the layout never shifts. */
export const PREVIEW_WIDTH = 1600
export const PREVIEW_HEIGHT = 1000

export interface PreviewImage {
  src: string
  width: number
  height: number
}

/** Lower-case kebab slug: `Northern Sky` → `northern-sky`. Empty string when nothing usable is left. */
export function previewSlug(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** File names we will ever list from the previews folder: safe characters, known extension. */
export function isPreviewFileName(name: string): boolean {
  return /^[a-z0-9][a-z0-9-]*\.(webp|avif|png|jpe?g)$/i.test(name)
}

/**
 * Picks the image for a slug from the file names that exist. Matching is
 * case-insensitive (`Bigwigs.WEBP` works) and the returned `src` uses the real
 * file name. Returns null when there is no usable file, so the caller renders
 * the placeholder.
 */
export function resolvePreviewImage(slug: string, files: Iterable<string>): PreviewImage | null {
  const wanted = previewSlug(slug)
  if (!wanted) return null
  const byLower = new Map<string, string>()
  for (const file of files) {
    if (isPreviewFileName(file)) byLower.set(file.toLowerCase(), file)
  }
  for (const ext of PREVIEW_EXTENSIONS) {
    const file = byLower.get(`${wanted}.${ext}`)
    if (file) return { src: `/${PREVIEW_PUBLIC_DIR}/${file}`, width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }
  }
  return null
}
