import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildSearchIndex, SEARCH_BODY_MAX } from '../../server/utils/searchIndex'

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
      '/guide#apply-one-module',
      '/faq#faq-what-is-magguuui',
      '/strings?tab=profiles&addon=BigWigs&profile=7',
      '/strings?class=Mage&spec=Frost',
      '/strings?tab=wowup&pack=Required',
    ])
    assert.equal(index[1]!.text, 'Download MagguuUI')
    assert.equal(index[3]!.text, 'A native overhaul.')
  })

  it('adds the changelog and full-text bodies without drafts or Unreleased', () => {
    const index = buildSearchIndex({
      guideSteps: { step_1_title: '1. Install', step_1: 'Open **/mui** and run Apply Magguu profiles.' },
      faqs: [{ id: 2, question: 'Why?', answer: 'Because **reasons** that are long enough.' }],
      changelog: [
        { version: 'v12.1.8', content: '### Changes 2026-10-14\n- Fixed the **Zebrafish** bug.' },
        { version: 'v12.1.7', content: '- Older.' },
      ],
      profiles: [],
      layouts: [],
      wowupPacks: [],
    })
    const changelog = index.filter(e => e.group === 'Changelog')
    assert.deepEqual(changelog.map(e => e.to), ['/changelog#release-v12-1-8', '/changelog#release-v12-1-7'])
    assert.equal(changelog[0]!.label, 'Changelog · v12.1.8')
    assert.equal(changelog[0]!.body, 'Fixed the Zebrafish bug.')
    assert.doesNotMatch(changelog[0]!.text, /Changes 2026/)
    assert.equal(index.find(e => e.id === 'guide-1')!.body, 'Open /mui and run Apply Magguu profiles.')
    assert.equal(index.find(e => e.id === 'faq-2')!.body, 'Because reasons that are long enough.')
  })

  it('lists the static guide section and caps body size', () => {
    const long = 'word '.repeat(5000)
    const index = buildSearchIndex({ guideSteps: {}, faqs: [{ id: 1, question: 'Q', answer: long }], changelog: [{ version: 'v1.0.0', content: long }], profiles: [], layouts: [], wowupPacks: [] })
    const apply = index.find(e => e.id === 'guide-apply-one-module')!
    assert.equal(apply.to, '/guide#apply-one-module')
    assert.match(apply.body!, /Import class layouts/)
    assert.ok(index.find(e => e.id === 'faq-1')!.body!.length <= SEARCH_BODY_MAX)
    assert.ok(index.find(e => e.id === 'changelog-v1.0.0')!.body!.length <= SEARCH_BODY_MAX)
    // Strings entries stay label-only: no body.
    assert.equal(buildSearchIndex({ guideSteps: {}, faqs: [], profiles: [{ id: 1, addon: 'A', profile: 'B' }], layouts: [], wowupPacks: ['P'] }).filter(e => e.group === 'Strings').some(e => e.body !== undefined), false)
  })
})
