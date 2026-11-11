import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const guide = readFileSync(new URL('../../pages/guide.vue', import.meta.url), 'utf8')
const nuxt = readFileSync(new URL('../../nuxt.config.ts', import.meta.url), 'utf8')

describe('TipTap loads on /guide only after Edit Page', () => {
  it('does not put LazyTipTapEditor in the public page tree', () => {
    assert.equal(guide.includes('LazyTipTapEditor'), false)
    assert.match(guide, /async function startEdit/)
    assert.match(guide, /import\('~\/components\/TipTapEditor\.vue'\)/)
    assert.match(guide, /@click="startEdit"/)
  })

  it('keeps the manifest hook from prefetching TipTap on public pages', () => {
    assert.match(nuxt, /components\\\/TipTapEditor\\.vue/)
    assert.match(nuxt, /@tiptap/)
    assert.match(nuxt, /prosemirror-/)
    assert.match(nuxt, /chunk\.dynamicImports = chunk\.dynamicImports\.filter\(dep => !adminOnly\.has\(dep\)\)/)
  })
})
