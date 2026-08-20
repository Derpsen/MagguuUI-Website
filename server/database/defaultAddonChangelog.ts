export const CURRENT_ADDON_CHANGELOG = {
  version: 'v12.0.25',
  publishedAt: new Date('2026-08-20T00:00:00Z'),
  content: `### Native EllesmereUI overhaul

- Replaced the standalone MagguuUI installer and options UI with a native EllesmereUI module.
- Ships one AddOns folder with nested EUI, Data, and Media. Delete leftover top-level MagguuUI_Data / MagguuUI_EUI / MagguuUI_Media copies if an older install left them beside MagguuUI.
- MagguuUI is one sidebar row (Optionen) with three tabs: Setup, Skinning, and QoL.
- Setup is install-only: full 4K install, individual profiles, presets, Edit Mode copy, and a standalone 4K scale action.
- Skinning holds split coloring for unit and party/raid frames plus class-colored keybind modifiers.
- QoL: death-release protection, co-tank frame and debuffs, stealth and stance reminders, spell-alert opacity, and per-spec proc-overlay hiding.
- Export and Discord boost tools stay off the normal sidebar. Open them with \`/mui tools\`, or unlock Werkzeuge by clicking the MagguuUI group header ten times.
- Class layouts import as \`Magguu - <Class> <Spec>\` from the current retail Cooldown Viewer data.
- BigWigs gets a native MagguuUI bar style. Method Raid Tools setup is replaced by Northern Sky Raid Tools.
- Blizzard Edit Mode uses a copy/paste import so addon code never writes protected layout state.`,
} as const
