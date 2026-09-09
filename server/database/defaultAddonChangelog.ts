export const CURRENT_ADDON_CHANGELOG = {
  version: 'v12.1.2',
  publishedAt: new Date('2026-08-27T00:00:00Z'),
  content: `Ready for WoW 12.1. MagguuUI lives inside EllesmereUI. Type \`/mui\` to open it.

### What's new

- Changelog, Setup buttons, hints, and tooltips in **all 11 WoW client languages** (enUS, deDE, esES, esMX, frFR, itIT, koKR, ptBR, ruRU, zhCN, zhTW).
- MagguuUI no longer includes KeystoneLoot BiS or WowUp optional KeystoneLoot.
- **WowUp Optional** now includes **Auctionator**. Starter unchanged.

### Additional features

- MagguuUI ships as a **four-addon group** like BigWigs: **MagguuUI**, **[Data]**, **[EUI]**, and **[Media]**. Keep all four enabled. Needs **EllesmereUI 9.0.6+** (live **9.1.6**; MagguuUI bake still **9.0.8**).
- Gold Setup is **Apply Magguu profiles**. Below it: **Apply Magguu Settings** and **Load profiles**. Scale \`0.58\`. Magguu Settings is overlay/QoL only (no Ellesmere reimport). Load profiles activates; it does not reimport the bake.
- **Apply Magguu profiles** writes the HUD Edit Mode layout **MagguuUI** once.
- **Apply Magguu profiles** enables Ellesmere **Targeted Spell Bars** (Nearby Cast) with Magguu texture. Leave **EXBoss MythicCast OFF**.
- Ellesmere start popup is skipped; MagguuUI Setup opens on that login.
- Bundled MagguuUI profiles recaptured from MagguuUI Tools (bake 9.0.8 on Ellesmere live 9.1.6; Northern Sky and EXBoss).
- **WowUp starter:** EllesmereUI, MagguuUI, BigWigs, LittleWigs, Northern Sky, EXBoss, EXCore. **Optional:** BugGrabber, BugSack, HandyNotes, MDT, Raider.IO, Simulationcraft, Talent Tree Tweaks, WIM, Ellesmere WIM Skin, Waypoint UI, GTFO, Premade Groups Filter, Auctionator.
- **Skinning** is one **NAMES & COLORS** section (two columns): split unit-frame names, split party and raid names, and class-colored keybind modifiers. Magguu Settings turns these on; reset turns them off.
- **QoL** includes party and raid item level (and 2P/4P) and **Boiling Point**. AuraBuff counts stay centered.
- **Apply Magguu profiles**, **Load profiles**, and **Magguu Settings** apply MagguuUI chat channels and size (Services off General).
- **Tools → Exports**: **Enable all** / **Disable all**.

### Bugfixes

- **Northern Sky** live export no longer errors with LibSerialize \`Unhandled type: function\`.
- Ellesmere MagguuUI import pre-checks **Window & Tooltip Skins**.
- MagguuUI no longer ships KeystoneLoot BiS import or optional pack membership.
- Smart Tab no longer errors when a whisper arrives in combat or an instance (secret player names).
- Services chat no longer sticks on the General tab after login or \`/reload\`.
- Aura buff reminder labels and stack counts are centered on the icons.

### Install notes

- MagguuUI, MagguuUI [Data], MagguuUI [EUI], and MagguuUI [Media] stay enabled. Fonts and sounds live in [Media].
- If an older MagguuUI still has Data, EUI, or Media *inside* the MagguuUI folder, delete those nested copies. Keep the sibling addons.
- EllesmereUI 9.0.6 or newer must be installed and enabled. BigWigs, LittleWigs, Northern Sky, EXBoss, and EXCore are in the WowUp starter pack; MagguuUI still loads without them.
- Works on WoW 12.1 and still loads on Midnight 12.0.
- UI in every WoW client language MagguuUI ships`,
} as const
