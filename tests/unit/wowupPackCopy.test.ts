import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ADDON_DEFAULTS } from '../../server/database/addonMetadata'
import { ADDON_ICONS, addonIconForName } from '../../utils/addonIcons'
import { CURRENT_ADDON_CHANGELOG, scrubPublishedChangelog } from '../../server/database/defaultAddonChangelog'
import { DEFAULT_FAQS, DEFAULT_GUIDE_CONTENT, DEFAULT_HOME_CONTENT } from '../../server/database/defaultContent'

const STARTER = 'EllesmereUI, MagguuUI, BigWigs, LittleWigs, Northern Sky, EXBoss, EXCore'
const OPTIONAL = 'BugGrabber, BugSack, HandyNotes, HandyNotes MapNotes, MDT, Raider.IO, Simulationcraft, Talent Tree Tweaks, Whisper Messenger, Waypoint UI, GTFO, Premade Groups Filter, Auctionator, Smart Reminders'

describe('WowUp pack copy', () => {
  it('keeps starter membership unchanged and adds Auctionator only to Optional', () => {
    const guideStep3 = DEFAULT_GUIDE_CONTENT.find(entry => entry.section === 'steps' && entry.key === 'step_3')
    assert.ok(guideStep3)
    assert.ok(guideStep3.value.includes('**WowUp starter:** ' + STARTER))
    assert.match(guideStep3.value, /\*\*WowUp optional:\*\*.*Whisper Messenger/)
    assert.doesNotMatch(guideStep3.value, /\(not WIM\)/)
    assert.doesNotMatch(guideStep3.value, /Starter pack/)

    const wowupFaq = DEFAULT_FAQS.find(faq => faq.question === 'Are the WowUp strings still required?')
    assert.ok(wowupFaq)
    assert.match(wowupFaq.answer, /Optional pack.*Auctionator/)
    assert.doesNotMatch(wowupFaq.answer, /Starter pack.*Auctionator/)

    assert.ok(CURRENT_ADDON_CHANGELOG.content.includes('**WowUp starter:** ' + STARTER + '.'))
    assert.ok(CURRENT_ADDON_CHANGELOG.content.includes('**Optional:** ' + OPTIONAL + '.'))
    assert.equal(CURRENT_ADDON_CHANGELOG.version, 'v12.1.6')
  })
})

describe('MagguuUI product facts copy', () => {
  it('locks Ellesmere live host, Apply Magguu profiles, Targeted Spell Bars, and no foreign author credits', () => {
    assert.match(CURRENT_ADDON_CHANGELOG.content, /live \*\*9\.2\.9\*\*/)
    assert.match(CURRENT_ADDON_CHANGELOG.content, /Targeted Spell Bars/)
    assert.doesNotMatch(CURRENT_ADDON_CHANGELOG.content, /MythicCast/)
    assert.doesNotMatch(CURRENT_ADDON_CHANGELOG.content, /four-addon group/)
    assert.match(CURRENT_ADDON_CHANGELOG.content, /Boiling Point/)
    assert.match(CURRENT_ADDON_CHANGELOG.content, /Apply Magguu profiles/)
    assert.doesNotMatch(CURRENT_ADDON_CHANGELOG.content, /Install All/)
    assert.doesNotMatch(CURRENT_ADDON_CHANGELOG.content, /Naowh/)
    assert.doesNotMatch(CURRENT_ADDON_CHANGELOG.content, /authors per role/)
    assert.doesNotMatch(CURRENT_ADDON_CHANGELOG.content, /### Setup/)
    assert.doesNotMatch(CURRENT_ADDON_CHANGELOG.content, /\bbake\b/i)
    assert.doesNotMatch(CURRENT_ADDON_CHANGELOG.content, /dump addon/i)
    const older = '**Apply Magguu profiles** enables Ellesmere **Targeted Spell Bars** (Nearby Cast) with Magguu texture. Leave **EXBoss MythicCast OFF**.\n- it does not reimport the bake.\n- Bundled MagguuUI profiles recaptured from MagguuUI Tools (bake 9.0.8 on Ellesmere live 9.1.6; Northern Sky and EXBoss).'
    const scrubbed = scrubPublishedChangelog(older)
    assert.doesNotMatch(scrubbed, /MythicCast|recapture|\bbake\b/i)
    assert.match(scrubbed, /Targeted Spell Bars/)
    assert.equal(scrubPublishedChangelog(scrubbed), scrubbed)

    const guideIntro = DEFAULT_GUIDE_CONTENT.find(e => e.section === 'intro' && e.key === 'text')
    assert.ok(guideIntro?.value.includes('Apply Magguu profiles'))
    assert.ok(guideIntro?.value.includes('Everything except EllesmereUI is optional'))
    assert.doesNotMatch(guideIntro?.value || '', /\(not WIM\)/)
    assert.match(guideIntro?.value || '', /CurseForge/)
    assert.doesNotMatch(guideIntro?.value || '', /four MagguuUI folders/)
    assert.doesNotMatch(guideIntro?.value || '', /overlay\/QoL only/)

    const step4 = DEFAULT_GUIDE_CONTENT.find(e => e.section === 'steps' && e.key === 'step_4')
    assert.ok(step4?.value.includes('**Apply Magguu profiles**'))
    assert.ok(step4?.value.includes('overlay/QoL only'))
    assert.ok(step4?.value.includes('does not re-import profiles'))
    assert.doesNotMatch(step4?.value || '', /author configs/)
    assert.doesNotMatch(step4?.value || '', /Install All/)
    assert.doesNotMatch(step4?.value || '', /\bbake\b/i)
    assert.doesNotMatch(step4?.value || '', /dump addon/i)

    const feature1 = DEFAULT_HOME_CONTENT.find(e => e.key === 'feature_1_text' && e.locale === 'en')
    assert.ok(feature1?.value.includes('Apply Magguu profiles'))

    const hero = DEFAULT_HOME_CONTENT.find(e => e.key === 'description' && e.locale === 'en')
    assert.match(hero?.value || '', /Apply Magguu profiles/)
    assert.match(hero?.value || '', /<code>\/mui<\/code>/)
    assert.match(hero?.value || '', /Designed for 4K/)
    assert.doesNotMatch(hero?.value || '', /Companion addons stay optional/)
    assert.doesNotMatch(hero?.value || '', /native 4K overhaul/i)
    const heroDe = DEFAULT_HOME_CONTENT.find(e => e.key === 'description' && e.locale === 'de')
    assert.match(heroDe?.value || '', /Für 4K ausgelegt/)
    const feature2 = DEFAULT_HOME_CONTENT.find(e => e.key === 'feature_2_text' && e.locale === 'en')
    assert.match(feature2?.value || '', /HandyNotes/)
    assert.match(feature2?.value || '', /Premade Groups Filter/)
    assert.match(feature2?.value || '', /Smart Reminders/)

    const installFaq = DEFAULT_FAQS.find(f => f.question === 'What does Apply Magguu profiles configure?')
    assert.ok(installFaq)
    assert.doesNotMatch(installFaq.answer, /authors per role/)
    assert.match(installFaq.answer, /MagguuUI role configs/)

    const qol = DEFAULT_FAQS.find(f => f.question === 'What QoL options are included?')
    assert.match(qol?.answer || '', /Targeted Spell Bars/)
    assert.match(qol?.answer || '', /Smart Tab/)
    assert.match(qol?.answer || '', /Boiling Point/)
    assert.doesNotMatch(qol?.answer || '', /Hide Services/)
    assert.doesNotMatch(qol?.answer || '', /MythicCast/)

    for (const addon of ADDON_DEFAULTS) {
      assert.doesNotMatch(addon.description || '', /\bdump\b/i, addon.slug)
      assert.ok(ADDON_ICONS[addon.slug], `${addon.slug} needs a CurseForge icon`)
    }
    const bySlug = Object.fromEntries(ADDON_DEFAULTS.map(addon => [addon.slug, addon.url]))
    assert.equal(bySlug.bigwigs, 'https://www.curseforge.com/wow/addons/bigwigs')
    assert.equal(bySlug.littlewigs, 'https://www.curseforge.com/wow/addons/littlewigs')
    assert.equal(bySlug.wim, undefined)
    assert.equal(bySlug['whisper-messenger'], 'https://www.curseforge.com/wow/addons/whisper-messenger')
    assert.equal(bySlug['smart-reminders'], 'https://www.curseforge.com/wow/addons/naowhsmartreminders')
    assert.doesNotMatch(feature2?.value || '', /\bWIM\b/)
    assert.equal(addonIconForName('Mythic Dungeon Tools - MDT'), '/addon-icons/mdt.png')
    assert.equal(addonIconForName('HandyNotes: MapNotes'), '/addon-icons/mapnotes.png')
    assert.equal(addonIconForName('Naowh Smart Reminders'), '/addon-icons/smart-reminders.png')
    assert.equal(addonIconForName('BugGrabber'), undefined)
  })
})