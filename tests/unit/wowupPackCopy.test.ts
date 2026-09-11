import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { CURRENT_ADDON_CHANGELOG } from '../../server/database/defaultAddonChangelog'
import { DEFAULT_FAQS, DEFAULT_GUIDE_CONTENT, DEFAULT_HOME_CONTENT } from '../../server/database/defaultContent'

const STARTER = 'EllesmereUI, MagguuUI, BigWigs, LittleWigs, Northern Sky, EXBoss, EXCore'
const OPTIONAL = 'BugGrabber, BugSack, HandyNotes, MDT, Raider.IO, Simulationcraft, Talent Tree Tweaks, WIM, Ellesmere WIM Skin, Waypoint UI, GTFO, Premade Groups Filter, Auctionator'

describe('WowUp pack copy', () => {
  it('keeps starter membership unchanged and adds Auctionator only to Optional', () => {
    const guideStep3 = DEFAULT_GUIDE_CONTENT.find(entry => entry.section === 'steps' && entry.key === 'step_3')
    assert.ok(guideStep3)
    assert.ok(guideStep3.value.includes('Starter pack: ' + STARTER + '.'))
    assert.ok(guideStep3.value.includes('Optional pack: ' + OPTIONAL + '.'))

    const wowupFaq = DEFAULT_FAQS.find(faq => faq.question === 'Are the WowUp strings still required?')
    assert.ok(wowupFaq)
    assert.match(wowupFaq.answer, /Optional pack.*Auctionator/)
    assert.doesNotMatch(wowupFaq.answer, /Starter pack.*Auctionator/)

    assert.ok(CURRENT_ADDON_CHANGELOG.content.includes('**WowUp starter:** ' + STARTER + '.'))
    assert.ok(CURRENT_ADDON_CHANGELOG.content.includes('**Optional:** ' + OPTIONAL + '.'))
    assert.equal(CURRENT_ADDON_CHANGELOG.version, 'v12.1.3')
  })
})

describe('MagguuUI product facts copy', () => {
  it('locks Ellesmere live/bake, Apply Magguu profiles, Targeted Spell Bars, and no foreign author credits', () => {
    assert.match(CURRENT_ADDON_CHANGELOG.content, /live \*\*9\.1\.6\*\*/)
    assert.match(CURRENT_ADDON_CHANGELOG.content, /2026-09-11/)
    assert.match(CURRENT_ADDON_CHANGELOG.content, /Targeted Spell Bars/)
    assert.match(CURRENT_ADDON_CHANGELOG.content, /EXBoss MythicCast OFF/)
    assert.match(CURRENT_ADDON_CHANGELOG.content, /Boiling Point/)
    assert.match(CURRENT_ADDON_CHANGELOG.content, /Apply Magguu profiles/)
    assert.doesNotMatch(CURRENT_ADDON_CHANGELOG.content, /Install All/)
    assert.doesNotMatch(CURRENT_ADDON_CHANGELOG.content, /Naowh/)
    assert.doesNotMatch(CURRENT_ADDON_CHANGELOG.content, /authors per role/)
    assert.doesNotMatch(CURRENT_ADDON_CHANGELOG.content, /### Setup/)

    const guideIntro = DEFAULT_GUIDE_CONTENT.find(e => e.section === 'intro' && e.key === 'text')
    assert.ok(guideIntro?.value.includes('Apply Magguu profiles'))
    assert.ok(guideIntro?.value.includes('overlay/QoL only'))

    const step4 = DEFAULT_GUIDE_CONTENT.find(e => e.section === 'steps' && e.key === 'step_4')
    assert.ok(step4?.value.includes('**Apply Magguu profiles**'))
    assert.ok(step4?.value.includes('does **not** reimport the Ellesmere bake'))
    assert.ok(step4?.value.includes('does **not** reimport the bake'))
    assert.doesNotMatch(step4?.value || '', /author configs/)
    assert.doesNotMatch(step4?.value || '', /Install All/)

    const feature1 = DEFAULT_HOME_CONTENT.find(e => e.key === 'feature_1_text' && e.locale === 'en')
    assert.ok(feature1?.value.includes('Apply Magguu profiles'))

    const hero = DEFAULT_HOME_CONTENT.find(e => e.key === 'description' && e.locale === 'en')
    assert.match(hero?.value || '', /Companion addons stay optional/)
    const feature2 = DEFAULT_HOME_CONTENT.find(e => e.key === 'feature_2_text' && e.locale === 'en')
    assert.match(feature2?.value || '', /HandyNotes/)
    assert.match(feature2?.value || '', /Premade Groups Filter/)

    const installFaq = DEFAULT_FAQS.find(f => f.question === 'What does Apply Magguu profiles configure?')
    assert.ok(installFaq)
    assert.doesNotMatch(installFaq.answer, /authors per role/)
    assert.match(installFaq.answer, /MagguuUI role configs/)

    const qol = DEFAULT_FAQS.find(f => f.question === 'What QoL options are included?')
    assert.match(qol?.answer || '', /Targeted Spell Bars/)
    assert.match(qol?.answer || '', /secret-safe/)
    assert.match(qol?.answer || '', /Boiling Point/)
  })
})
