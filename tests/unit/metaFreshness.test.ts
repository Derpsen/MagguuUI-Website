import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { META_COPY } from '../../utils/metaCopy'

const freshnessSource = readFileSync(new URL('../../components/MetaFreshness.vue', import.meta.url), 'utf8')
const [template] = freshnessSource.split('<script')
const pages = {
  index: readFileSync(new URL('../../pages/meta/index.vue', import.meta.url), 'utf8'),
  classIndex: readFileSync(new URL('../../pages/meta/[classSlug]/index.vue', import.meta.url), 'utf8'),
  spec: readFileSync(new URL('../../pages/meta/[classSlug]/[specSlug].vue', import.meta.url), 'utf8'),
}

describe('MetaFreshness partial note SSR', () => {
  it('keeps the partial note in the SSR template when freshness.partial is set', () => {
    assert.ok(template, 'MetaFreshness must have a template block')
    assert.match(template, /v-if="freshness\?\.partial"/)
    assert.match(template, /role="note"/)
    assert.match(template, /\{\{\s*copy\.partialNote\s*\}\}/)
    assert.doesNotMatch(template, /ClientOnly|onMounted/)
    assert.equal(META_COPY.partialNote, 'Partial data.')
    assert.doesNotMatch(freshnessSource, /computed\(\s*\(\s*\)\s*=>\s*props\.freshness\s*\)/)
  })

  it('wires MetaFreshness into the SSR /meta pages', () => {
    for (const [name, source] of Object.entries(pages)) {
      assert.match(source, /<MetaFreshness/, `${name} must render MetaFreshness on the server`)
      assert.doesNotMatch(source.split('<script')[0] ?? '', /ClientOnly[\s\S]*MetaFreshness|MetaFreshness[\s\S]*ClientOnly/, `${name} must not wrap MetaFreshness in ClientOnly`)
    }
  })
})
