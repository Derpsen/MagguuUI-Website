export const CURRENT_ADDON_CHANGELOG = {
  version: 'v12.1.6',
  publishedAt: new Date('2026-09-26T00:00:00Z'),
  content: `Ready for WoW 12.1. MagguuUI lives inside EllesmereUI. Type \`/mui\` to open it.

### What's new

- Updated Magguu profiles. Click gold **Apply Magguu profiles** to pick them up.
- **Smart Reminders** import now includes trash alerts.
- Setup splits **First install** from **Already installed**. Gold **Apply Magguu profiles** is first install. **Apply Magguu Settings** and **Load on this character** sit under Already installed and do not reinstall profiles.
- First-install toggle is **Include Magguu Settings** (default on). Magguu Settings later is look only.
- **HandyNotes MapNotes** Magguu settings apply with HandyNotes when you use **Apply Magguu profiles** or **Load profiles**. Still on WowUp Optional.
- **Raider.IO Talent Builds**: left-click a build to load it. Auto-open once per party or raid instance.
- Magguu chat size still applies. Magguu does not join, leave, or hide Services — you manage that channel.

### Additional features

- MagguuUI ships as a **four-addon group** like BigWigs: **MagguuUI**, **[Data]**, **[EUI]**, and **[Media]**. Keep all four enabled. Needs **EllesmereUI 9.0.6+** (live **9.2.2**).
- Gold Setup is **Apply Magguu profiles**. Below it: **Apply Magguu Settings** and **Load profiles**. Scale \`0.58\`. Magguu Settings is overlay/QoL only. Load profiles switches existing Magguu profiles; it does not re-import them.
- **Apply Magguu profiles** writes the HUD Edit Mode layout **MagguuUI** once.
- Ellesmere start popup is skipped; MagguuUI Setup opens on that login.
- **WowUp starter:** EllesmereUI, MagguuUI, BigWigs, LittleWigs, Northern Sky, EXBoss, EXCore. **Optional:** BugGrabber, BugSack, HandyNotes, HandyNotes MapNotes, MDT, Raider.IO, Simulationcraft, Talent Tree Tweaks, WIM, Ellesmere WIM Skin, Waypoint UI, GTFO, Premade Groups Filter, Auctionator, Smart Reminders.
- **Skinning** is one **NAMES & COLORS** section (two columns): split unit-frame names, split party and raid names, and class-colored keybind modifiers. Magguu Settings turns these on; reset turns them off.
- **QoL** includes party and raid item level (and 2P/4P) and **Boiling Point**. AuraBuff counts stay centered.
- **Apply Magguu profiles** enables Ellesmere **Targeted Spell Bars** (Nearby Cast). Leave **EXBoss MythicCast OFF**.
- Setup import buttons: BigWigs, Northern Sky, EXBoss, Smart Reminders.

### Install notes

- MagguuUI, MagguuUI [Data], MagguuUI [EUI], and MagguuUI [Media] stay enabled. Fonts and sounds live in [Media].
- If an older MagguuUI still has Data, EUI, or Media *inside* the MagguuUI folder, delete those nested copies. Keep the sibling addons.
- EllesmereUI 9.0.6 or newer must be installed and enabled. BigWigs, LittleWigs, Northern Sky, EXBoss, and EXCore are in the WowUp starter pack; MagguuUI still loads without them.
- Works on WoW 12.1 and still loads on Midnight 12.0.
- UI in every WoW client language MagguuUI ships`,
} as const
