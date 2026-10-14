import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isPrivateRepoUrl, MAGGUUUI_CURSEFORGE_URL, rewritePrivateRepoLinks } from '../../utils/privateRepoLinks'
import { DEFAULT_SITE_CONTENT, DEFAULT_FAQS } from '../../server/database/defaultContent'
import { SITE_SETTINGS_DEFAULTS } from '../../utils/siteSettingsDefaults'

describe('private MagguuUI repo links', () => {
  it('rewrites the old guide step to the public stores', () => {
    const old = 'Download **MagguuUI** from CurseForge, Wago, WoWInterface, or the latest [GitHub release](https://github.com/Derpsen/MagguuUI/releases/latest). Leave it enabled next to EllesmereUI.'
    const out = rewritePrivateRepoLinks(old)
    assert.equal(out, 'Download **MagguuUI** from CurseForge, Wago, or WoWInterface. Leave it enabled next to EllesmereUI.')
    assert.equal(rewritePrivateRepoLinks(out), out)
  })

  it('maps repo, releases, issues and changelog; leaves other repos', () => {
    assert.equal(rewritePrivateRepoLinks('[x](https://github.com/Derpsen/MagguuUI)'), `[x](${MAGGUUUI_CURSEFORGE_URL})`)
    assert.equal(rewritePrivateRepoLinks('https://github.com/Derpsen/MagguuUI/releases/tag/v12.1.7'), MAGGUUUI_CURSEFORGE_URL)
    assert.equal(rewritePrivateRepoLinks('see https://github.com/Derpsen/MagguuUI/issues/12 now'), 'see /about#contact now')
    assert.equal(rewritePrivateRepoLinks('https://github.com/Derpsen/MagguuUI/blob/main/CHANGELOG.md'), '/changelog')
    const other = 'https://github.com/Derpsen/MagguuUI-Website/issues'
    assert.equal(rewritePrivateRepoLinks(other), other)
    assert.equal(isPrivateRepoUrl('https://github.com/Derpsen/MagguuUI/'), true)
    assert.equal(isPrivateRepoUrl(other), false)
  })

  it('no seed, FAQ default or setting default points at the private repo', () => {
    const all = JSON.stringify([DEFAULT_SITE_CONTENT, DEFAULT_FAQS, SITE_SETTINGS_DEFAULTS])
    assert.doesNotMatch(all, /github\.com\/Derpsen\/MagguuUI(?![\w-])/)
  })
})
