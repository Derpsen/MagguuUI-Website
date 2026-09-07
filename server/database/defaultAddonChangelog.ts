export const CURRENT_ADDON_CHANGELOG = {
  version: 'v12.1.2',
  publishedAt: new Date('2026-08-27T00:00:00Z'),
  content: `Ready for WoW 12.1. MagguuUI lives inside EllesmereUI. Type \`/mui\` to open it.

### What's new

- Changelog, Setup buttons, hints, and tooltips in **all 11 WoW client languages** (enUS, deDE, esES, esMX, frFR, itIT, koKR, ptBR, ruRU, zhCN, zhTW).
- MagguuUI no longer includes KeystoneLoot BiS or WowUp optional KeystoneLoot.
- **WowUp Optional** now includes **Auctionator**. Starter unchanged.
- EllesmereUI TOC min **9.0.6+** (**live 9.1.6**); MagguuUI bake still **9.0.8**. Bake is **delta-only** (keeps MagguuUI overlay, fonts, media, and scales).
- **Targeted Spell Bars** (Ellesmere Mythic+ Nearby Cast) **ON** via Ellesmere. Leave **EXBoss MythicCast OFF** — same feature; do not run both.
- MagguuUI_EUI keeps **Boiling Point**. TopBar, Hearth-Picker, and MagguuUI FPS/MS overlays are gone.
- AuraBuff count text is **CENTER**. Hide Services on General stays secret-safe.

### Additional features

- MagguuUI ships as a **four-addon group** like BigWigs: **MagguuUI**, **[Data]**, **[EUI]**, and **[Media]**. Keep all four enabled. Needs **EllesmereUI 9.0.6+**.
- Gold Setup is **Install All** (bake + Magguu Look + companions). Below it: **Magguu Settings** (overlay/QoL only — no Ellesmere reimport) and **Load profiles** (activates; does not reimport bake). Scale \`0.58\` comes with Install All / Magguu Look. No Set-scale-only.
- **Install All** writes the HUD Edit Mode layout **MagguuUI** once.
- Ellesmere start popup is skipped; MagguuUI Setup opens on that login.
- Bundled MagguuUI profiles recaptured from MagguuUI Tools (bake 9.0.8 on Ellesmere live 9.1.6; Northern Sky and EXBoss).
- **WowUp starter:** EllesmereUI, MagguuUI, BigWigs, LittleWigs, Northern Sky, EXBoss, EXCore. **Optional:** BugGrabber, BugSack, HandyNotes, MDT, Raider.IO, Simulationcraft, Talent Tree Tweaks, WIM, Ellesmere WIM Skin, Waypoint UI, GTFO, Premade Groups Filter, Auctionator.
- **Skinning** is one **NAMES & COLORS** section (two columns): split unit-frame names, split party and raid names, and class-colored keybind modifiers. Magguu Settings turns these on; reset turns them off.
- **QoL** includes party and raid item level (and 2P/4P) on Ellesmere group frames.
- **Install All**, **Load profiles**, and **Magguu Settings** apply MagguuUI chat channels and size (Services off General).

### Bugfixes

- Ellesmere MagguuUI import pre-checks **Window & Tooltip Skins**.
- MagguuUI no longer ships KeystoneLoot BiS import or optional pack membership.
- Smart Tab no longer errors when a whisper arrives in combat or an instance (secret player names).

### Setup

- **Install All** is the gold button. Below: **Magguu Settings** and **Load profiles** side by side.
- **Load profiles** activates existing MagguuUI profiles on this character. It does not reimport the bake. Class layouts are installed per character.
- On a new character, MagguuUI asks whether to load those profiles onto the alt.
- Ellesmere MagguuUI import pre-checks **Window & Tooltip Skins**.
- UI scale \`0.58\` is applied by **Install All** (with Magguu Look). **Magguu Settings** is overlay/QoL only and does not reimport Ellesmere.

### Install notes

- MagguuUI, MagguuUI [Data], MagguuUI [EUI], and MagguuUI [Media] stay enabled. Fonts and sounds live in [Media].
- If an older MagguuUI still has Data, EUI, or Media *inside* the MagguuUI folder, delete those nested copies. Keep the sibling addons.
- EllesmereUI 9.0.6 or newer must be installed and enabled. BigWigs, LittleWigs, Northern Sky, EXBoss, and EXCore are in the WowUp starter pack; MagguuUI still loads without them.
- Works on WoW 12.1 and still loads on Midnight 12.0.
- UI in every WoW client language MagguuUI ships`,
} as const
