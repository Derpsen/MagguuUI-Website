export const CURRENT_ADDON_CHANGELOG = {
  version: 'v12.1.2',
  publishedAt: new Date('2026-08-27T00:00:00Z'),
  content: `Ready for WoW 12.1. MagguuUI lives inside EllesmereUI. Type \`/mui\` to open it.

### What's new

- Changelog, Setup buttons, hints, and tooltips in **all 11 WoW client languages** (enUS, deDE, esES, esMX, frFR, itIT, koKR, ptBR, ruRU, zhCN, zhTW).
- **Setup → Optional** and **Load profiles** import KeystoneLoot Best in Slot for your current class, including **Devourer**. Archon outfit: one item per slot, two rings and two trinkets. No MagguuKSL addon.
- MagguuUI ships as a **four-addon group** like BigWigs: **MagguuUI**, **[Data]**, **[EUI]**, and **[Media]**. Keep all four enabled. Needs **EllesmereUI 9.0.6+**.
- Gold Setup is **Apply Magguu profiles**. Below it: **Magguu Settings** and **Load profiles**. Scale \`0.58\` comes from those two. No Set-scale-only.
- **Apply Magguu profiles** writes the HUD Edit Mode layout **MagguuUI** once.
- Ellesmere start popup is skipped; Magguu Setup opens on that login.
- Bundled profiles recaptured from Magguu Tools (Ellesmere 9.0.7).
- **WowUp starter:** EllesmereUI, MagguuUI, BigWigs, LittleWigs, Northern Sky, EXBoss, EXCore. **Optional:** BugGrabber, BugSack, HandyNotes, MDT, Raider.IO, Simulationcraft, Talent Tree Tweaks, WIM, Ellesmere WIM Skin, Waypoint UI, GTFO, Premade Groups Filter, KeystoneLoot.
- **Skinning** is one **NAMES & COLORS** section (two columns): split unit-frame names, split party and raid names, split EXBoss names, and class-colored keybind modifiers. EXBoss split does not use the EXBoss class-color option. Magguu Settings turns these on; reset turns them off.
- **QoL** includes party and raid item level (and 2P/4P) on Ellesmere group frames.

### Setup

- **Apply Magguu profiles** is the gold button. Below: **Magguu Settings** and **Load profiles** side by side.
- **Load profiles** switches existing Magguu profiles onto this character. It does not re-import or overwrite them. Class layouts and KeystoneLoot Best in Slot (if KeystoneLoot is installed and enabled) are installed per character.
- On a new character, MagguuUI asks whether to load those profiles onto the alt.
- Ellesmere Magguu import pre-checks **Window & Tooltip Skins**.
- UI scale \`0.58\` is applied by **Apply Magguu profiles** and **Magguu Settings**.

### Install notes

- MagguuUI, MagguuUI [Data], MagguuUI [EUI], and MagguuUI [Media] stay enabled. Fonts and sounds live in [Media].
- EllesmereUI 9.0.6 or newer must be installed and enabled. BigWigs, LittleWigs, Northern Sky, EXBoss, and EXCore are in the WowUp starter pack; MagguuUI still loads without them.
- Works on WoW 12.1 and still loads on Midnight 12.0.
- UI in every WoW client language Magguu ships`,
} as const
