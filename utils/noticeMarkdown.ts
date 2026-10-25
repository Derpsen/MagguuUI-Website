import { Marked } from 'marked'
import sanitize from 'sanitize-html'

/**
 * Limited Markdown for status notices (admin-written, shown on the public /status page).
 * Stricter than `renderMarkdownToSafeHtml`: raw HTML is shown as text (never parsed), no
 * images, no headings, no tables. Allowed: paragraphs, line breaks, bold, italic, strike,
 * inline code, code blocks, lists, block quotes and http(s)/mailto links. Links always get
 * `rel="noopener noreferrer nofollow"` and open in a new tab; nothing else can carry attributes.
 * Runs identically on server and client (same output, hydration safe).
 */

const escapeHtml = (s: string) => s
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

// A private instance: the shared `marked` used by the changelog is never reconfigured.
const noticeMarked = new Marked({
  async: false,
  gfm: true,
  breaks: true,
  renderer: {
    html: ({ text }) => escapeHtml(text),
    image: ({ text }) => escapeHtml(text),
  },
})

const OPTIONS: sanitize.IOptions = {
  allowedTags: ['p', 'br', 'strong', 'em', 'del', 'code', 'pre', 'ul', 'ol', 'li', 'blockquote', 'a'],
  allowedAttributes: { a: ['href', 'rel', 'target'] },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
  transformTags: {
    a: sanitize.simpleTransform('a', { rel: 'noopener noreferrer nofollow', target: '_blank' }),
    // Headings are not part of a notice; they read as plain paragraphs.
    h1: 'p', h2: 'p', h3: 'p', h4: 'p', h5: 'p', h6: 'p',
  },
}

/** Source is capped before parsing, so a huge body can never cost CPU. */
export const NOTICE_MARKDOWN_MAX_INPUT = 5000

export function renderNoticeMarkdown(markdown: string): string {
  if (typeof markdown !== 'string' || !markdown.trim()) return ''
  const source = markdown.slice(0, NOTICE_MARKDOWN_MAX_INPUT)
  let html: string
  try {
    html = noticeMarked.parse(source) as string
  } catch {
    html = `<p>${escapeHtml(source)}</p>`
  }
  // A link whose URL was rejected (javascript:, //host, ...) keeps its text but is no longer a link.
  return sanitize(html, OPTIONS)
    .replace(/<a rel="noopener noreferrer nofollow" target="_blank">([\s\S]*?)<\/a>/g, '$1')
    .trim()
}
