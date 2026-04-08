import { marked } from 'marked'

// DOMPurify is client-only. We load it lazily on first sanitize call so that
// module evaluation stays synchronous on both server and client — a top-level
// `await import()` caused SSR/CSR hydration mismatches on any v-html surface.
let clientSanitize: ((html: string) => string) | null = null

if (import.meta.client) {
  import('dompurify').then((mod) => {
    clientSanitize = (html: string) => mod.default.sanitize(html)
  }).catch(() => { /* ignore — SSR fallback sanitizer will be used */ })
}

export interface MarkdownRenderOptions {
  breaks?: boolean
  stripChangelogDateHeaders?: boolean
}

export function sanitizeRichHtml(html: string): string {
  if (!html) return ''
  return clientSanitize ? clientSanitize(html) : sanitizeHtmlSSR(html)
}

export function renderMarkdownToSafeHtml(markdown: string, options: MarkdownRenderOptions = {}): string {
  if (!markdown) return ''

  const source = options.stripChangelogDateHeaders
    ? markdown.replace(/^###\s+Changes\s+\d{4}-\d{2}-\d{2}\s*/gm, '').trim()
    : markdown

  const html = marked.parse(source, {
    async: false,
    breaks: options.breaks ?? false,
  }) as string

  return sanitizeRichHtml(html)
}

function sanitizeHtmlSSR(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?>[\s\S]*?<\/embed>/gi, '')
    .replace(/<form[\s\S]*?>[\s\S]*?<\/form>/gi, '')
    .replace(/\son\w+=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, ' $1="#"')
}
