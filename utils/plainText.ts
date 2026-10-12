import sanitize from 'sanitize-html'

/**
 * Strip all HTML tags with a real parser (sanitize-html/htmlparser2) instead
 * of a regex, so fragments like `<scr<script>ipt>` cannot survive.
 * sanitize-html re-escapes text; decode those escapes again (`&amp;` last)
 * so callers get plain text for inputs/text bindings.
 */
export function stripHtml(value: string): string {
  if (!value) return ''
  return sanitize(value, { allowedTags: [], allowedAttributes: {}, disallowedTagsMode: 'discard' })
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .trim()
}
