import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildAtom, buildRss, escapeXml, feedUpdated, type FeedEntry } from '../../server/utils/changelogFeed'

const entries: FeedEntry[] = [
  { id: 2, version: 'v12.1.8', content: '### Fixes\n\n- Handles <script>alert(1)</script> & "quotes"\n- Link [docs](https://example.com/?a=1&b=2)', publishedAt: new Date('2026-10-14T00:00:00Z') },
  { id: 1, version: 'v12.1.7', content: '- Older\u0007 note', publishedAt: 1760054400 },
]

test('escapeXml escapes markup and drops illegal control characters', () => {
  assert.equal(escapeXml(`<a href="x">Tom & 'Jerry'</a>`), '&lt;a href=&quot;x&quot;&gt;Tom &amp; &apos;Jerry&apos;&lt;/a&gt;')
  assert.equal(escapeXml('a\u0000b\u0007c\uFFFEd'), 'abcd')
  assert.equal(escapeXml('ok \uD83D\uDE00 emoji'), 'ok \uD83D\uDE00 emoji')
  assert.equal(escapeXml('lone \uD83D surrogate'), 'lone  surrogate')
})

test('RSS has channel metadata, self link and one item per entry', () => {
  const xml = buildRss(entries)
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>\n<rss version="2.0"/)
  assert.match(xml, /<atom:link href="https:\/\/ui\.magguu\.xyz\/changelog\/feed\.xml" rel="self" type="application\/rss\+xml" \/>/)
  assert.equal((xml.match(/<item>/g) ?? []).length, 2)
  assert.match(xml, /<title>MagguuUI v12\.1\.8<\/title>/)
  assert.match(xml, /<link>https:\/\/ui\.magguu\.xyz\/changelog#release-v12-1-8<\/link>/)
  assert.match(xml, /<guid isPermaLink="false">https:\/\/ui\.magguu\.xyz\/changelog#release-v12-1-8<\/guid>/)
  assert.match(xml, /<pubDate>Wed, 14 Oct 2026 00:00:00 GMT<\/pubDate>/)
  assert.match(xml, /<lastBuildDate>Wed, 14 Oct 2026 00:00:00 GMT<\/lastBuildDate>/)
})

test('feed bodies never contain raw script tags or control characters', () => {
  for (const xml of [buildRss(entries), buildAtom(entries)]) {
    assert.doesNotMatch(xml, /<script/i)
    assert.doesNotMatch(xml, /alert\(1\)<\/script/)
    // eslint-disable-next-line no-control-regex
    assert.doesNotMatch(xml, /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/)
    // HTML href has &amp;, which is escaped once more inside the XML text node
    assert.match(xml, /&amp;amp;b=2/)
  }
})

test('Atom has required elements and ISO dates', () => {
  const xml = buildAtom(entries)
  assert.match(xml, /<feed xmlns="http:\/\/www\.w3\.org\/2005\/Atom" xml:lang="en">/)
  assert.match(xml, /<id>https:\/\/ui\.magguu\.xyz\/changelog<\/id>/)
  assert.match(xml, /<link rel="self" type="application\/atom\+xml" href="https:\/\/ui\.magguu\.xyz\/changelog\/atom\.xml" \/>/)
  assert.match(xml, /<author><name>MagguuUI<\/name><\/author>/)
  assert.equal((xml.match(/<entry>/g) ?? []).length, 2)
  assert.match(xml, /<updated>2026-10-14T00:00:00\.000Z<\/updated>/)
  assert.match(xml, /<content type="html">/)
})

test('empty feeds are valid and use the epoch', () => {
  assert.equal(feedUpdated([]).getTime(), 0)
  assert.doesNotMatch(buildRss([]), /<item>/)
  assert.doesNotMatch(buildAtom([]), /<entry>/)
})
