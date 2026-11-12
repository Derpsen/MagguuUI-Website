import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  META_SYNC_CLI_DEFAULT_HEAP_MB,
  parseMetaSyncCliHeapMb,
  resolveMetaSyncCliNodeOptions,
  stripMaxOldSpaceSize,
} from '../../server/utils/metaSyncCliHeap'

describe('meta sync CLI heap options', () => {
  it('strips an inherited website --max-old-space-size and applies the CLI cap', () => {
    assert.equal(stripMaxOldSpaceSize('--enable-source-maps --max-old-space-size=640'), '--enable-source-maps')
    const resolved = resolveMetaSyncCliNodeOptions({
      NODE_OPTIONS: '--enable-source-maps --max-old-space-size=640',
    })
    assert.match(resolved, /--enable-source-maps/)
    assert.match(resolved, new RegExp(`--max-old-space-size=${META_SYNC_CLI_DEFAULT_HEAP_MB}\\b`))
    assert.doesNotMatch(resolved, /--max-old-space-size=640/)
  })

  it('falls back to 256 MB when the env is missing or invalid', () => {
    assert.equal(parseMetaSyncCliHeapMb({}), 256)
    assert.equal(parseMetaSyncCliHeapMb({ NUXT_META_CLI_HEAP_MB: 'nope' }), 256)
    assert.equal(parseMetaSyncCliHeapMb({ NUXT_META_CLI_HEAP_MB: '32' }), 256)
    assert.equal(parseMetaSyncCliHeapMb({ NUXT_META_CLI_HEAP_MB: '192' }), 192)
  })
})
