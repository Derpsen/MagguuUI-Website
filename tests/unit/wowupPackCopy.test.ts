import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { CURRENT_ADDON_CHANGELOG } from '../../server/database/defaultAddonChangelog'
import { DEFAULT_FAQS, DEFAULT_GUIDE_CONTENT } from '../../server/database/defaultContent'

const STARTER = 'EllesmereUI, MagguuUI, BigWigs, LittleWigs, Northern Sky, EXBoss, EXCore'
const OPTIONAL = 'BugGrabber, BugSack, HandyNotes, MDT, Raider.IO, Simulationcraft, Talent Tree Tweaks, WIM, Ellesmere WIM Skin, Waypoint UI, GTFO, Premade Groups Filter, KeystoneLoot, Auctionator'

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
    assert.equal(CURRENT_ADDON_CHANGELOG.version, 'v12.1.2')
  })
})
