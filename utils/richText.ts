import { marked } from 'marked'

// IMPORTANT: SSR and client MUST produce byte-identical HTML here, otherwise
// Vue hydration fails on any v-html surface and Nuxt escalates the failure to
// the 500 error page. DOMPurify (client) and the regex sanitizer (server)
// produce subtly different output (attribute order, whitespace, entity
// encoding), so we deliberately use the same deterministic sanitizer on
// both runtimes. Content here is admin-authored markdown, not user input,
// so the SSR sanitizer is sufficient.

export interface MarkdownRenderOptions {
  breaks?: boolean
  stripChangelogDateHeaders?: boolean
}

export function sanitizeRichHtml(html: string): string {
  if (!html) return ''
  return sanitizeHtmlSSR(html)
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
