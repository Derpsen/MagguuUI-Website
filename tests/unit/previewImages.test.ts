import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PREVIEW_EXTENSIONS, PREVIEW_HEIGHT, PREVIEW_WIDTH, isPreviewFileName, previewSlug, resolvePreviewImage } from '../../utils/previewImages'
import { PROFILE_KEY_BY_SLUG } from '../../utils/addonChipMeta'
import { buildProfilePreviews } from '../../server/utils/profilePreviews'
import { candidatePreviewDirs, listPreviewFiles, readPreviewFiles, PREVIEW_FILES_CACHE_MS } from '../../server/utils/previewFiles'

describe('previewSlug', () => {
  it('lower-cases and kebab-cases', () => {
    assert.equal(previewSlug('Northern Sky Raid Tools'), 'northern-sky-raid-tools')
    assert.equal(previewSlug('  Whisper_Messenger  '), 'whisper-messenger')
    assert.equal(previewSlug('Café UI'), 'cafe-ui')
    assert.equal(previewSlug('ellesmereui'), 'ellesmereui')
  })
  it('returns an empty string for unusable input', () => {
    assert.equal(previewSlug(''), '')
    assert.equal(previewSlug('---'), '')
    assert.equal(previewSlug('../../etc'), 'etc')
  })
})

describe('isPreviewFileName', () => {
  it('accepts safe names with a known extension only', () => {
    for (const ok of ['bigwigs.webp', 'northern-sky-raid-tools.PNG', 'a1.jpeg', 'x.avif']) assert.equal(isPreviewFileName(ok), true, ok)
    for (const bad of ['.gitkeep', 'README.md', 'a.svg', '../a.webp', 'a/b.webp', '-a.webp', 'a b.webp', 'a.webp.exe', '']) assert.equal(isPreviewFileName(bad), false, bad)
  })
})

describe('resolvePreviewImage', () => {
  it('returns the public path with the fixed 16:10 frame size', () => {
    assert.deepEqual(resolvePreviewImage('bigwigs', ['bigwigs.webp']), { src: '/previews/bigwigs.webp', width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT })
    assert.equal(PREVIEW_WIDTH / PREVIEW_HEIGHT, 1.6)
  })
  it('falls back to null (placeholder) when no file matches', () => {
    assert.equal(resolvePreviewImage('bigwigs', []), null)
    assert.equal(resolvePreviewImage('bigwigs', ['littlewigs.webp', 'bigwigs-old.webp', 'bigwigs.svg']), null)
    assert.equal(resolvePreviewImage('', ['.webp']), null)
  })
  it('prefers webp over avif over png over jpg regardless of listing order', () => {
    assert.deepEqual(PREVIEW_EXTENSIONS, ['webp', 'avif', 'png', 'jpg', 'jpeg'])
    assert.equal(resolvePreviewImage('gtfo', ['gtfo.jpg', 'gtfo.png', 'gtfo.avif', 'gtfo.webp'])!.src, '/previews/gtfo.webp')
    assert.equal(resolvePreviewImage('gtfo', ['gtfo.jpeg', 'gtfo.jpg'])!.src, '/previews/gtfo.jpg')
    assert.equal(resolvePreviewImage('gtfo', ['gtfo.png', 'gtfo.avif'])!.src, '/previews/gtfo.avif')
  })
  it('matches case-insensitively and keeps the real file name', () => {
    assert.equal(resolvePreviewImage('bigwigs', ['BigWigs.WEBP'])!.src, '/previews/BigWigs.WEBP')
  })
  it('never builds a path from an unsafe file name', () => {
    assert.equal(resolvePreviewImage('a', ['../a.webp', 'x/a.webp']), null)
  })
})

describe('preview files on disk', () => {
  it('lists only safe preview files from the first existing directory', () => {
    const root = mkdtempSync(join(tmpdir(), 'previews-'))
    try {
      const dir = join(root, 'previews')
      mkdirSync(dir)
      for (const f of ['bigwigs.webp', 'gtfo.PNG', 'README.md', '.gitkeep', 'notes.txt']) writeFileSync(join(dir, f), 'x')
      assert.deepEqual(readPreviewFiles([join(root, 'missing'), dir]), ['bigwigs.webp', 'gtfo.PNG'])
      assert.deepEqual(readPreviewFiles([join(root, 'missing')]), [])
    } finally { rmSync(root, { recursive: true, force: true }) }
  })
  it('looks next to the built server first and in public/ of the working directory last', () => {
    const dirs = candidatePreviewDirs('/app', 'file:///app/.output/server/index.mjs')
    assert.equal(dirs[0], '/app/.output/public/previews')
    assert.equal(dirs.at(-1), '/app/public/previews')
  })
  it('caches in production for a few seconds and never in dev', () => {
    const first = listPreviewFiles(false, 1_000)
    assert.equal(listPreviewFiles(false, 1_000 + PREVIEW_FILES_CACHE_MS - 1), first)
    assert.notEqual(listPreviewFiles(false, 1_000 + PREVIEW_FILES_CACHE_MS + 1), first)
    const dev = listPreviewFiles(true)
    assert.notEqual(listPreviewFiles(true), dev)
  })
})

describe('buildProfilePreviews', () => {
  const addons = [
    { slug: 'bigwigs', name: 'BigWigs', category: 'core', description: 'Boss timers', sortOrder: 1 },
    { slug: 'ellesmereui', name: 'EllesmereUI', category: 'required', description: 'Required', sortOrder: 0 },
    { slug: 'northern-sky-raid-tools', name: 'Northern Sky Raid Tools', category: 'optional', description: null, sortOrder: 0 },
    { slug: 'littlewigs', name: 'LittleWigs', category: 'optional', description: 'No profile', sortOrder: 1 },
    { slug: 'gtfo', name: 'GTFO', category: 'optional', description: 'Hidden profile', sortOrder: 5 },
  ]
  const profiles = { EllesmereUI: ['Default'], BigWigs: ['Boss Options', 'Default'], NorthernSkyRaidTools: ['Default', 'Default'] }

  it('uses real profile names, orders required → core → optional and skips addons without a visible profile', () => {
    const items = buildProfilePreviews(addons, profiles, [])
    assert.deepEqual(items.map(i => i.slug), ['ellesmereui', 'bigwigs', 'northern-sky-raid-tools'])
    assert.deepEqual(items[1]!.profiles, ['Default', 'Boss Options'])
    assert.deepEqual(items[2]!.profiles, ['Default'])
    assert.equal(items[2]!.description, '')
    assert.equal(items[1]!.stringsHref, '/strings?addon=BigWigs')
  })
  it('attaches an image only for slugs with a file and leaves the rest as placeholders', () => {
    const items = buildProfilePreviews(addons, profiles, ['bigwigs.webp', 'littlewigs.webp'])
    assert.equal(items.find(i => i.slug === 'bigwigs')!.image!.src, '/previews/bigwigs.webp')
    assert.equal(items.find(i => i.slug === 'ellesmereui')!.image, null)
    assert.equal(items.some(i => i.slug === 'littlewigs'), false)
  })
  it('treats an unknown category as optional', () => {
    const [item] = buildProfilePreviews([{ slug: 'gtfo', name: 'GTFO', category: 'weird', description: 'x', sortOrder: 0 }], { GTFO: ['Default'] }, [])
    assert.equal(item!.category, 'optional')
  })
})

describe('docs/preview-images.md', () => {
  it('lists every addon slug that has a profile', () => {
    const doc = readFileSync(new URL('../../docs/preview-images.md', import.meta.url), 'utf8')
    for (const slug of Object.keys(PROFILE_KEY_BY_SLUG)) {
      assert.ok(doc.includes(`public/previews/`) && doc.includes(`\`${slug}.webp\``), `docs/preview-images.md is missing ${slug}`)
    }
  })
})
