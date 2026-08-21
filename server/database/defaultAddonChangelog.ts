export const CURRENT_ADDON_CHANGELOG = {
  version: 'v12.0.25',
  publishedAt: new Date('2026-08-21T00:00:00Z'),
  content: `Ready for WoW 12.0. MagguuUI lives inside EllesmereUI. Type \`/mui\` to open it.

### What's new

- Three tabs: **Setup**, **Skinning**, and **QoL**
- **Magguu-Look** applies Magguu's fonts, class-colored accent, Giant options panel, and 4K scale in one click
- Setup imports Magguu profiles, grouped as required (EllesmereUI, class layouts) and optional (BigWigs, Northern Sky, WIM, Waypoint UI)
- Export your current profiles under **Werkzeuge** (\`/mui tools\`, or click the MagguuUI header ten times)

### Setup

- Full 4K install for EllesmereUI, BigWigs, Northern Sky Raid Tools, and class cooldown layouts
- UI scale 0.58 for 4K, without re-importing profiles
- On a new character, MagguuUI asks whether to load those profiles onto the alt

### Profiles

- EllesmereUI profile \`MagguuUI\` at scale 0.58
- BigWigs profile with the MagguuUI bar style and Magguu callout sounds
- Northern Sky Raid Tools profile
- WIM and Waypoint UI settings
- Cooldown Viewer layouts named \`Magguu - Class Spec\`
- WowUp starter pack: EllesmereUI, MagguuUI, BigWigs, LittleWigs, Northern Sky. A second optional pack covers extras such as BugSack, MDT, Raider.IO, WIM, GTFO, and EXBoss

### Skinning and quality of life

- Split colors for unit-frame names and party/raid names
- Class-colored keybind modifiers
- Death-release protection, co-tank frame, stealth and stance reminders, spell-alert opacity, hide proc overlays

### Install notes

- One folder only: \`MagguuUI\` (EUI, Data, and Media live inside it)
- Delete leftover \`MagguuUI_Data\`, \`MagguuUI_EUI\`, or \`MagguuUI_Media\` folders from older installs
- EllesmereUI 7.9.5 or newer is required. BigWigs, LittleWigs, and Northern Sky are optional`,
} as const
