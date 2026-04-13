import { marked } from 'marked'
import sanitize from 'sanitize-html'

// Allowlist-based sanitizer — works identically on server and client,
// producing byte-identical output for hydration safety.
// Content here is admin-authored markdown, not arbitrary user input.
const SANITIZE_OPTIONS: sanitize.IOptions = {
  allowedTags: sanitize.defaults.allowedTags.concat(['img', 'details', 'summary', 'kbd', 'mark', 'del', 'ins', 'sup', 'sub']),
  allowedAttributes: {
    ...sanitize.defaults.allowedAttributes,
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    a: ['href', 'title', 'target', 'rel'],
    code: ['class'],
    span: ['class'],
    div: ['class'],
    pre: ['class'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  disallowedTagsMode: 'discard',
}

export interface MarkdownRenderOptions {
  breaks?: boolean
  stripChangelogDateHeaders?: boolean
}

export function sanitizeRichHtml(html: string): string {
  if (!html) return ''
  return sanitize(html, SANITIZE_OPTIONS)
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
