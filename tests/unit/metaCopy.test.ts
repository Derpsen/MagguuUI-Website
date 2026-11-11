import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { archonSpecUrl, metaClassPath, metaSpecPath, murlokSpecUrl, META_CLASSES, toMetaSlug } from '../../utils/metaCatalog'
import { META_COPY, META_COPY_DE, META_COPY_EN } from '../../utils/metaCopy'
import { META_MIN_BUILD_SAMPLE, META_MIN_ITEM_SAMPLE, META_MIN_SHOW_SAMPLE } from '../../utils/metaTypes'

const TRADEMARK = /\b(?:WoW|World of Warcraft)\b/i

describe('meta copy and paths', () => {
  it('uses English as the default and keeps the German attribution ready', () => {
    assert.equal(META_COPY, META_COPY_EN)
    assert.match(META_COPY.attribution, /Data provided by Blizzard.s Battle.net API/)
    assert.match(META_COPY_DE.attribution, /Daten bereitgestellt von der Battle.net-API/)
    assert.equal(META_COPY.indexTitle, 'Mythic+ Meta')
    assert.match(META_COPY.empty, /Collecting data/)
    assert.equal(META_COPY.specTitle('Mage', 'Fire'), 'Fire Mage – Mythic+ Builds')
  })

  it('keeps titles and our URLs free of Blizzard product trademarks', () => {
    const titles = [
      META_COPY.indexTitle,
      META_COPY.classTitle('Mage'),
      META_COPY.specTitle('Mage', 'Fire'),
      META_COPY_DE.indexTitle,
      META_COPY_DE.classTitle('Magier'),
    ]
    for (const title of titles) assert.doesNotMatch(title, TRADEMARK, title)
    for (const cls of META_CLASSES) {
      const classPath = metaClassPath(cls.slug)
      assert.ok(classPath.startsWith('/meta/'))
      assert.doesNotMatch(classPath, TRADEMARK)
      assert.doesNotMatch(cls.slug, TRADEMARK)
      for (const spec of cls.specs) {
        const specPath = metaSpecPath(cls.slug, spec.slug)
        assert.doesNotMatch(specPath, TRADEMARK)
        assert.equal(toMetaSlug(spec.name), spec.slug)
      }
    }
  })

  it('builds outbound murlok and Archon links without fetching them', () => {
    assert.equal(murlokSpecUrl('mage', 'fire'), 'https://murlok.io/mage/fire')
    assert.equal(archonSpecUrl('mage', 'fire'), 'https://www.archon.gg/wow/builds/mage/fire/mythic-plus')
  })

  it('does not mention World of Warcraft or WoW in Meta page source titles or paths', () => {
    const root = fileURLToPath(new URL('../../', import.meta.url))
    for (const rel of ['pages/meta/index.vue', 'pages/meta/[classSlug]/index.vue', 'pages/meta/[classSlug]/[specSlug].vue']) {
      const src = readFileSync(new URL(rel, `file://${root}`), 'utf8')
      // Our title/path strings; Archon hrefs may contain /wow/ because that is their URL.
      const withoutOutbound = src.replace(/https:\/\/(www\.)?(murlok\.io|archon\.gg)[^"'`\s]*/g, '')
      assert.doesNotMatch(withoutOutbound, TRADEMARK, rel)
    }
  })
})

describe('methodology thresholds', () => {
  it('uses the same sample constants as the snapshot schema', () => {
    assert.match(META_COPY.minSample, new RegExp(`${META_MIN_BUILD_SAMPLE} sampled players`))
    assert.match(META_COPY.minSample, new RegExp(`Below ${META_MIN_SHOW_SAMPLE}`))
    assert.match(META_COPY.minSample, new RegExp(`below ${META_MIN_ITEM_SAMPLE} samples`))
    assert.match(META_COPY.faqSampleA, new RegExp(`minimum sample of ${META_MIN_BUILD_SAMPLE} characters`))
    assert.doesNotMatch(META_COPY.faqSampleA, /minimum sample of 20 characters/)
  })
})
