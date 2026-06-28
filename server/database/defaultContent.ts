export const DEFAULT_HOME_CONTENT = [
  { page: 'home', section: 'hero', key: 'title', value: 'Your WoW Interface,', type: 'text', sortOrder: 0, locale: 'en' },
  { page: 'home', section: 'hero', key: 'title2', value: 'perfected.', type: 'text', sortOrder: 1, locale: 'en' },
  { page: 'home', section: 'hero', key: 'subtitle', value: 'A complete WoW UI, ready in minutes.', type: 'text', sortOrder: 2, locale: 'en' },
  { page: 'home', section: 'hero', key: 'description', value: 'MagguuUI is a standalone in-game installer that configures ElvUI, Platynator, Plater, BigWigs, Details, Method Raid Tools and 30+ more addons for you. Click Install All once and every addon you actually use is set up — missing integrations are skipped automatically.', type: 'text', sortOrder: 3, locale: 'en' },
  { page: 'home', section: 'hero', key: 'badge', value: 'Ready for WoW 12.0.7', type: 'text', sortOrder: 4, locale: 'en' },

  { page: 'home', section: 'features', key: 'feature_1_title', value: 'One-click setup', type: 'text', sortOrder: 0, locale: 'en' },
  { page: 'home', section: 'features', key: 'feature_1_text', value: 'Install MagguuUI, log in once, click **Install All**. Every supported addon you have enabled gets its profile applied in the right order. Missing addons are skipped automatically, and ElvUI is optional.', type: 'text', sortOrder: 1, locale: 'en' },
  { page: 'home', section: 'features', key: 'feature_1_icon', value: 'i-heroicons-cursor-arrow-rays', type: 'text', sortOrder: 2, locale: 'en' },

  { page: 'home', section: 'features', key: 'feature_2_title', value: 'Always up to date', type: 'text', sortOrder: 3, locale: 'en' },
  { page: 'home', section: 'features', key: 'feature_2_text', value: 'Profiles are tuned for the current WoW patch and updated regularly. MagguuUI tells you in chat or via popup whenever a new version is available — and the in-game changelog shows you exactly what changed.', type: 'text', sortOrder: 4, locale: 'en' },
  { page: 'home', section: 'features', key: 'feature_2_icon', value: 'i-heroicons-arrow-path', type: 'text', sortOrder: 5, locale: 'en' },

  { page: 'home', section: 'features', key: 'feature_3_title', value: 'Useful extras built in', type: 'text', sortOrder: 6, locale: 'en' },
  { page: 'home', section: 'features', key: 'feature_3_text', value: 'Use class layouts, adjustable item-level colors, AutoRoll, audio switching and a compact Mythic+ keystone list with teleport buttons, group-join banners and remembered positioning.', type: 'text', sortOrder: 7, locale: 'en' },
  { page: 'home', section: 'features', key: 'feature_3_icon', value: 'i-heroicons-cube-transparent', type: 'text', sortOrder: 8, locale: 'en' },

  { page: 'home', section: 'features_heading', key: 'title', value: 'Why MagguuUI?', type: 'text', sortOrder: 0, locale: 'en' },
  { page: 'home', section: 'features_heading', key: 'subtitle', value: 'Everything you need — in one package', type: 'text', sortOrder: 1, locale: 'en' },

  { page: 'home', section: 'addons', key: 'title', value: 'Supported Addons', type: 'text', sortOrder: 0, locale: 'en' },
  { page: 'home', section: 'addons', key: 'subtitle', value: 'Profiles for 30+ of the most popular WoW addons', type: 'text', sortOrder: 1, locale: 'en' },
] as const

export const DEFAULT_GUIDE_CONTENT = [
  { page: 'guide', section: 'intro', key: 'title', value: 'Installation Guide', locale: 'en', type: 'text', sortOrder: 0 },
  { page: 'guide', section: 'intro', key: 'text', value: 'Getting started takes about five minutes. Install MagguuUI, add whichever supported addons you want, log in, and click Install All. Done — your UI is ready to play.', locale: 'en', type: 'text', sortOrder: 1 },

  { page: 'guide', section: 'steps', key: 'step_1_title', value: '1. Install MagguuUI', locale: 'en', type: 'text', sortOrder: 10 },
  { page: 'guide', section: 'steps', key: 'step_1', value: 'Get MagguuUI from **CurseForge**, **Wago Addons**, **WoWInterface**, or the latest [GitHub release](https://github.com/Derpsen/MagguuUI/releases/latest).\n\nAddon managers install both included folders automatically. For a manual GitHub install, extract the ZIP and copy both `MagguuUI` and `MagguuUI_Data` into `World of Warcraft\\_retail_\\Interface\\AddOns\\`. Keep the data addon enabled — the installer loads it only when needed.', locale: 'en', type: 'markdown', sortOrder: 11 },

  { page: 'guide', section: 'steps', key: 'step_2_title', value: '2. Add the addons you want', locale: 'en', type: 'text', sortOrder: 20 },
  { page: 'guide', section: 'steps', key: 'step_2', value: 'MagguuUI runs on its own. Install only the supported addons you actually want it to configure — for example Platynator or Plater, BigWigs or EXBoss, Details, MRT, and your preferred cooldown addon. Anything missing is skipped automatically.\n\n**ElvUI is optional.** Install ElvUI 15.12 or newer only if you want the ElvUI profile or MagguuUI\'s ElvUI-specific tags. MagguuUI itself and its installer still load without ElvUI.', locale: 'en', type: 'markdown', sortOrder: 21 },

  { page: 'guide', section: 'steps', key: 'step_3_title', value: '3. Log in and open the installer', locale: 'en', type: 'text', sortOrder: 30 },
  { page: 'guide', section: 'steps', key: 'step_3', value: 'Pick the character you want to set up first (usually your main) and log in.\n\nThe **MagguuUI Installer** opens automatically the first time you launch the game with the addon installed. If you closed it, you can re-open it any time:\n\n- Type `/mui` or `/mui install` in chat\n- Click the **MagguuUI minimap button** (left-click)\n- Open Blizzard *Game Menu → Options → AddOns → MagguuUI* and hit **Open Installer**', locale: 'en', type: 'markdown', sortOrder: 31 },

  { page: 'guide', section: 'steps', key: 'step_4_title', value: '4. Click Install All', locale: 'en', type: 'text', sortOrder: 40 },
  { page: 'guide', section: 'steps', key: 'step_4', value: 'On the **Setup** tab, click **Install All**. MagguuUI applies the correct profile to every supported addon you have installed, in the right order. Optional addons that are missing are skipped automatically — you do not need them all.\n\nA **toast notification** confirms when Install All finishes. If the flow hits a conflict chooser (e.g. Plater vs Platynator, BCM vs Ayije_CDM) the installer reloads the UI and resumes automatically on next login — no progress lost.\n\nWhen the installer is done it asks for a **UI reload**. Confirm it, and your new UI is live.\n\n*Prefer to pick and choose?* Use the **Expert** tab instead — there you can filter by category (Core / Cooldowns / Nameplates / Layouts / Optional) and install profiles individually.', locale: 'en', type: 'markdown', sortOrder: 41 },

  { page: 'guide', section: 'steps', key: 'step_5_title', value: '5. Set up your alts', locale: 'en', type: 'text', sortOrder: 50 },
  { page: 'guide', section: 'steps', key: 'step_5', value: 'Profiles are stored per account, so once your main character is set up your other characters get a much shorter flow.\n\nLog in on an alt and you will see a **Load Profiles** popup instead of the full installer. Confirm it and the existing MagguuUI profiles are applied to the alt. You can also run `/mui load` manually any time.\n\nClass-specific cooldown layouts are re-applied automatically when you change specialization.', locale: 'en', type: 'markdown', sortOrder: 51 },

  { page: 'guide', section: 'steps', key: 'step_6_title', value: '6. Customize and stay updated', locale: 'en', type: 'text', sortOrder: 60 },
  { page: 'guide', section: 'steps', key: 'step_6', value: 'A few things worth knowing once everything is running:\n\n**Slash commands:**\n- `/mui` — open the installer\n- `/mui settings` — open MagguuUI settings\n- `/mui changelog` — read the latest changes in-game\n- `/mui load` — load profiles on the current character\n- `/mui minimap` — toggle the minimap button\n- `/mui version` — show the installed version\n- `/muiaudio` — cycle configured audio outputs\n- `/muiautoroll` — control automatic loot rolls\n- `/muikeys` or `/muikeystones` — toggle and position the Keystone List\n- `/cd` — cooldown layout settings\n- `/em` — Blizzard EditMode\n\n**Keystone List** — an optional compact Mythic+ list with party keys, click-to-teleport, a cast bar inside the dungeon icon and a scalable group-join banner. Row direction, icon borders, visibility and banner position are configurable and remembered.\n\n**Custom ElvUI tags** — `[mui:ilvl]` shows item level and `[mui:ilvl:setbonus]` also shows the current tier bonus. You can choose exactly when green, blue, purple and orange item-level colors begin. These tags only need ElvUI; the rest of MagguuUI does not.\n\n**Minimap button** — left-click opens the installer, shift+left-click reloads the UI, right-click opens the Great Vault, shift+right-click opens Settings, and middle-click opens the Changelog. Hide the button with `/mui minimap`.\n\n**Audio and AutoRoll** — choose your preferred audio outputs and opt into automatic rolls per category. Both features stay off until you configure them.\n\nWhen a new version is released MagguuUI shows a chat hint or popup, depending on your setting. After you dismiss a version, that same version will not notify you again.', locale: 'en', type: 'markdown', sortOrder: 61 },
] as const

export const DEFAULT_FAQS = [
  // ─── General ──────────────────────────────────────
  {
    category: 'general',
    question: 'What is MagguuUI?',
    answer: `MagguuUI is a **World of Warcraft UI pack** that configures your entire interface in one click.

Instead of spending hours tweaking ElvUI, Plater, BigWigs, Details, Method Raid Tools and the rest, you install MagguuUI, hit **Install All**, and a curated profile is applied to each supported addon.

The result: a clean, ready-to-play UI in a few minutes.`,
    sortOrder: 0,
  },
  {
    category: 'general',
    question: 'Is MagguuUI free?',
    answer: `**Yes — free and open source** under the GPL v3.0 license.

You can download it from:
- [CurseForge](https://www.curseforge.com/wow/addons)
- [Wago Addons](https://addons.wago.io/)
- [WoWInterface](https://www.wowinterface.com/)

There is no paid tier, no premium content, and no ads.`,
    sortOrder: 1,
  },
  {
    category: 'general',
    question: 'Do I need every supported addon?',
    answer: `**No. Every integration is optional, including ElvUI.**

MagguuUI detects which of the 30+ supported addons you have enabled, configures those, and automatically skips the rest. Install ElvUI only if you want the ElvUI profile or ElvUI-specific tags. You can add more addons later and run **Install All** again to configure them.`,
    sortOrder: 2,
  },
  {
    category: 'general',
    question: 'Will MagguuUI overwrite my existing profiles?',
    answer: `No. MagguuUI creates its own profile — literally named **"MagguuUI"** — inside each supported addon, so your personal profiles stay untouched.

If a MagguuUI profile from a previous install is found, the installer will ask before overwriting it.`,
    sortOrder: 3,
  },
  {
    category: 'general',
    question: 'Which languages does MagguuUI support?',
    answer: `MagguuUI ships with **11 localizations**, matching the WoW retail client locales:

**enUS / enGB, deDE, frFR, esES, esMX, ruRU, ptBR, itIT, koKR, zhCN, zhTW**

The addon picks up your client locale automatically — no manual switch needed. Translation coverage varies per language; enUS and deDE are complete, others are partial and improving each release.`,
    sortOrder: 4,
  },

  // ─── Installation & Setup ─────────────────────────
  {
    category: 'installation',
    question: 'How do I set up MagguuUI from scratch?',
    answer: `Five steps, takes about two minutes:

1. Install **MagguuUI** from CurseForge, Wago Addons, or WoWInterface
2. Install whichever supported addons you want MagguuUI to configure
3. Log in on your main character — the installer opens automatically
4. Click **Install All**
5. Confirm the UI reload when prompted

That's it. You're done.`,
    sortOrder: 0,
  },
  {
    category: 'installation',
    question: 'I missed the installer popup — how do I open it again?',
    answer: `Any of these will re-open it:

- Type \`/mui\` or \`/mui install\` in chat
- Click the **MagguuUI minimap button** (left-click)
- Open it from **Game Menu → Options → AddOns → MagguuUI**

The auto-popup only fires on first login per character. After that, you open it manually whenever you need.`,
    sortOrder: 1,
  },
  {
    category: 'installation',
    question: 'Do I have to repeat everything on my alts?',
    answer: `No — alts are much faster.

After one successful **Install All** on your account, MagguuUI shows a shorter **Load Profiles** popup on alts instead of the full installer. Just confirm it and the existing profiles are applied.

You can also run \`/mui load\` manually if the popup didn't appear.`,
    sortOrder: 2,
  },
  {
    category: 'installation',
    question: 'Can I use MagguuUI without ElvUI?',
    answer: `**Yes.** MagguuUI and its installer work without ElvUI.

ElvUI 15.12 or newer is only needed if you want MagguuUI to import its ElvUI profile or if you use the \`[mui:*]\` ElvUI tags. All other installed integrations continue to work on their own.`,
    sortOrder: 3,
  },

  // ─── Addons & Profiles ────────────────────────────
  {
    category: 'addons',
    question: 'Which addons does Install All configure?',
    answer: `**Main integrations** (configured whenever installed):
- ElvUI (optional)
- BetterCooldownManager (or Ayije_CDM)
- Blizzard EditMode
- Plater (or Platynator)
- BigWigs (or EXBoss)
- Details (+ Details iLvl)
- **Method Raid Tools (MRT)** — notes, cooldown assignments, marks, raid groups, timers

**More supported integrations:** BuffReminders, TargetedSpells, MiniCC, MinimalistCooldownEdge, ElvUI_WindTools, ExwindTools, Northern Sky Raid Tools, HandyNotes (+ MapNotes), Easy Experience Bar, WIM, GTFO, BugSack, GroupfinderFlags, Falcon, CursorTrail, M+ Timer, Plumber, WaypointUI, Talent Tree Tweaks, BliZzi Interrupts and more — 30+ supported addons in total.

MagguuUI configures whichever of these are enabled — missing addons are skipped automatically.`,
    sortOrder: 0,
  },
  {
    category: 'addons',
    question: 'How do class layouts work?',
    answer: `MagguuUI ships **pre-built cooldown layouts** for every class and specialization.

The correct layout is applied automatically when you change spec — no fiddling with cooldowns when respeccing for Mythic+, Raid, or PvP.

You can re-apply layouts manually from the installer at any time, or run \`/cd\` for the cooldown layout settings.`,
    sortOrder: 1,
  },
  {
    category: 'addons',
    question: 'What are the `[mui:ilvl]` tags?',
    answer: `Two native **ElvUI tags** that drop current gear info into any unitframe name text:

- \`[mui:ilvl]\` — bare item level
- \`[mui:ilvl:setbonus]\` — item level plus current tier set bonus (2P / 4P)

They use **LibOpenRaid** for instant group reads and fall back to a throttled Inspect queue for anyone else.

Master toggle sits in **Settings → Tags** (off by default — enable it once, then use the tags anywhere in ElvUI's unitframe tag strings).`,
    sortOrder: 2,
  },
  {
    category: 'addons',
    question: "What's the difference between Install All and Load Profiles?",
    answer: `**Install All** — full first-time setup. Re-imports every profile fresh. Run this on your main.

**Load Profiles** — lightweight flow for alts. Just activates the profiles already in saved variables, without re-importing them.

Rule of thumb: *Install All* on your main, *Load Profiles* on alts.`,
    sortOrder: 3,
  },
  {
    category: 'addons',
    question: 'What are the WowUp Starter / Optional strings?',
    answer: `[WowUp](https://wowup.io/) is a popular WoW addon manager. The **Starter** and **Optional** lists on this site are import strings you can paste into WowUp to install a useful starter set or browse the wider list of supported integrations.

They are recommendations, not requirements. Using CurseForge, Tukui Client, or another manager? You can safely ignore them.`,
    sortOrder: 4,
  },
  {
    category: 'addons',
    question: 'Why are my action bar keybinds tinted in my class color?',
    answer: `That's the **MagguuUI ColorModifiers** module recoloring the modifier letters (a / s / 1 / etc.) on your ElvUI action bars in your class color, so binds read at a glance.

It only affects the modifier hint text, not the icons, and it follows your live ElvUI class-color setting. You can switch it off any time under \`/mui settings\` → **General** → *Class-color keybinds*.

Without ElvUI loaded, the module silently does nothing — there are no bars to recolor.`,
    sortOrder: 5,
  },
  {
    category: 'addons',
    question: 'How does the audio output switcher work?',
    answer: `MagguuUI lets you flag a subset of your system audio outputs in **Settings → Audio** and cycle through them in three ways:

- **Draggable on-screen button** — left-click cycles, right-click picks a specific device, shift-drag to move. Hide it again any time from Settings.
- **Chat-frame voice icon** — right-click the small voice/channel icon next to the chat tabs to cycle without leaving combat focus.
- **Slash command** — \`/muiaudio\` (or \`/mui audio\`) cycles. Sub-commands: \`config\` (open the config popup), \`on\` / \`off\` (master toggle), \`list\` (print every detected device with its index) and \`pick N\` (switch directly to the device with that index).

If only one device is flagged, the cycle commands are a no-op — there is nothing to switch between.`,
    sortOrder: 6,
  },
  {
    category: 'addons',
    question: 'Can MagguuUI auto-roll on loot for me?',
    answer: `**Yes — opt-in per category.**

Open \`/mui settings\` → **AutoRoll** tab and toggle the categories you want auto-rolled:

- **Toys** — Need
- **Mounts** — Need
- **Recipes** — Need
- **Housing** — Need
- **Transmog** — Greed (when you're missing the appearance)

Combat-safe queue (rolls are deferred until combat ends), adjustable delay, BoE-popup auto-confirm so the *"This is BoE, are you sure?"* dialog doesn't block the roll, and a **loot-council conflict warning** that pauses auto-rolls when raid leadership is distributing manually.

Slash command: \`/muiautoroll on / off / toggle / status / delay N / settings\`.`,
    sortOrder: 7,
  },
  {
    category: 'addons',
    question: 'What is MagguuUI Data — the second addon in my list?',
    answer: `From v12.0.22 onwards MagguuUI ships its curated profile strings in a separate **LoadOnDemand sub-addon** called *MagguuUI Data*. You will see it nested under MagguuUI in the WoW AddOns picker, marked *"Only loadable on demand"*.

This is intentional. **Leave it enabled.** The main addon loads it lazily the moment you open the installer or run *Install All*. Keeping the data separate means a settings reset never wipes the bundled profiles, and the package is smaller in memory while you're not actively installing.

If you disable it by accident, the installer will tell you the data package is missing and abort — re-enable it and reload.`,
    sortOrder: 8,
  },
  {
    category: 'addons',
    question: 'What are the Dev Tools? I see them after some clicks.',
    answer: `**The Dev Tools tab is for addon authors and pack maintainers.** Most users never need it.

It's hidden by default. To unlock it: click the installer title bar **5 times** in a row, or run \`/mui dev\`. To re-lock: \`/mui dev off\`.

Once unlocked, you get sub-tabs for **Info / Actions / Status / Exports / CVars**. The Exports tab is the *Pack system* — capture every supported addon's current profile as a snapshot, group snapshots into named packs, and copy the whole pack as Lua to ship a curated build.

If you're a regular user and you accidentally unlocked it, just type \`/mui dev off\` and it disappears.`,
    sortOrder: 9,
  },
  {
    category: 'addons',
    question: 'What does the Keystone List do?',
    answer: `The optional **Keystone List** shows Mythic+ keys for you and your party in a compact movable list.

It supports click-to-teleport, a small teleport cast bar inside the dungeon icon, shift-click chat posting, mirrored rows, per-context visibility and a scalable Group Finder join banner. The banner uses dungeon icons, colors player names and remembers where you moved it.

Open it with \`/muikeys\` or \`/muikeystones\`, then use the Keystone List section in MagguuUI settings to choose exactly which parts you want.`,
    sortOrder: 10,
  },
  {
    category: 'addons',
    question: 'Can I choose the item-level color thresholds?',
    answer: `**Yes.** Under **Settings → Tags → Gear**, enable item-level coloring and choose where the green, blue, purple and orange ranges begin.

The thresholds affect MagguuUI's \`[mui:ilvl]\` and \`[mui:ilvl:setbonus]\` ElvUI tags. The tags remain optional and output nothing when their master switch is disabled.`,
    sortOrder: 11,
  },

  // ─── Troubleshooting ──────────────────────────────
  {
    category: 'troubleshooting',
    question: "Install All didn't do anything",
    answer: `Check these four things:

1. **MagguuUI Data is enabled** — the installer needs the bundled LoadOnDemand data addon
2. **At least one supported addon is enabled** — missing integrations are skipped by design
3. **Not in combat** — MagguuUI waits until combat ends before applying profiles
4. **UI reload confirmed** — required after profiles finish installing

If those look fine, run \`/mui install\` to re-open the installer and try again. The progress screen now continues past missing addons instead of waiting on them. You can also \`/reload\` manually if the final prompt did not appear.`,
    sortOrder: 0,
  },
  {
    category: 'troubleshooting',
    question: "I don't see update hints in chat or as a popup",
    answer: `Open \`/mui settings\` → **General** tab and check **Update Hint Mode**. If it's set to **Disabled**, no hints will appear for new versions.

Note: once you click **"Got it"** on a version popup, *that specific version* will not notify you again — you'll only see hints for newer releases after that.`,
    sortOrder: 1,
  },
  {
    category: 'troubleshooting',
    question: 'How do I reset MagguuUI and start fresh?',
    answer: `Open \`/mui settings\` → **General** tab and use **Hard Reset**.

This wipes all MagguuUI saved variables and sends you back through the full installer on next reload. Your other addons keep their own profiles — only the MagguuUI-managed profiles will be re-imported when you click **Install All** again.`,
    sortOrder: 2,
  },
  {
    category: 'troubleshooting',
    question: 'Where can I report a bug or ask for help?',
    answer: `Best places for bug reports and questions:

- **CurseForge / Wago / WoWInterface** comments and issues tabs
- **GitHub** link in the footer
- **Email** link in the footer

When reporting a bug, please include:
- Your WoW version
- Your ElvUI version, if you use ElvUI
- Your MagguuUI version (run \`/mui version\`)

This makes fixes much faster.`,
    sortOrder: 3,
  },
] as const

export const DEFAULT_SITE_CONTENT = [
  ...DEFAULT_HOME_CONTENT,
  ...DEFAULT_GUIDE_CONTENT,
] as const
