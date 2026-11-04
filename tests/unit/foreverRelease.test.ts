import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { toForeverRelease } from '../../utils/foreverRelease'

const RAW = {
  tag_name: 'v1.0.0',
  name: 'MagguuUI x Forever 1.0.0',
  published_at: '2026-11-05T10:00:00Z',
  html_url: 'https://github.com/Derpsen/MagguuUI-Forever/releases/tag/v1.0.0',
  draft: false,
  prerelease: false,
  assets: [
    { name: 'MagguuUI-Forever-1.0.0.zip', browser_download_url: 'https://github.com/Derpsen/MagguuUI-Forever/releases/download/v1.0.0/x.zip', size: 1234 },
    { name: 'evil.zip', browser_download_url: 'https://evil.example/x.zip', size: 1 },
  ],
}

describe('toForeverRelease', () => {
  it('returns null for missing, empty or unpublished releases (Coming soon)', () => {
    assert.equal(toForeverRelease(null, true), null)
    assert.equal(toForeverRelease('x', true), null)
    assert.equal(toForeverRelease({ message: 'Not Found' }, true), null)
    assert.equal(toForeverRelease({ ...RAW, tag_name: '  ' }, true), null)
    assert.equal(toForeverRelease({ ...RAW, draft: true }, true), null)
    assert.equal(toForeverRelease({ ...RAW, prerelease: true }, true), null)
  })
  it('maps a public release with GitHub-only download links', () => {
    const r = toForeverRelease(RAW, true)
    assert.ok(r)
    assert.equal(r.version, 'v1.0.0')
    assert.equal(r.name, 'MagguuUI x Forever 1.0.0')
    assert.equal(r.publishedAt, '2026-11-05T10:00:00Z')
    assert.equal(r.url, RAW.html_url)
    assert.deepEqual(r.assets.map(a => a.name), ['MagguuUI-Forever-1.0.0.zip'])
    assert.equal(r.assets[0]!.size, 1234)
  })
  it('hides links of a private repo but keeps the version', () => {
    const r = toForeverRelease(RAW, false)
    assert.ok(r)
    assert.equal(r.version, 'v1.0.0')
    assert.equal(r.url, null)
    assert.deepEqual(r.assets, [])
  })
  it('falls back on the tag and drops bad dates', () => {
    const r = toForeverRelease({ tag_name: 'v0.1', published_at: 'nope', html_url: 'http://github.com/x' }, true)
    assert.ok(r)
    assert.equal(r.name, 'v0.1')
    assert.equal(r.publishedAt, null)
    assert.equal(r.url, null)
  })
})
