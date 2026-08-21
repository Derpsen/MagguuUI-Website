export const CURRENT_ADDON_CHANGELOG = {
  version: 'v12.1.0',
  publishedAt: new Date('2026-08-22T00:00:00Z'),
  content: `Ready for WoW 12.1. MagguuUI lives inside EllesmereUI. Type \`/mui\` to open it.

### What's new

- Three tabs: **Setup**, **Skinning**, and **QoL**. **Werkzeuge** stays hidden until you click the MagguuUI header ten times, or type \`/mui tools\`
- **Magguu-Look** applies Magguu's fonts, class-colored theme, Giant options panel, 4K scale, and Ellesmere QoL/Shifter defaults (quick loot, skip cinematics, hide talking head, auto repair/sell junk, and more) in one click
- Setup imports Magguu profiles, grouped as required (EllesmereUI, class layouts) and optional (BigWigs, Northern Sky, WIM, Waypoint UI). Import buttons turn green after Magguu's profile is imported. WowUp starter and optional collection strings copy from the same page; those buttons turn green when the pack addons are installed, and hover lists the pack
- After Ellesmere's first-install picker, Magguu Setup opens on the next login. Export your current profiles under **Werkzeuge** (\`/mui tools\`)

### Setup

- **Install everything**, **Set scale only**, **Apply Magguu-Look**, and **Load profiles**
- Required Magguu imports: EllesmereUI and class layouts. Optional: BigWigs, Northern Sky, WIM, Waypoint UI. Import buttons stay red if the addon is missing or Magguu's profile is not imported yet
- Copy the WowUp starter pack and the optional pack, then paste them in WowUp
- On a new character, MagguuUI asks whether to load those profiles onto the alt
- Class-layout import asks you to reload. Magguu's BigWigs import accepts the Magguu consent popup automatically. Confirm popups stay on top until you click
- UI scale 0.58 for 4K, without re-importing profiles

### Profiles

- EllesmereUI profile \`MagguuUI\` at scale 0.58
- BigWigs profile with the MagguuUI bar style and Magguu callout sounds
- Northern Sky Raid Tools profile
- WIM and Waypoint UI settings
- Cooldown Viewer layouts named \`Magguu - Class Spec\`
- WowUp starter pack: EllesmereUI, MagguuUI, BigWigs, LittleWigs, Northern Sky. A second optional pack covers extras such as BugSack, MDT, Raider.IO, WIM, GTFO, EXBoss, the Ellesmere WIM skin, and ExwindCore

### Skinning and quality of life

- Split colors for unit-frame names and party/raid names
- Class-colored keybind modifiers
- Death-release protection, co-tank frame, stealth and stance reminders, spell-alert opacity, hide proc overlays

### Install notes

- One folder only: \`MagguuUI\` (EUI, Data, and Media live inside it)
- Delete leftover \`MagguuUI_Data\`, \`MagguuUI_EUI\`, or \`MagguuUI_Media\` folders from older installs
- EllesmereUI 7.9.5 or newer must be installed and enabled. BigWigs, LittleWigs, and Northern Sky are optional
- TOC interfaces \`120000\`–\`120100\`, so MagguuUI loads on Midnight 12.0 through 12.1
- UI strings for every Blizzard client locale Magguu ships`,
} as const
