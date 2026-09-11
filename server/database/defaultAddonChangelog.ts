export const CURRENT_ADDON_CHANGELOG = {
  version: 'v12.1.4',
  publishedAt: new Date('2026-09-11T00:00:00Z'),
  content: `Ready for WoW 12.1. MagguuUI lives inside EllesmereUI. Type \`/mui\` to open it.

### What's new

- Fresh Magguu bake **2026-09-11**: EllesmereUI (full), BigWigs, Northern Sky, EXBoss, WIM, Waypoint UI, HandyNotes, Talent Tree Tweaks, GTFO, BugSack, Premade Groups Filter, and Smart Reminders. Use **Apply Magguu profiles**.
- **Smart Reminders** Setup import. **WowUp Optional** now includes Smart Reminders.
- HandyNotes, Talent Tree Tweaks, GTFO, BugSack, and Premade Groups Filter apply with Apply Magguu profiles / Load profiles (no Setup button).
- BigWigs keystone viewer does not auto-open when Mythic+ ends.
- WowUp starter and optional hover lists addons A–Z.

### Additional features

- MagguuUI ships as a **four-addon group** like BigWigs: **MagguuUI**, **[Data]**, **[EUI]**, and **[Media]**. Keep all four enabled. Needs **EllesmereUI 9.0.6+** (live **9.1.6**).
- Gold Setup is **Apply Magguu profiles**. Below it: **Apply Magguu Settings** and **Load profiles**. Scale \`0.58\`. Magguu Settings is overlay/QoL only (no Ellesmere reimport). Load profiles activates; it does not reimport the bake.
- **Apply Magguu profiles** writes the HUD Edit Mode layout **MagguuUI** once.
- Ellesmere start popup is skipped; MagguuUI Setup opens on that login.
- **WowUp starter:** EllesmereUI, MagguuUI, BigWigs, LittleWigs, Northern Sky, EXBoss, EXCore. **Optional:** BugGrabber, BugSack, HandyNotes, MDT, Raider.IO, Simulationcraft, Talent Tree Tweaks, WIM, Ellesmere WIM Skin, Waypoint UI, GTFO, Premade Groups Filter, Auctionator, Smart Reminders.
- **Skinning** is one **NAMES & COLORS** section (two columns): split unit-frame names, split party and raid names, and class-colored keybind modifiers. Magguu Settings turns these on; reset turns them off.
- **QoL** includes party and raid item level (and 2P/4P) and **Boiling Point**. AuraBuff counts stay centered.
- **Apply Magguu profiles**, **Load profiles**, and **Magguu Settings** apply MagguuUI chat channels and size (Services off General).
- **Apply Magguu profiles** enables Ellesmere **Targeted Spell Bars** (Nearby Cast). Leave **EXBoss MythicCast OFF**.
- Setup import buttons: BigWigs, Northern Sky, EXBoss, Smart Reminders.

### Install notes

- MagguuUI, MagguuUI [Data], MagguuUI [EUI], and MagguuUI [Media] stay enabled. Fonts and sounds live in [Media].
- If an older MagguuUI still has Data, EUI, or Media *inside* the MagguuUI folder, delete those nested copies. Keep the sibling addons.
- EllesmereUI 9.0.6 or newer must be installed and enabled. BigWigs, LittleWigs, Northern Sky, EXBoss, and EXCore are in the WowUp starter pack; MagguuUI still loads without them.
- Works on WoW 12.1 and still loads on Midnight 12.0.
- UI in every WoW client language MagguuUI ships`,
} as const
