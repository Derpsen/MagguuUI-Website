export const CURRENT_ADDON_CHANGELOG = {
  version: 'v12.1.0',
  publishedAt: new Date('2026-08-22T00:00:00Z'),
  content: `Ready for WoW 12.1. MagguuUI lives inside EllesmereUI. Type \`/mui\` to open it.

### What's new

- MagguuUI now shows as a group with **[Data]**, **[EUI]**, and **[Media]** like BigWigs. Keep all four enabled. Fonts and sounds live in [Media]. Requires **EllesmereUI 9.0.6+**.
- **Setup → Optional** imports KeystoneLoot Best in Slot for your current class, including Devourer. The button shows your class name in class color. This overwrites your current KeystoneLoot favorites.
- **Import EXBoss** writes Magguu's appearance and author configs. Import again to replace those Magguu configs. Other EXBoss profiles stay.
- In-game **Changelog** as its own MagguuUI sidebar row. Click an entry to jump to the matching Magguu setting.
- Two visible rows: **Options** (tabs **Setup**, **Skinning**, **QoL**) and **Changelog**. **Tools** stays hidden until you click the MagguuUI header ten times, or type \`/mui tools\`.
- **Magguu-Look** applies Magguu fonts, class colors, the large options panel, UI scale \`0.58\`, and Magguu extras such as quick loot, skip cinematics, hide talking head, and auto repair.
- Tooltips stay at Magguu's position. They do not follow the mouse.
- Setup imports Magguu profiles. Required: EllesmereUI and class layouts. Optional: BigWigs, Northern Sky, WIM, Waypoint UI, EXBoss, and KeystoneLoot for the current class.
- Setup buttons: **green** = Magguu's profile is loaded on this character, **orange** = installed but not loaded (hover for the reason), **red** = missing.
- WowUp packs copy from Setup. **Starter:** EllesmereUI, MagguuUI, BigWigs, LittleWigs, Northern Sky, EXBoss, EXCore. **Optional:** BugGrabber, BugSack, HandyNotes, MDT, Raider.IO, Simulationcraft, Talent Tree Tweaks, WIM, Ellesmere WIM Skin, Waypoint UI, GTFO, Premade Groups Filter, KeystoneLoot. Buttons turn green when the pack addons are installed; hover lists the pack.
- After Ellesmere's first-install picker, Magguu Setup opens on the next login. Export your current profiles under **Tools** (\`/mui tools\`).

### Setup

- **Install everything** is the centered gold button. Below it: **Apply Magguu-Look** and **Load profiles** side by side.
- **Load profiles** switches existing Magguu profiles onto this character. It does not re-import or overwrite them. Class layouts and KeystoneLoot Best in Slot (if KeystoneLoot is installed and enabled) are installed per character. If a Magguu profile is missing, you get a chat message.
- On a new character, MagguuUI asks whether to load those profiles onto the alt.
- Class-layout import asks you to reload the UI. Magguu accepts the BigWigs Magguu popup for you. Confirm popups stay until you click.
- UI scale \`0.58\` is applied by **Install everything** and Magguu-Look.

### Profiles

- Current Magguu profiles for EllesmereUI, BigWigs, Northern Sky, WIM, Waypoint UI, and EXBoss
- EllesmereUI profile \`MagguuUI\` at scale \`0.58\`
- BigWigs profile with the MagguuUI bar style and Magguu callout sounds
- Cooldown layouts named \`Magguu - Class Spec\`
- KeystoneLoot Best in Slot for the current class, Devourer included
- WowUp starter and optional packs as listed under What's new

### Skinning and quality of life

- Split colors for unit-frame names and party/raid names
- Class-colored keybind modifiers
- Death-release protection, co-tank frame, stealth and stance reminders, spell-alert opacity, hide proc overlays
- Smart Tab (chat channel cycling), Quick Focus (modifier-click to focus; modifier/button in the cog), and an audio device switcher on the Ellesmere speaker icon

### Install notes

- MagguuUI installs as a group like BigWigs: MagguuUI, MagguuUI [Data], MagguuUI [EUI], MagguuUI [Media]. Keep [Data]/[EUI]/[Media] enabled. Fonts and sounds live in [Media].
- EllesmereUI 9.0.6 or newer must be installed and enabled. BigWigs, LittleWigs, Northern Sky, EXBoss, and EXCore are in the WowUp starter pack; MagguuUI still loads without them
- Works on WoW 12.1 and still loads on Midnight 12.0
- UI in every WoW client language Magguu ships`,
} as const
