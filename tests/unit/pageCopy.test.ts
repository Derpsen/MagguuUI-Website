import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ABOUT_DEFAULTS, IMPRINT_DEFAULTS, isHtmlCopyKey, mergePageCopy, PRIVACY_DEFAULTS } from '../../utils/pageCopyDefaults'
import { isPublicContentWrite } from '../../server/utils/publicCache'

describe('editable page copy', () => {
  it('falls back to defaults for missing or blank values', () => {
    const merged = mergePageCopy(IMPRINT_DEFAULTS, { operator: { text: '  ' }, disclaimer: { label: 'Note' } })
    assert.equal(merged.operator!.text, 'MagguuUI is a free, non-commercial project operated from Switzerland.')
    assert.equal(merged.disclaimer!.label, 'Note')
    assert.equal(merged.contact!.label, 'Contact')
  })

  it('keeps current copy facts in the defaults', () => {
    const about = JSON.stringify(ABOUT_DEFAULTS)
    assert.match(about, /Apply Magguu profiles/)
    assert.match(about, /Whisper Messenger/)
    assert.doesNotMatch(about, /\bWIM\b/)
    assert.equal(Object.keys(PRIVACY_DEFAULTS).filter(k => /^s\d$/.test(k)).length, 7)
  })

  it('treats body and step fields as HTML', () => {
    assert.equal(isHtmlCopyKey('body'), true)
    assert.equal(isHtmlCopyKey('step_2'), true)
    assert.equal(isHtmlCopyKey('title'), false)
  })
})

describe('public route cache invalidation scope', () => {
  it('matches successful admin/sync/webhook writes only', () => {
    assert.equal(isPublicContentWrite('POST', '/api/v1/admin/content/bulk'), true)
    assert.equal(isPublicContentWrite('patch', '/api/v1/admin/addons/3?x=1'), true)
    assert.equal(isPublicContentWrite('POST', '/api/v1/webhooks/github'), true)
    assert.equal(isPublicContentWrite('GET', '/api/v1/admin/content/home'), false)
    assert.equal(isPublicContentWrite('POST', '/api/v1/auth/login'), false)
    assert.equal(isPublicContentWrite('POST', '/api/v1/copy-event'), false)
  })
})

describe('browser cache header for SWR pages', () => {
  it('rewrites the Nitro swr headers only', async () => {
    const { browserCacheControl, BROWSER_REVALIDATE_CACHE_CONTROL } = await import('../../server/utils/publicCache')
    assert.equal(browserCacheControl('s-maxage=120, stale-while-revalidate'), BROWSER_REVALIDATE_CACHE_CONTROL)
    assert.equal(browserCacheControl('public, max-age=120, s-maxage=120'), BROWSER_REVALIDATE_CACHE_CONTROL)
    assert.equal(browserCacheControl('private, no-store, no-cache, must-revalidate'), 'private, no-store, no-cache, must-revalidate')
    assert.equal(browserCacheControl('public, max-age=31536000, immutable'), 'public, max-age=31536000, immutable')
  })
})
