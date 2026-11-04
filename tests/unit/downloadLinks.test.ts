import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { patchFromChangelog, retailDownloadLinks } from '../../utils/downloadLinks'

describe('retailDownloadLinks', () => {
  it('uses the three real pages, CurseForge first', () => {
    assert.deepEqual(retailDownloadLinks('').map(l => l.href), [
      'https://www.curseforge.com/wow/addons/magguuui',
      'https://addons.wago.io/addons/5NR84pK3',
      'https://www.wowinterface.com/downloads/info27061',
    ])
  })
  it('follows the CurseForge setting', () => {
    assert.equal(retailDownloadLinks(' https://example.test/cf ')[0]!.href, 'https://example.test/cf')
  })
})

describe('patchFromChangelog', () => {
  it('reads the patch from the release notes', () => {
    assert.equal(patchFromChangelog('- Ready for WoW 12.1.5 (Interface 120105).'), 'WoW 12.1.5')
  })
  it('returns null without a patch', () => {
    assert.equal(patchFromChangelog('- Fixed a typo'), null)
    assert.equal(patchFromChangelog(null), null)
  })
})

describe('addonOneLiner', () => {
  it('drops the Optional prefix and keeps the first sentence', async () => {
    const { addonOneLiner } = await import('../../utils/addonChipMeta')
    assert.equal(addonOneLiner('Optional boss timers. MagguuUI applies its BigWigs profile when BigWigs is installed.'), 'Boss timers')
    assert.equal(addonOneLiner('Required. Install it from CurseForge, Wago, or WoWInterface. MagguuUI needs 9.0.6.'), 'Install it from CurseForge, Wago, or WoWInterface')
    assert.equal(addonOneLiner(null), '')
  })
})
