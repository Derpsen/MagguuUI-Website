/**
 * Client-manifest policy: admin-only and on-demand public extras must not be
 * prefetched or preloaded on public pages. Vite 8 / Rolldown often keys a
 * chunk as `_D5hSvx60.js` with `name: 'TipTapEditor'` and no `src`.
 */

export const ADMIN_ONLY_CHUNK = /(^|\/)(components\/PublicSearch\.vue|layouts\/admin\.vue|pages\/admin\/(?!login\.vue)|components\/admin\/|components\/TipTapEditor\.vue|components\/CommandPalette\.vue|components\/KeyboardShortcuts\.vue)|node_modules\/(@tiptap|prosemirror-|echarts|zrender|vue-echarts|web-vitals)/

const ADMIN_NAME = /(^|[._/-])(TipTapEditor|tiptap|prosemirror|CommandPalette|KeyboardShortcuts|PublicSearch)([._/-]|$)/i

export type ViteManifestChunk = {
  file?: string
  src?: string
  name?: string
  css?: string[]
  imports?: string[]
  dynamicImports?: string[]
  isEntry?: boolean
  prefetch?: boolean
  preload?: boolean
}

export type ViteManifest = Record<string, ViteManifestChunk>

function isAdminToken(value: string): boolean {
  return ADMIN_ONLY_CHUNK.test(value) || ADMIN_NAME.test(value)
}

export function isAdminKey(key: string, chunk?: ViteManifestChunk): boolean {
  const tokens = [key, chunk?.file, chunk?.src, chunk?.name, ...(chunk?.css ?? [])].filter((value): value is string => Boolean(value))
  return tokens.some(isAdminToken)
}

export function applyAdminManifestPolicy(manifest: ViteManifest): void {
  const adminOnly = new Set(
    Object.entries(manifest)
      .filter(([key, chunk]) => isAdminKey(key, chunk))
      .map(([key]) => key),
  )
  const importers = new Map<string, Set<string>>()
  for (const [key, chunk] of Object.entries(manifest)) {
    for (const dep of [...(chunk.imports ?? []), ...(chunk.dynamicImports ?? [])]) {
      if (!importers.has(dep)) importers.set(dep, new Set())
      importers.get(dep)!.add(key)
    }
  }
  let grew = true
  while (grew) {
    grew = false
    for (const [key, chunk] of Object.entries(manifest)) {
      if (adminOnly.has(key) || chunk.isEntry) continue
      const from = importers.get(key)
      if (from?.size && [...from].every(k => adminOnly.has(k))) {
        adminOnly.add(key)
        grew = true
      }
    }
  }
  for (const key of adminOnly) {
    const chunk = manifest[key]
    if (!chunk) continue
    chunk.prefetch = false
    chunk.preload = false
    for (const css of chunk.css ?? []) {
      const cssChunk = manifest[css]
      if (cssChunk) {
        cssChunk.prefetch = false
        cssChunk.preload = false
      }
    }
  }
  for (const [key, chunk] of Object.entries(manifest)) {
    if (adminOnly.has(key) || !chunk.dynamicImports?.length) continue
    chunk.dynamicImports = chunk.dynamicImports.filter(dep => !adminOnly.has(dep))
  }
}
