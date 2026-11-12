import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const xml = readFileSync(fileURLToPath(new URL('../../unraid/magguuui-website.xml', import.meta.url)), 'utf8')

describe('Unraid MagguuUI template matches the live 1 GB container', () => {
  it('sets --memory=1g and --memory-swap=-1 in ExtraParams (live MemorySwap is -1, intentional)', () => {
    const extra = xml.match(/<ExtraParams>([^<]*)<\/ExtraParams>/)
    assert.ok(extra, 'ExtraParams missing')
    assert.match(extra[1]!, /--restart=unless-stopped/)
    assert.match(extra[1]!, /--memory=1g/)
    assert.match(extra[1]!, /--memory-swap=-1/)
  })

  it('ships NODE_OPTIONS with the 640 MB website old-space cap', () => {
    const config = xml.match(/<Config Name="NODE_OPTIONS"[^>]*>[^<]*<\/Config>/)
    assert.ok(config, 'NODE_OPTIONS Config missing')
    assert.match(config[0], /Default="--enable-source-maps --max-old-space-size=640"/)
    assert.match(config[0], />--enable-source-maps --max-old-space-size=640<\/Config>/)
    assert.doesNotMatch(config[0], /768/)
    assert.doesNotMatch(config[0], /max-old-space-size=(?!640)\d+/)
  })
})
