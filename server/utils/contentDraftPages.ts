/** Parse and validate the `pages` query parameter ("about,imprint") of the draft endpoints. */
export function parseDraftPages(raw: unknown): string[] {
  const text = Array.isArray(raw) ? raw.join(',') : typeof raw === 'string' ? raw : ''
  const pages = Array.from(new Set(text.split(',').map(p => p.trim()).filter(Boolean)))
  if (!pages.length || pages.length > 10 || pages.some(p => !/^[a-z0-9_-]{1,100}$/i.test(p))) {
    throw createError({ statusCode: 400, message: 'pages query parameter required (comma separated page keys)' })
  }
  return pages
}
