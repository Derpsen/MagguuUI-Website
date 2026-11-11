import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { applyAdminManifestPolicy, isAdminKey, type ViteManifest } from '../../utils/adminManifest'

const guide = readFileSync(new URL('../../pages/guide.vue', import.meta.url), 'utf8')
const nuxt = readFileSync(new URL('../../nuxt.config.ts', import.meta.url), 'utf8')

describe('TipTap loads on /guide only after Edit Page', () => {
  it('does not put LazyTipTapEditor in the public page tree', () => {
    assert.equal(guide.includes('LazyTipTapEditor'), false)
    assert.match(guide, /async function startEdit/)
    assert.match(guide, /import\('~\/components\/TipTapEditor\.vue'\)/)
    assert.match(guide, /@click="startEdit"/)
  })

  it('shows a loading state, toasts on failure, and resets the cached import so retry works', () => {
    assert.match(guide, /editorLoading/)
    assert.match(guide, /Could not load the editor/)
    assert.match(guide, /editorImport = null/)
    assert.match(guide, /:disabled="editorLoading"/)
  })

  it('wires the manifest hook through applyAdminManifestPolicy', () => {
    assert.match(nuxt, /applyAdminManifestPolicy\(manifest\)/)
  })
})

describe('Vite 8 / Rolldown TipTap chunks are admin-only', () => {
  it('matches a hashed key with name TipTapEditor and no src, including CSS names', () => {
    const chunk = {
      file: '_D5hSvx60.js',
      name: 'TipTapEditor',
      css: ['TipTapEditor.DmH-YB2q.css'],
    }
    assert.equal(isAdminKey('_D5hSvx60.js', chunk), true)
    assert.equal(isAdminKey('TipTapEditor.DmH-YB2q.css', { file: 'TipTapEditor.DmH-YB2q.css' }), true)
    assert.equal(isAdminKey('pages/guide.vue', { src: 'pages/guide.vue', file: 'guide.abc.js', name: 'guide' }), false)
  })

  it('turns off prefetch/preload and strips the chunk from pages/guide.vue dynamicImports', () => {
    const manifest: ViteManifest = {
      '_D5hSvx60.js': {
        file: '_D5hSvx60.js',
        name: 'TipTapEditor',
        css: ['TipTapEditor.DmH-YB2q.css'],
        prefetch: true,
        preload: true,
      },
      'TipTapEditor.DmH-YB2q.css': {
        file: 'TipTapEditor.DmH-YB2q.css',
        name: 'TipTapEditor',
        prefetch: true,
        preload: true,
      },
      'pages/guide.vue': {
        file: 'guide.abc.js',
        src: 'pages/guide.vue',
        name: 'guide',
        dynamicImports: ['_D5hSvx60.js'],
        prefetch: true,
        preload: true,
      },
    }
    applyAdminManifestPolicy(manifest)
    assert.equal(manifest['_D5hSvx60.js']?.prefetch, false)
    assert.equal(manifest['_D5hSvx60.js']?.preload, false)
    assert.equal(manifest['TipTapEditor.DmH-YB2q.css']?.prefetch, false)
    assert.equal(manifest['TipTapEditor.DmH-YB2q.css']?.preload, false)
    assert.deepEqual(manifest['pages/guide.vue']?.dynamicImports, [])
  })
})
