import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { renderMarkdownToSafeHtml, sanitizeRichHtml } from '../../utils/richText'

describe('rich text sanitization', () => {
  it('keeps the supported editorial markup', () => {
    const html = sanitizeRichHtml(
      '<p><strong>Safe</strong> <a href="https://example.com">link</a></p>',
    )

    assert.match(html, /<strong>Safe<\/strong>/)
    assert.match(html, /href="https:\/\/example\.com"/)
  })

  it('removes scripts, event handlers, and unsafe URL schemes', () => {
    const html = sanitizeRichHtml(
      '<script>alert(1)</script><img src="javascript:alert(1)" onerror="alert(2)"><p>Kept</p>',
    )

    assert.doesNotMatch(html, /script|javascript:|onerror/i)
    assert.match(html, /<p>Kept<\/p>/)
  })

  it('renders markdown before applying the same sanitizer', () => {
    const html = renderMarkdownToSafeHtml('**Bold**\n\n[Link](https://example.com)')

    assert.match(html, /<strong>Bold<\/strong>/)
    assert.match(html, /href="https:\/\/example\.com"/)
  })
})
