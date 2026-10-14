import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildSearchIndex } from '../../server/utils/searchIndex'

describe('public search index', () => {
  it('covers guide steps, FAQ and strings with deep links', () => {
    const index = buildSearchIndex({
      guideSteps: { step_2_title: '2. Install MagguuUI', step_2: 'Download **MagguuUI**', step_1_title: '1. Install EllesmereUI', step_1: 'x' },
      faqs: [{ id: 1, question: 'What is MagguuUI?', answer: 'A **native** overhaul.' }],
      profiles: [{ id: 7, addon: 'BigWigs', profile: 'Magguu' }],
      layouts: [{ id: 3, className: 'Mage', spec: 'Frost' }, { id: 4, className: null, spec: null }],
      wowupPacks: ['Required'],
    })
    assert.deepEqual(index.map(e => e.to), [
      '/guide#step-1',
      '/guide#step-2',
      '/faq#faq-what-is-magguuui',
      '/strings?tab=profiles&addon=BigWigs&profile=7',
      '/strings?class=Mage&spec=Frost',
      '/strings?tab=wowup&pack=Required',
    ])
    assert.equal(index[1]!.text, 'Download MagguuUI')
    assert.equal(index[2]!.text, 'A native overhaul.')
  })
})
