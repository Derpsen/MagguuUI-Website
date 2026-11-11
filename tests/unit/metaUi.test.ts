import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  blizzardIconUrl,
  isNuxtAdsEnabled,
  parseHeroQuery,
  parseMetaIndexQuery,
} from '../../utils/metaUiCopy'

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
})
