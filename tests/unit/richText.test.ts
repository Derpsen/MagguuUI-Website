import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { displayRichText, renderMarkdownToSafeHtml, sanitizeRichHtml } from '../../utils/richText'

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

  it('renders leftover CMS markdown as HTML', () => {
    const html = displayRichText('Install **EllesmereUI** and open `/mui`.')

    assert.match(html, /<strong>EllesmereUI<\/strong>/)
    assert.match(html, /<code>\/mui<\/code>/)
    assert.doesNotMatch(html, /\*\*/)
  })

  it('leaves TipTap HTML as HTML', () => {
    const html = displayRichText('<p>Install <strong>EllesmereUI</strong> and open <code>/mui</code>.</p>')

    assert.match(html, /<strong>EllesmereUI<\/strong>/)
    assert.match(html, /<code>\/mui<\/code>/)
  })
})
