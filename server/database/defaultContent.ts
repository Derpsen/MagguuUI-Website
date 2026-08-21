export const DEFAULT_HOME_CONTENT = [
  { page: 'home', section: 'hero', key: 'title', value: 'Your WoW Interface,', type: 'text', sortOrder: 0, locale: 'en' },
  { page: 'home', section: 'hero', key: 'title2', value: 'perfected.', type: 'text', sortOrder: 1, locale: 'en' },
  { page: 'home', section: 'hero', key: 'subtitle', value: 'A native 4K overhaul for EllesmereUI.', type: 'text', sortOrder: 2, locale: 'en' },
  { page: 'home', section: 'hero', key: 'description', value: 'MagguuUI is a native EllesmereUI module for WoW Retail. Install <strong>EllesmereUI</strong> and the single <strong>MagguuUI</strong> folder, then open <code>/mui</code> and run the 4K setup. BigWigs and Northern Sky Raid Tools stay optional.', type: 'html', sortOrder: 3, locale: 'en' },
  { page: 'home', section: 'hero', key: 'badge', value: 'Ready for WoW 12.0', type: 'text', sortOrder: 4, locale: 'en' },

  { page: 'home', section: 'features', key: 'feature_1_title', value: 'Native Ellesmere setup', type: 'text', sortOrder: 0, locale: 'en' },
  { page: 'home', section: 'features', key: 'feature_1_text', value: 'One sidebar row with Setup, Skinning, QoL, and Profile. Setup runs the 4K install and Magguu-Look. Profile imports Magguu strings. Werkzeuge exports your live profiles.', type: 'text', sortOrder: 1, locale: 'en' },
  { page: 'home', section: 'features', key: 'feature_1_icon', value: 'i-heroicons-cursor-arrow-rays', type: 'text', sortOrder: 2, locale: 'en' },

  { page: 'home', section: 'features', key: 'feature_2_title', value: 'Current Retail layouts', type: 'text', sortOrder: 3, locale: 'en' },
  { page: 'home', section: 'features', key: 'feature_2_text', value: 'Cooldown Viewer class layouts import as <strong>Magguu - Class Spec</strong>. MagguuUI copies an Edit Mode layout for you to paste and never writes protected Blizzard layout state itself.', type: 'html', sortOrder: 4, locale: 'en' },
  { page: 'home', section: 'features', key: 'feature_2_icon', value: 'i-heroicons-squares-2x2', type: 'text', sortOrder: 5, locale: 'en' },

  { page: 'home', section: 'features', key: 'feature_3_title', value: 'Skinning and QoL included', type: 'text', sortOrder: 6, locale: 'en' },
  { page: 'home', section: 'features', key: 'feature_3_text', value: 'Split unit and group names, class-colored keybind modifiers, death-release protection, co-tank frames, stealth reminders, and spell-alert opacity live in the MagguuUI profile.', type: 'text', sortOrder: 7, locale: 'en' },
  { page: 'home', section: 'features', key: 'feature_3_icon', value: 'i-heroicons-sparkles', type: 'text', sortOrder: 8, locale: 'en' },

  { page: 'home', section: 'features_heading', key: 'title', value: 'Why MagguuUI?', type: 'text', sortOrder: 0, locale: 'en' },
  { page: 'home', section: 'features_heading', key: 'subtitle', value: 'A 4K EllesmereUI setup with optional raid tools', type: 'text', sortOrder: 1, locale: 'en' },

  { page: 'home', section: 'addons', key: 'title', value: 'Supported Addons', type: 'text', sortOrder: 0, locale: 'en' },
  { page: 'home', section: 'addons', key: 'subtitle', value: 'EllesmereUI is required. BigWigs, LittleWigs, and Northern Sky Raid Tools are optional.', type: 'text', sortOrder: 1, locale: 'en' },
] as const

export const DEFAULT_GUIDE_CONTENT = [
  { page: 'guide', section: 'intro', key: 'title', value: 'Installation Guide', locale: 'en', type: 'text', sortOrder: 0 },
  { page: 'guide', section: 'intro', key: 'text', value: 'Install EllesmereUI, add the MagguuUI folder, then open /mui and run the 4K setup. BigWigs, LittleWigs, and Northern Sky Raid Tools are optional.', locale: 'en', type: 'text', sortOrder: 1 },

  { page: 'guide', section: 'steps', key: 'step_1_title', value: '1. Install EllesmereUI', locale: 'en', type: 'text', sortOrder: 10 },
  { page: 'guide', section: 'steps', key: 'step_1', value: 'MagguuUI is a native EllesmereUI module. Install **EllesmereUI 7.9.5 or newer** first from CurseForge, Wago, or WoWInterface.\n\nWithout EllesmereUI, MagguuUI will not load.', locale: 'en', type: 'markdown', sortOrder: 11 },

  { page: 'guide', section: 'steps', key: 'step_2_title', value: '2. Install MagguuUI', locale: 'en', type: 'text', sortOrder: 20 },
  { page: 'guide', section: 'steps', key: 'step_2', value: 'Get MagguuUI from **CurseForge**, **Wago Addons**, **WoWInterface**, or the latest [GitHub release](https://github.com/Derpsen/MagguuUI/releases/latest).\n\nThe download is **one folder**: `MagguuUI`, with `EUI`, `Data`, and `Media` nested inside it. Copy that folder into `World of Warcraft\\_retail_\\Interface\\AddOns\\`.\n\nIf an older install left `MagguuUI_Data`, `MagguuUI_EUI`, or `MagguuUI_Media` next to MagguuUI, delete those leftover folders. WoW does not load nested TOC files.', locale: 'en', type: 'markdown', sortOrder: 21 },

  { page: 'guide', section: 'steps', key: 'step_3_title', value: '3. Add optional raid tools', locale: 'en', type: 'text', sortOrder: 30 },
  { page: 'guide', section: 'steps', key: 'step_3', value: 'Only EllesmereUI is required. Install extra addons only if you want MagguuUI to configure them:\n\n- **BigWigs** — encounter timers, MagguuUI bar style, and bundled callout sounds\n- **LittleWigs** — dungeon timers for BigWigs\n- **Northern Sky Raid Tools** — raid notes and alerts\n\nMissing addons are skipped. A WowUp starter pack on the Strings page installs those together.', locale: 'en', type: 'markdown', sortOrder: 31 },

  { page: 'guide', section: 'steps', key: 'step_4_title', value: '4. Open Setup and install 4K', locale: 'en', type: 'text', sortOrder: 40 },
  { page: 'guide', section: 'steps', key: 'step_4', value: 'Log in, then open MagguuUI:\n\n- Type `/mui` or `/mui setup` in chat\n- Or open EllesmereUI and choose **MagguuUI → Optionen → Setup**\n\nRun the **4K install**. MagguuUI imports the Ellesmere profile at UI scale `0.58`, then BigWigs and Northern Sky if they are present, then Cooldown Viewer class layouts. Out-of-combat only — protected actions wait until combat ends.\n\nOn the same tab you can apply **Magguu-Look** or reapply scale `0.58`.\n\nPer-addon Magguu imports live on the **Profile** tab. Logging in on an alt asks whether to load those profiles onto that character.', locale: 'en', type: 'markdown', sortOrder: 41 },

  { page: 'guide', section: 'steps', key: 'step_5_title', value: '5. Skinning and QoL', locale: 'en', type: 'text', sortOrder: 50 },
  { page: 'guide', section: 'steps', key: 'step_5', value: 'Stay in **MagguuUI → Optionen**:\n\n- **Skinning** — split coloring for unit frames and party/raid names, plus class-colored keybind modifiers\n- **QoL** — death-release protection, co-tank frame and debuffs, stealth and stance reminders, spell-alert opacity, and per-spec proc-overlay hiding\n\nThese settings live in the MagguuUI Ellesmere profile. The Magguu accent-color toggle is no longer in the UI.', locale: 'en', type: 'markdown', sortOrder: 51 },

  { page: 'guide', section: 'steps', key: 'step_6_title', value: '6. Commands and tools', locale: 'en', type: 'text', sortOrder: 60 },
  { page: 'guide', section: 'steps', key: 'step_6', value: '**Slash commands:**\n- `/mui` or `/magguu` — open MagguuUI → Setup\n- `/mui setup` — Setup tab\n- `/mui qol` — QoL tab\n- `/mui profile` — Profile tab (import)\n- `/mui tools`, `/mui export`, or `/mui werkzeuge` — hidden Werkzeuge (exports and Discord boost)\n\nWerkzeuge stay off the normal sidebar. Type `/mui tools`, or click the **MagguuUI** group header ten times to unlock the row permanently.\n\nAfter a successful Cooldown Viewer import MagguuUI reloads immediately so the layouts stick.', locale: 'en', type: 'markdown', sortOrder: 61 },
] as const

export const DEFAULT_FAQS = [
  {
    category: 'general',
    question: 'What is MagguuUI?',
    answer: `MagguuUI is a **native 4K overhaul and curated profile companion for EllesmereUI** on World of Warcraft Retail.

It has no standalone installer and no separate options window. Everything lives in EllesmereUI under **MagguuUI → Optionen**.

Install EllesmereUI plus the MagguuUI folder, open \`/mui\`, and run the 4K setup.`,
    sortOrder: 0,
  },
  {
    category: 'general',
    question: 'Is MagguuUI free?',
    answer: `**Yes — free and open source** under the GPL v3.0 license.

You can download it from:
- [CurseForge](https://www.curseforge.com/wow/addons/magguuui)
- [Wago Addons](https://addons.wago.io/addons/5NR84pK3)
- [WoWInterface](https://www.wowinterface.com/downloads/info27061)

There is no paid tier, no premium content, and no ads.`,
    sortOrder: 1,
  },
  {
    category: 'general',
    question: 'Which addons do I actually need?',
    answer: `You need two things:

- **EllesmereUI 7.9.5+** — required host UI
- **MagguuUI** — one AddOns folder with nested EUI, Data, and Media

**BigWigs**, **LittleWigs**, and **Northern Sky Raid Tools** are optional. MagguuUI configures them when they are installed and skips them otherwise.`,
    sortOrder: 2,
  },
  {
    category: 'general',
    question: 'Will MagguuUI overwrite my existing profiles?',
    answer: `No. MagguuUI creates its own Ellesmere profile named **"MagguuUI"** and class layouts named **"Magguu - Class Spec"**, so your personal profiles stay untouched.

If a MagguuUI profile from a previous install is found, the import will ask before overwriting it.`,
    sortOrder: 3,
  },
  {
    category: 'general',
    question: 'Which WoW version does MagguuUI support?',
    answer: `MagguuUI targets **WoW Retail 12.0** (TOC interfaces 120000–120100), including current Midnight patches.

It depends on **EllesmereUI 7.9.5 or newer**. Classic and other flavors are not supported.`,
    sortOrder: 4,
  },

  {
    category: 'installation',
    question: 'How do I set up MagguuUI from scratch?',
    answer: `Four steps:

1. Install **EllesmereUI 7.9.5+**
2. Copy the single **MagguuUI** folder into \`Interface/AddOns\`
3. Optionally install BigWigs, LittleWigs, and/or Northern Sky Raid Tools
4. Log in, type \`/mui\`, and run the **4K install** on the Setup tab

Delete leftover \`MagguuUI_Data\`, \`MagguuUI_EUI\`, or \`MagguuUI_Media\` folders from older installs.`,
    sortOrder: 0,
  },
  {
    category: 'installation',
    question: 'How do I open MagguuUI?',
    answer: `Any of these:

- Type \`/mui\` or \`/mui setup\` in chat
- Open EllesmereUI and choose **MagguuUI → Optionen**
- \`/mui profile\` jumps to Magguu imports
- \`/mui qol\` jumps to the QoL tab
- \`/mui tools\` opens hidden Werkzeuge

There is no minimap button and no standalone installer window in this build.`,
    sortOrder: 1,
  },
  {
    category: 'installation',
    question: 'Do I have to repeat everything on my alts?',
    answer: `Ellesmere profiles are account-wide, so the MagguuUI profile is already there after the first 4K install.

Log in on an alt, open \`/mui\`, and re-run class layouts if you want that character's Cooldown Viewer layout. Spec changes use layouts named \`Magguu - Class Spec\`.`,
    sortOrder: 2,
  },
  {
    category: 'installation',
    question: 'Can I use MagguuUI without EllesmereUI?',
    answer: `**No.** MagguuUI is a native EllesmereUI module and lists EllesmereUI as a hard dependency.

It will not load, and it no longer ships an ElvUI installer, ElvUI tags, or a standalone options UI.`,
    sortOrder: 3,
  },

  {
    category: 'addons',
    question: 'What does the 4K install configure?',
    answer: `In order:

- **EllesmereUI** profile \`MagguuUI\` at UI scale **0.58**
- **BigWigs** profile and boss options, if BigWigs is present
- **Northern Sky Raid Tools** profile and alerts, if NSRT is present
- **Cooldown Viewer** class layouts, then an immediate reload

Per-addon Magguu imports live on the **Profile** tab.`,
    sortOrder: 0,
  },
  {
    category: 'addons',
    question: 'How do class layouts work?',
    answer: `MagguuUI ships **Cooldown Viewer layouts** for every class.

Import applies them as \`Magguu - Class Spec\` and activates the current specialization. MagguuUI then reloads immediately so Blizzard's live CDM session is not left tainted.

Addon code never writes Blizzard Edit Mode. Use the Setup tab's copy action and paste in Blizzard's editor.`,
    sortOrder: 1,
  },
  {
    category: 'addons',
    question: 'What happened to ElvUI, Plater, and MagguuUI_Data?',
    answer: `This Ellesmere build **does not ship those integrations**.

- There is no ElvUI profile, \`[mui:*]\` tags, or ElvUI keybind module
- There is no Plater / Platynator / Details / MRT installer
- Data and Media live **inside** the MagguuUI folder, not as a second addon

If you still have \`MagguuUI_Data\` next to MagguuUI, delete it.`,
    sortOrder: 2,
  },
  {
    category: 'addons',
    question: 'What is the difference between the full 4K install and individual profiles?',
    answer: `**4K install** — Ellesmere, then BigWigs if present, then NSRT, then class layouts.

**Individual profiles** — import only the piece you want from the **Profile** tab. Required: EllesmereUI and class layouts. Optional: BigWigs and Northern Sky.

**Magguu-Look** and a standalone **4K scale** action sit on Setup. Scale reapplies \`0.58\` without re-importing profiles.

On a new character MagguuUI asks whether to load those profiles onto the alt.`,
    sortOrder: 3,
  },
  {
    category: 'addons',
    question: 'Are the WowUp strings still required?',
    answer: `No. MagguuUI only needs EllesmereUI plus the MagguuUI folder.

The Strings page has two [WowUp](https://wowup.io/) packages as a convenience:

- **Starter Addons** — EllesmereUI, MagguuUI, BigWigs, LittleWigs, and Northern Sky Raid Tools
- **Optional Addons** — extras such as BugSack, MDT, Raider.IO, WIM, GTFO, and EXBoss

They are recommendations, not requirements.`,
    sortOrder: 4,
  },
  {
    category: 'addons',
    question: 'Why are my action bar keybinds tinted in my class color?',
    answer: `That's **Skinning → class-colored keybind modifiers**. MagguuUI recolors the modifier letters on Ellesmere action bars in your class color.

It only affects the modifier hint text, not the icons. Turn it off on the Skinning tab.`,
    sortOrder: 5,
  },
  {
    category: 'addons',
    question: 'Where are export tools and Discord boost?',
    answer: `They live on hidden **Werkzeuge**.

Open them with \`/mui tools\` or \`/mui export\`. Click the **MagguuUI** group header ten times to unlock the sidebar row permanently. That unlock is saved on your account.`,
    sortOrder: 6,
  },
  {
    category: 'addons',
    question: 'What QoL options are included?',
    answer: `On the **QoL** tab:

- Death-release protection
- Co-tank frame and debuffs
- Stealth and stance reminders
- Spell-alert opacity
- Per-spec proc-overlay hiding

Settings are stored in the MagguuUI Ellesmere profile. MagguuUI does not proxy EllesmereUI's own QoL page.`,
    sortOrder: 7,
  },
  {
    category: 'addons',
    question: 'Why is MagguuUI only one folder now?',
    answer: `WoW only discovers addons as **direct children** of \`Interface/AddOns\`. Nested TOC files are ignored.

So MagguuUI ships one folder: \`MagguuUI/EUI\`, \`MagguuUI/Data\`, and \`MagguuUI/Media\`. Leave it enabled. There is no LoadOnDemand MagguuUI_Data addon in this build.`,
    sortOrder: 8,
  },
  {
    category: 'addons',
    question: 'What slash commands exist?',
    answer: `- \`/mui\` / \`/magguu\` — Setup
- \`/mui setup\` — Setup
- \`/mui qol\` — QoL
- \`/mui profile\` — Profile (import)
- \`/mui tools\` / \`/mui export\` / \`/mui werkzeuge\` — Werkzeuge

Commands from the old installer (\`/mui install\`, \`/mui load\`, \`/mui changelog\`, \`/muikeys\`, \`/muiaudio\`, \`/muiautoroll\`, \`/cd\`) are gone.`,
    sortOrder: 9,
  },
  {
    category: 'addons',
    question: 'How do split names work?',
    answer: `**Skinning** colors the character name and realm separately on unit frames, party, and raid.

Protected or hidden names stay unsplit and white. Turn the toggles off on the Skinning tab if you prefer a single color.`,
    sortOrder: 10,
  },
  {
    category: 'addons',
    question: 'Why is the UI scale 0.58?',
    answer: `That's Magguu's current **4K Ellesmere profile**. The 4K install and the standalone scale action apply \`0.58\` after Ellesmere commits the import.

You can still change scale later in EllesmereUI; MagguuUI will not keep rewriting it unless you run the scale action again.`,
    sortOrder: 11,
  },

  {
    category: 'troubleshooting',
    question: "The 4K install didn't do anything",
    answer: `Check these:

1. **EllesmereUI 7.9.5+ is installed and enabled**
2. **MagguuUI is the single folder** — not leftover MagguuUI_Data beside it
3. **You are out of combat** — protected setup waits until combat ends
4. **You confirmed Ellesmere and BigWigs popups** — those imports finish in their own callbacks

Re-open Setup with \`/mui\` and run the 4K install again.`,
    sortOrder: 0,
  },
  {
    category: 'troubleshooting',
    question: 'MagguuUI does not appear in EllesmereUI',
    answer: `MagguuUI registers through Ellesmere's module API and will not load without it.

Confirm both addons are enabled, EllesmereUI is 7.9.5 or newer, then \`/reload\`. Open with \`/mui\` rather than looking for a minimap button or a MagguuUI options category in Blizzard's AddOns menu.`,
    sortOrder: 1,
  },
  {
    category: 'troubleshooting',
    question: 'How do I reset MagguuUI and start fresh?',
    answer: `Delete leftover MagguuUI_* folders, keep the current MagguuUI folder, and re-run the 4K install from \`/mui\` → Setup.

Companion settings live in the Ellesmere MagguuUI profile. Account-wide unlock state for Werkzeuge is \`MagguuDB.toolsUnlocked\`.`,
    sortOrder: 2,
  },
  {
    category: 'troubleshooting',
    question: 'Where can I report a bug or ask for help?',
    answer: `Best places:

- **CurseForge / Wago / WoWInterface** comments
- **GitHub** link in the footer
- **Email** link in the footer

When reporting a bug, include:
- Your WoW version
- Your EllesmereUI version
- Your MagguuUI version

This makes fixes much faster.`,
    sortOrder: 3,
  },
] as const

export const DEFAULT_SITE_CONTENT = [
  ...DEFAULT_HOME_CONTENT,
  ...DEFAULT_GUIDE_CONTENT,
] as const
