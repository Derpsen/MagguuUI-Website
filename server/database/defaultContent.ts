export const DEFAULT_HOME_CONTENT = [
  { page: 'home', section: 'hero', key: 'title', value: 'Your WoW Interface,', type: 'text', sortOrder: 0, locale: 'en' },
  { page: 'home', section: 'hero', key: 'title2', value: 'perfected.', type: 'text', sortOrder: 1, locale: 'en' },
  { page: 'home', section: 'hero', key: 'subtitle', value: 'A complete WoW UI, ready in minutes.', type: 'text', sortOrder: 2, locale: 'en' },
  { page: 'home', section: 'hero', key: 'description', value: 'MagguuUI is an in-game addon that installs and configures ElvUI, Plater, BigWigs, Details, Method Raid Tools and 20+ more addons for you. One click on Install All and your interface is done — no manual setup, no copy-pasting strings.', type: 'text', sortOrder: 3, locale: 'en' },
  { page: 'home', section: 'hero', key: 'badge', value: 'New: MRT + ilvl tags', type: 'text', sortOrder: 4, locale: 'en' },

  { page: 'home', section: 'features', key: 'feature_1_title', value: 'One-click setup', type: 'text', sortOrder: 0, locale: 'en' },
  { page: 'home', section: 'features', key: 'feature_1_text', value: 'Install MagguuUI, log in once, click **Install All**. Every supported addon — from ElvUI and Plater to MRT and BigWigs — gets its profile applied in the right order. Missing addons are skipped silently.', type: 'text', sortOrder: 1, locale: 'en' },
  { page: 'home', section: 'features', key: 'feature_1_icon', value: 'i-heroicons-cursor-arrow-rays', type: 'text', sortOrder: 2, locale: 'en' },

  { page: 'home', section: 'features', key: 'feature_2_title', value: 'Always up to date', type: 'text', sortOrder: 3, locale: 'en' },
  { page: 'home', section: 'features', key: 'feature_2_text', value: 'Profiles are tuned for the current WoW patch and updated regularly. MagguuUI tells you in chat or via popup whenever a new version is available — and the in-game changelog shows you exactly what changed.', type: 'text', sortOrder: 4, locale: 'en' },
  { page: 'home', section: 'features', key: 'feature_2_icon', value: 'i-heroicons-arrow-path', type: 'text', sortOrder: 5, locale: 'en' },

  { page: 'home', section: 'features', key: 'feature_3_title', value: 'Class layouts + custom tags', type: 'text', sortOrder: 6, locale: 'en' },
  { page: 'home', section: 'features', key: 'feature_3_text', value: 'Cooldown layouts are pre-built for every class and specialization and re-applied automatically on spec change. Native ElvUI tags `[mui:ilvl]` and `[mui:ilvl:setbonus]` drop item level and current tier set bonus directly into any unitframe name text.', type: 'text', sortOrder: 7, locale: 'en' },
  { page: 'home', section: 'features', key: 'feature_3_icon', value: 'i-heroicons-cube-transparent', type: 'text', sortOrder: 8, locale: 'en' },

  { page: 'home', section: 'features_heading', key: 'title', value: 'Why MagguuUI?', type: 'text', sortOrder: 0, locale: 'en' },
  { page: 'home', section: 'features_heading', key: 'subtitle', value: 'Everything you need — in one package', type: 'text', sortOrder: 1, locale: 'en' },

  { page: 'home', section: 'addons', key: 'title', value: 'Supported Addons', type: 'text', sortOrder: 0, locale: 'en' },
  { page: 'home', section: 'addons', key: 'subtitle', value: 'Profiles for 28 of the most popular WoW addons', type: 'text', sortOrder: 1, locale: 'en' },
] as const

export const DEFAULT_GUIDE_CONTENT = [
  { page: 'guide', section: 'intro', key: 'title', value: 'Installation Guide', locale: 'en', type: 'text', sortOrder: 0 },
  { page: 'guide', section: 'intro', key: 'text', value: 'Getting started takes about five minutes. Install ElvUI, install MagguuUI, log in, and click Install All. Done — your UI is ready to play.', locale: 'en', type: 'text', sortOrder: 1 },

  { page: 'guide', section: 'steps', key: 'step_1_title', value: '1. Install ElvUI', locale: 'en', type: 'text', sortOrder: 10 },
  { page: 'guide', section: 'steps', key: 'step_1', value: 'MagguuUI is built on top of [ElvUI](https://www.tukui.org/download.php?ui=elvui) and will not work without it.\n\n**Required version:** ElvUI 15.00 or higher.\n\nDownload ElvUI from tukui.org and drop the folders into `World of Warcraft\\_retail_\\Interface\\AddOns\\`. If you use the Tukui Client, CurseForge App, or any other addon manager, just search for ElvUI and install it.', locale: 'en', type: 'markdown', sortOrder: 11 },

  { page: 'guide', section: 'steps', key: 'step_2_title', value: '2. Install MagguuUI', locale: 'en', type: 'text', sortOrder: 20 },
  { page: 'guide', section: 'steps', key: 'step_2', value: 'Get MagguuUI from any of these sources:\n\n- **CurseForge** — search for *MagguuUI*\n- **Wago Addons** — [addons.wago.io](https://addons.wago.io/)\n- **WoWInterface** — [wowinterface.com](https://www.wowinterface.com/)\n\nAny modern addon manager (CurseForge, WowUp, Tukui Client) handles updates automatically.\n\nMagguuUI only configures supported addons — it does not download them. The other addons (Plater, BigWigs, Details, MRT, …) are optional and you install whichever ones you want separately.', locale: 'en', type: 'markdown', sortOrder: 21 },

  { page: 'guide', section: 'steps', key: 'step_3_title', value: '3. Log in and open the installer', locale: 'en', type: 'text', sortOrder: 30 },
  { page: 'guide', section: 'steps', key: 'step_3', value: 'Pick the character you want to set up first (usually your main) and log in.\n\nThe **MagguuUI Installer** opens automatically the first time you launch the game with the addon installed. If you closed it, you can re-open it any time:\n\n- Type `/mui` or `/mui install` in chat\n- Click the **MagguuUI minimap button** (left-click)\n- Open Blizzard *Game Menu → Options → AddOns → MagguuUI* and hit **Open Installer**', locale: 'en', type: 'markdown', sortOrder: 31 },

  { page: 'guide', section: 'steps', key: 'step_4_title', value: '4. Click Install All', locale: 'en', type: 'text', sortOrder: 40 },
  { page: 'guide', section: 'steps', key: 'step_4', value: 'On the **Setup** tab, click **Install All**. MagguuUI applies the correct profile to every supported addon you have installed, in the right order. Optional addons that are missing are skipped automatically — you do not need them all.\n\nA **toast notification** confirms when Install All finishes. If the flow hits a conflict chooser (e.g. Plater vs Platynator, BCM vs Ayije_CDM) the installer reloads the UI and resumes automatically on next login — no progress lost.\n\nWhen the installer is done it asks for a **UI reload**. Confirm it, and your new UI is live.\n\n*Prefer to pick and choose?* Use the **Expert** tab instead — there you can filter by category (Core / Cooldowns / Nameplates / Layouts / Optional) and install profiles individually.', locale: 'en', type: 'markdown', sortOrder: 41 },

  { page: 'guide', section: 'steps', key: 'step_5_title', value: '5. Set up your alts', locale: 'en', type: 'text', sortOrder: 50 },
  { page: 'guide', section: 'steps', key: 'step_5', value: 'Profiles are stored per account, so once your main character is set up your other characters get a much shorter flow.\n\nLog in on an alt and you will see a **Load Profiles** popup instead of the full installer. Confirm it and the existing MagguuUI profiles are applied to the alt. You can also run `/mui load` manually any time.\n\nClass-specific cooldown layouts are re-applied automatically when you change specialization.', locale: 'en', type: 'markdown', sortOrder: 51 },

  { page: 'guide', section: 'steps', key: 'step_6_title', value: '6. Customize and stay updated', locale: 'en', type: 'text', sortOrder: 60 },
  { page: 'guide', section: 'steps', key: 'step_6', value: 'A few things worth knowing once everything is running:\n\n**Slash commands:**\n- `/mui` — open the installer\n- `/mui settings` — MagguuUI settings (General / Audio / Tags sub-tabs)\n- `/mui changelog` — read the latest changes in-game\n- `/muiaudio` — cycle audio output devices (also `/mui audio` with sub-commands)\n- `/cd` — cooldown layout settings\n- `/em` — Blizzard EditMode\n\n**Custom ElvUI tags** (Settings → Tags, off by default):\n- `[mui:ilvl]` — item level in any unitframe name text\n- `[mui:ilvl:setbonus]` — item level plus current tier set bonus (2P / 4P)\n\n**Minimap button** — left-click opens the installer, right-click opens the Great Vault, shift+right-click opens Settings, shift+left-click reloads the UI.\n\n**Audio switcher** — right-click the chat voice icon to cycle between configured output devices, or pick directly from **Settings → Audio**.\n\nWhen a new version is released MagguuUI shows you a **chat hint** or a **popup** (configurable). After you click *Got it* the same version will not bother you again.', locale: 'en', type: 'markdown', sortOrder: 61 },
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
    answer: `**No — only ElvUI is required.** Everything else is optional.

MagguuUI detects which of the 28 supported addons you have enabled, configures those, and silently skips the rest. You can install more addons later and run **Install All** again to configure them.`,
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

1. Install **ElvUI 15+** from [tukui.org](https://www.tukui.org/)
2. Install **MagguuUI** from CurseForge, Wago Addons, or WoWInterface
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
    answer: `**No.** ElvUI is the foundation everything else builds on.

MagguuUI requires **ElvUI 15.00 or higher** and will refuse to load profiles without it. Install ElvUI first, then MagguuUI.`,
    sortOrder: 3,
  },

  // ─── Addons & Profiles ────────────────────────────
  {
    category: 'addons',
    question: 'Which addons does Install All configure?',
    answer: `**Core set** (always configured if installed):
- ElvUI
- BetterCooldownManager (or Ayije_CDM)
- Blizzard EditMode
- Plater (or Platynator)
- BigWigs (or Northern Sky Raid Tools)
- Details (+ Details iLvl)
- **Method Raid Tools (MRT)** — notes, cooldown assignments, marks, raid groups, timers

**Optional integrations:** BuffReminders, MiniCC, MiniCE, ElvUI_WindTools, Plumber, GTFO, BugSack, GroupfinderFlags, Falcon (Skyriding), CursorTrail, M+ Timer, WaypointUI, KeystoneLoot, MPlusTimer, TalentTreeTweaks and more — 28 supported addons in total.

MagguuUI configures whichever of these are enabled — missing addons are skipped silently.`,
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
    question: 'What are the WowUp Required / Optional strings?',
    answer: `[WowUp](https://wowup.io/) is a popular WoW addon manager. The **Required** and **Optional** lists on this site are import strings you can paste into WowUp to bulk-install every addon MagguuUI integrates with.

Using CurseForge, Tukui Client, or another manager? You can safely ignore these — they're just a convenience for WowUp users.`,
    sortOrder: 4,
  },

  // ─── Troubleshooting ──────────────────────────────
  {
    category: 'troubleshooting',
    question: "Install All didn't do anything",
    answer: `Check these three things:

1. **ElvUI enabled and version 15.00 or higher** — lower versions won't work
2. **Not in combat** — MagguuUI waits until combat ends before applying profiles
3. **UI reload confirmed** — required at the end of Install All

If those look fine, run \`/mui install\` to re-open the installer and try again. You can also \`/reload\` manually if the popup didn't fire.`,
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
- Your ElvUI version
- Your MagguuUI version (run \`/mui version\`)

This makes fixes much faster.`,
    sortOrder: 3,
  },
] as const

export const DEFAULT_SITE_CONTENT = [
  ...DEFAULT_HOME_CONTENT,
  ...DEFAULT_GUIDE_CONTENT,
] as const
