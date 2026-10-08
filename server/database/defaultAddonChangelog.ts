export const CURRENT_ADDON_CHANGELOG = {
  version: 'v12.1.6',
  publishedAt: new Date('2026-09-26T00:00:00Z'),
  content: `Ready for WoW 12.1. MagguuUI lives inside EllesmereUI. Type \`/mui\` to open it.

### What's new

- Updated Magguu profiles. Use the gold **Apply Magguu profiles** button to apply them.
- **Smart Reminders** import now includes trash alerts.
- Setup splits **First install** from **Already installed**. Gold **Apply Magguu profiles** is first install. **Apply Magguu Settings** and **Load on this character** sit under Already installed and do not reinstall profiles.
- First-install toggle is **Include Magguu Settings** (default on). Afterwards, Magguu Settings is overlay and QoL only.
- **HandyNotes MapNotes** Magguu settings apply with HandyNotes when you use **Apply Magguu profiles** or **Load profiles**. Still on WowUp Optional.
- **Raider.IO Talent Builds**: left-click a build to load it. Auto-open once per party or raid instance.
- Magguu chat size still applies. Magguu does not join, leave, or hide Services — you manage that channel.

### Additional features

- Needs **EllesmereUI 9.0.6+** (live **9.2.9**). Download MagguuUI and EllesmereUI from CurseForge, Wago, or WoWInterface.
- Gold Setup is **Apply Magguu profiles**. Below it: **Apply Magguu Settings** and **Load profiles**. Scale \`0.58\`. Magguu Settings is overlay/QoL only. Load profiles switches existing Magguu profiles; it does not re-import them.
- **Apply Magguu profiles** writes the HUD Edit Mode layout **MagguuUI** once.
- Ellesmere start popup is skipped; MagguuUI Setup opens on that login.
- **WowUp starter:** EllesmereUI, MagguuUI, BigWigs, LittleWigs, Northern Sky, EXBoss, EXCore. **Optional:** BugGrabber, BugSack, HandyNotes, HandyNotes MapNotes, MDT, Raider.IO, Simulationcraft, Talent Tree Tweaks, Whisper Messenger, Waypoint UI, GTFO, Premade Groups Filter, Auctionator, Smart Reminders.
- **Skinning** is one **NAMES & COLORS** section (two columns): split unit-frame names, split party and raid names, and class-colored keybind modifiers. Magguu Settings turns these on; reset turns them off.
- **QoL** includes party and raid item level (and 2P/4P) and **Boiling Point**. AuraBuff counts stay centered.
- **Apply Magguu profiles** turns on **Targeted Spell Bars**.
- Setup import buttons: BigWigs, Northern Sky, EXBoss, Whisper Messenger, Smart Reminders.

### Install notes

- Download **MagguuUI** and **EllesmereUI 9.0.6+** from CurseForge, Wago, or WoWInterface, and leave them enabled.
- Open \`/mui\` and run **Apply Magguu profiles**.
- BigWigs, LittleWigs, Northern Sky, EXBoss, and EXCore are in the WowUp starter list. MagguuUI still loads without them.
- Works on WoW 12.1 and still loads on Midnight 12.0.
- UI is available in every WoW client language MagguuUI ships.`,
} as const

export const PREVIOUS_ADDON_CHANGELOGS = [
  {
    version: 'v12.1.5',
    publishedAt: new Date('2026-09-21T00:00:00Z'),
    content: `Ready for WoW 12.1. Open MagguuUI with \`/mui\`.

### What's new

- Setup splits **First install** from **Already installed**. Gold **Apply Magguu profiles** is the first install.
- **Apply Magguu Settings** and **Load on this character** sit under Already installed and do not reinstall profiles.
- **Include Magguu Settings** starts on. Afterwards Magguu Settings is overlay and QoL only.
- **HandyNotes MapNotes** settings apply with HandyNotes.
- **Raider.IO Talent Builds**: left-click a build to load it.
- Magguu does not join, leave, or hide Services.`,
  },
  {
    version: 'v12.1.4',
    publishedAt: new Date('2026-09-11T00:00:00Z'),
    content: `Ready for WoW 12.1. Open MagguuUI with \`/mui\`.

### What's new

- **Smart Reminders** can be imported from Setup. **Apply Magguu profiles** also imports it.
- HandyNotes, Talent Tree Tweaks, GTFO, BugSack, and Premade Groups Filter apply with **Apply Magguu profiles** and **Load profiles**.
- **HandyNotes MapNotes** settings apply with HandyNotes.
- The BigWigs keystone viewer stays closed when a Mythic+ run ends.`,
  },
  {
    version: 'v12.1.3',
    publishedAt: new Date('2026-09-09T00:00:00Z'),
    content: `Ready for WoW 12.1. Open MagguuUI with \`/mui\`.

### What's new

- Updated Magguu profiles for EllesmereUI, BigWigs, Northern Sky, EXBoss, WIM, and Waypoint UI. Use **Apply Magguu profiles**.
- KeystoneLoot is no longer part of MagguuUI.
- **Auctionator** is on the WowUp optional list.
- **Apply Magguu profiles** turns on **Targeted Spell Bars**.`,
  },
] as const

const PUBLISHED_CHANGELOG_REPLACEMENTS = [
  [' Leave **EXBoss MythicCast OFF**.', ''],
  [' Leave **EXBoss MythicCast off**.', ''],
  [' Leave EXBoss MythicCast OFF.', ''],
  [' Leave EXBoss MythicCast off.', ''],
  [' (via Ellesmere; leave EXBoss MythicCast off)', ''],
  [' (leave EXBoss MythicCast off)', ''],
  ['it does not reimport the bake', 'it does not re-import profiles'],
  [
    'Bundled MagguuUI profiles recaptured from MagguuUI Tools (bake 9.0.8 on Ellesmere live 9.1.6; Northern Sky and EXBoss).',
    'Bundled MagguuUI profiles include Northern Sky and EXBoss.',
  ],
] as const

export function scrubPublishedChangelog(text: string): string {
  let next = text
  for (const [from, to] of PUBLISHED_CHANGELOG_REPLACEMENTS) {
    next = next.split(from).join(to)
  }
  return next
}
