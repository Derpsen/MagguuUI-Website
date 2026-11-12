import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  blizzardIconUrl,
  isNuxtAdsEnabled,
  resolveNuxtAdsFlag,
  parseHeroQuery,
  parseMetaIndexQuery,
} from '../../utils/metaUiCopy'
import { existsSync, readFileSync } from 'node:fs'

describe('meta UI helpers', () => {
  it('parses index filters and drops unknown values to defaults', () => {
    assert.deepEqual(parseMetaIndexQuery({}), { role: 'all', by: 'spec' })
    assert.deepEqual(parseMetaIndexQuery({ role: 'Healer', by: 'class' }), { role: 'healer', by: 'class' })
    assert.deepEqual(parseMetaIndexQuery({ role: ['dps'], by: ['nope'] }), { role: 'dps', by: 'spec' })
    assert.deepEqual(parseMetaIndexQuery({ role: 'tank' }), { role: 'tank', by: 'spec' })
  })

  it('parses a hero-tree query only when the id is in the snapshot', () => {
    assert.equal(parseHeroQuery({ hero: '800' }, [800, 801]), 800)
    assert.equal(parseHeroQuery({ hero: ['801'] }, [800, 801]), 801)
    assert.equal(parseHeroQuery({ hero: '9' }, [800, 801]), null)
    assert.equal(parseHeroQuery({}, [800]), null)
  })

  it('builds a Blizzard render URL from an icon filename and rejects other hosts', () => {
    assert.equal(blizzardIconUrl('inv_helm_cinders'), 'https://render.worldofwarcraft.com/icons/56/inv_helm_cinders.jpg')
    assert.equal(blizzardIconUrl('inv_helm_cinders.jpg'), 'https://render.worldofwarcraft.com/icons/56/inv_helm_cinders.jpg')
    assert.equal(blizzardIconUrl('https://render.worldofwarcraft.com/icons/56/inv_helm_cinders.jpg'), 'https://render.worldofwarcraft.com/icons/56/inv_helm_cinders.jpg')
    assert.equal(blizzardIconUrl('https://example.com/x.jpg'), null)
    assert.equal(blizzardIconUrl('../etc/passwd'), null)
    assert.equal(blizzardIconUrl(null), null)
  })

  it('treats NUXT_ADS as off unless an explicit on-value is set', () => {
    assert.equal(isNuxtAdsEnabled(undefined), false)
    assert.equal(isNuxtAdsEnabled(''), false)
    assert.equal(isNuxtAdsEnabled('false'), false)
    assert.equal(isNuxtAdsEnabled('off'), false)
    assert.equal(isNuxtAdsEnabled('on'), true)
    assert.equal(isNuxtAdsEnabled('TRUE'), true)
    assert.equal(isNuxtAdsEnabled('1'), true)
    assert.equal(isNuxtAdsEnabled('yes'), true)
  })

  it('resolves NUXT_ADS at runtime without mutating a config object', () => {
    assert.equal(resolveNuxtAdsFlag({}), '')
    assert.equal(isNuxtAdsEnabled(resolveNuxtAdsFlag({})), false)
    assert.equal(resolveNuxtAdsFlag({ NUXT_ADS: '' }), '')
    assert.equal(isNuxtAdsEnabled(resolveNuxtAdsFlag({ NUXT_ADS: '' })), false)
    assert.equal(isNuxtAdsEnabled(resolveNuxtAdsFlag({ NUXT_ADS: '   ' })), false)
    assert.equal(resolveNuxtAdsFlag({ NUXT_ADS: 'on' }), 'on')
    assert.equal(isNuxtAdsEnabled(resolveNuxtAdsFlag({ NUXT_ADS: 'on' })), true)
    assert.equal(resolveNuxtAdsFlag({ NUXT_ADS: 'off', NUXT_PUBLIC_ADS: 'on' }), 'off')
    assert.equal(isNuxtAdsEnabled(resolveNuxtAdsFlag({ NUXT_ADS: 'off', NUXT_PUBLIC_ADS: 'on' })), false)
    assert.equal(resolveNuxtAdsFlag({ NUXT_PUBLIC_ADS: 'yes' }), 'yes')
    const plugin = readFileSync(new URL('../../plugins/nuxt-ads.ts', import.meta.url), 'utf8')
    assert.match(plugin, /resolveNuxtAdsFlag\(process\.env\)/)
    assert.doesNotMatch(plugin, /useRuntimeConfig/)
    const config = readFileSync(new URL('../../nuxt.config.ts', import.meta.url), 'utf8')
    assert.match(config, /ads: '',/)
    assert.doesNotMatch(config, /ads: process\.env\.NUXT_ADS/)
    assert.doesNotMatch(config, /runtime-ads/)
    assert.equal(existsSync(new URL('../../server/plugins/runtime-ads.ts', import.meta.url)), false)
  })
})
