export const DEFAULT_HOME_CONTENT = [
  { page: 'home', section: 'hero', key: 'title', value: 'MagguuUI', type: 'text', sortOrder: 0, locale: 'en' },
  { page: 'home', section: 'hero', key: 'subtitle', value: 'A complete WoW UI, ready in minutes.', type: 'text', sortOrder: 1, locale: 'en' },
  { page: 'home', section: 'hero', key: 'description', value: 'MagguuUI is an in-game addon that installs and configures ElvUI, Plater, BigWigs, Details and more for you. One click on Install All and your interface is done — no manual setup, no copy-pasting strings.', type: 'text', sortOrder: 2, locale: 'en' },

  { page: 'home', section: 'features', key: 'feature_1_title', value: 'One-click setup', type: 'text', sortOrder: 0, locale: 'en' },
  { page: 'home', section: 'features', key: 'feature_1_text', value: 'Install MagguuUI from CurseForge, log in once, click Install All. Every supported addon gets its profile applied automatically — missing addons are simply skipped.', type: 'text', sortOrder: 1, locale: 'en' },
  { page: 'home', section: 'features', key: 'feature_1_icon', value: 'i-heroicons-cursor-arrow-rays', type: 'text', sortOrder: 2, locale: 'en' },

  { page: 'home', section: 'features', key: 'feature_2_title', value: 'Always up to date', type: 'text', sortOrder: 3, locale: 'en' },
  { page: 'home', section: 'features', key: 'feature_2_text', value: 'Profiles are tuned for the current WoW patch and updated regularly. MagguuUI tells you in chat or via popup whenever a new version is available.', type: 'text', sortOrder: 4, locale: 'en' },
  { page: 'home', section: 'features', key: 'feature_2_icon', value: 'i-heroicons-arrow-path', type: 'text', sortOrder: 5, locale: 'en' },

  { page: 'home', section: 'features', key: 'feature_3_title', value: 'Class layouts included', type: 'text', sortOrder: 6, locale: 'en' },
  { page: 'home', section: 'features', key: 'feature_3_text', value: 'Cooldown layouts are pre-built for every class and specialization, and re-applied automatically when you change spec.', type: 'text', sortOrder: 7, locale: 'en' },
  { page: 'home', section: 'features', key: 'feature_3_icon', value: 'i-heroicons-cube-transparent', type: 'text', sortOrder: 8, locale: 'en' },
] as const

export const DEFAULT_GUIDE_CONTENT = [
  { page: 'guide', section: 'intro', key: 'title', value: 'Installation Guide', locale: 'en', type: 'text', sortOrder: 0 },
  { page: 'guide', section: 'intro', key: 'text', value: 'Getting started takes about five minutes. Install ElvUI, install MagguuUI, log in, and click Install All. Done — your UI is ready to play.', locale: 'en', type: 'text', sortOrder: 1 },

  { page: 'guide', section: 'steps', key: 'step_1_title', value: '1. Install ElvUI', locale: 'en', type: 'text', sortOrder: 10 },
  { page: 'guide', section: 'steps', key: 'step_1', value: 'MagguuUI is built on top of [ElvUI](https://www.tukui.org/download.php?ui=elvui) and will not work without it.\n\n**Required version:** ElvUI 15.00 or higher.\n\nDownload ElvUI from tukui.org and drop the folders into `World of Warcraft\\_retail_\\Interface\\AddOns\\`. If you use the Tukui Client, CurseForge App, or any other addon manager, just search for ElvUI and install it.', locale: 'en', type: 'markdown', sortOrder: 11 },

  { page: 'guide', section: 'steps', key: 'step_2_title', value: '2. Install MagguuUI', locale: 'en', type: 'text', sortOrder: 20 },
  { page: 'guide', section: 'steps', key: 'step_2', value: 'Get MagguuUI from any of these sources:\n\n- **CurseForge** — search for *MagguuUI*\n- **Wago Addons** — [addons.wago.io](https://addons.wago.io/)\n- **WoWInterface** — [wowinterface.com](https://www.wowinterface.com/)\n\nAny modern addon manager (CurseForge, WowUp, Tukui Client) handles updates automatically.\n\nMagguuUI only configures supported addons — it does not download them. The other addons (Plater, BigWigs, Details, …) are optional and you install whichever ones you want separately.', locale: 'en', type: 'markdown', sortOrder: 21 },

  { page: 'guide', section: 'steps', key: 'step_3_title', value: '3. Log in and open the installer', locale: 'en', type: 'text', sortOrder: 30 },
  { page: 'guide', section: 'steps', key: 'step_3', value: 'Pick the character you want to set up first (usually your main) and log in.\n\nThe **MagguuUI Installer** opens automatically the first time you launch the game with the addon installed. If you closed it, you can re-open it any time:\n\n- Type `/mui` or `/mui install` in chat\n- Click the **MagguuUI minimap button**\n- Open Blizzard *Game Menu → Options → AddOns → MagguuUI*', locale: 'en', type: 'markdown', sortOrder: 31 },

  { page: 'guide', section: 'steps', key: 'step_4_title', value: '4. Click Install All', locale: 'en', type: 'text', sortOrder: 40 },
  { page: 'guide', section: 'steps', key: 'step_4', value: 'On the **Setup** tab, click **Install All**. MagguuUI applies the correct profile to every supported addon you have installed, in the right order. Optional addons that are missing are skipped automatically — you do not need them all.\n\nWhen the installer is finished it asks for a **UI reload**. Confirm it, and your new UI is live.\n\n*Prefer to pick and choose?* Use the **Expert** tab instead — there you can install profiles individually.', locale: 'en', type: 'markdown', sortOrder: 41 },

  { page: 'guide', section: 'steps', key: 'step_5_title', value: '5. Set up your alts', locale: 'en', type: 'text', sortOrder: 50 },
  { page: 'guide', section: 'steps', key: 'step_5', value: 'Profiles are stored per account, so once your main character is set up your other characters get a much shorter flow.\n\nLog in on an alt and you will see a **Load Profiles** popup instead of the full installer. Confirm it and the existing MagguuUI profiles are applied to the alt. You can also run `/mui load` manually any time.\n\nClass-specific cooldown layouts are re-applied automatically when you change specialization.', locale: 'en', type: 'markdown', sortOrder: 51 },

  { page: 'guide', section: 'steps', key: 'step_6_title', value: '6. Customize and stay updated', locale: 'en', type: 'text', sortOrder: 60 },
  { page: 'guide', section: 'steps', key: 'step_6', value: 'A few things worth knowing once everything is running:\n\n- `/mui settings` — open MagguuUI settings (update hint mode, minimap button, profile status, …)\n- `/mui changelog` — read the latest changes in-game\n- `/mui audio` — quickly switch between audio output devices\n- **Minimap button** — left-click opens the installer, right-click opens the Great Vault, shift+left-click reloads the UI\n\nWhen a new version is released MagguuUI shows you a **chat hint** or a **popup** (configurable). After you click *Got it* the same version will not bother you again.', locale: 'en', type: 'markdown', sortOrder: 61 },
] as const

export const DEFAULT_FAQS = [
  // ─── General ──────────────────────────────────────
  {
    category: 'general',
    question: 'What exactly is MagguuUI?',
    answer: 'MagguuUI is a World of Warcraft addon that sets up your entire user interface for you. Instead of spending hours configuring ElvUI, Plater, BigWigs, Details and the rest, you install MagguuUI, click Install All once, and the addon applies a curated profile to each supported addon. The result is a clean, ready-to-play UI in a few minutes.',
    sortOrder: 0,
  },
  {
    category: 'general',
    question: 'Is MagguuUI free?',
    answer: 'Yes. MagguuUI is free and open source under the GPL v3.0 license. You can download it from CurseForge, Wago Addons, or WoWInterface. There is no paid tier and no premium content.',
    sortOrder: 1,
  },
  {
    category: 'general',
    question: 'Do I need every supported addon to use MagguuUI?',
    answer: 'No. The only required addon is ElvUI — everything else is optional. MagguuUI checks which addons you have installed, configures the ones it finds, and skips the rest without errors. You can add more addons later and re-run Install All to configure them.',
    sortOrder: 2,
  },
  {
    category: 'general',
    question: 'Will MagguuUI overwrite my existing profiles?',
    answer: 'MagguuUI uses a separate profile called "MagguuUI" inside each addon, so your own profiles are kept untouched. If a MagguuUI profile already exists from a previous install, the addon asks for confirmation before overwriting it.',
    sortOrder: 3,
  },

  // ─── Installation & Setup ─────────────────────────
  {
    category: 'installation',
    question: 'What is the recommended setup flow for a brand new install?',
    answer: '1) Install ElvUI 15+ from tukui.org. 2) Install MagguuUI from CurseForge, Wago Addons, or WoWInterface. 3) Log in on your main character — the installer opens automatically. 4) Click Install All. 5) Confirm the UI reload when prompted. That is the full setup.',
    sortOrder: 0,
  },
  {
    category: 'installation',
    question: 'I missed the installer popup — how do I open it again?',
    answer: 'Type /mui or /mui install in chat. You can also click the MagguuUI minimap button, or open the installer from Game Menu → Options → AddOns → MagguuUI. The installer popup only auto-opens on first login per character; after that you trigger it manually whenever you need it.',
    sortOrder: 1,
  },
  {
    category: 'installation',
    question: 'What about my alts? Do I have to repeat everything?',
    answer: 'No. After one successful Install All on the account, MagguuUI shows the much shorter Load Profiles popup on alts instead of the full installer. Just confirm it and the existing profiles are applied. You can also run /mui load manually if the popup did not appear.',
    sortOrder: 2,
  },
  {
    category: 'installation',
    question: 'Can I use MagguuUI without ElvUI?',
    answer: 'No — ElvUI is the foundation everything else builds on. MagguuUI requires ElvUI version 15.00 or higher and will refuse to load profiles without it. Install ElvUI first, then install MagguuUI.',
    sortOrder: 3,
  },

  // ─── Addons & Profiles ────────────────────────────
  {
    category: 'addons',
    question: 'Which addons does Install All set up?',
    answer: 'The core set is ElvUI, BetterCooldownManager, Blizzard EditMode, Plater, BigWigs, and Details. Optional integrations include Platynator, BuffReminders, MiniCC, ElvUI_WindTools, Plumber, GTFO, BugSack, NorthernSkyRaidTools, MPlusTimer and several more. MagguuUI installs profiles for whichever of those it finds enabled — missing addons are skipped silently.',
    sortOrder: 0,
  },
  {
    category: 'addons',
    question: 'How do class layouts work?',
    answer: 'MagguuUI ships pre-built cooldown layouts for every class and specialization. The right layout is applied automatically when you change spec, so you do not have to fiddle with cooldowns when respeccing for Mythic+, Raid, or PvP. You can also re-apply them manually from the installer.',
    sortOrder: 1,
  },
  {
    category: 'addons',
    question: 'What is the difference between Install All and Load Profiles?',
    answer: 'Install All is the full first-time setup — it (re-)imports every profile fresh and is what you run on your main character. Load Profiles only activates the profiles that are already in your saved variables, without re-importing them — it is the lightweight flow for alts and for quickly fixing things after switching addons.',
    sortOrder: 2,
  },
  {
    category: 'addons',
    question: 'What are the WowUp Required and Optional strings on the website?',
    answer: 'WowUp is one of the popular WoW addon managers. The Required and Optional lists on the website are import strings you can paste into WowUp to bulk-install all the addons MagguuUI integrates with. If you already use a different addon manager (CurseForge, Tukui Client, …) you can ignore these — they are just a convenience for WowUp users.',
    sortOrder: 3,
  },

  // ─── Troubleshooting ──────────────────────────────
  {
    category: 'troubleshooting',
    question: 'Install All did not seem to do anything',
    answer: 'Make sure ElvUI is enabled and at version 15.00 or higher. Also check that you are not in combat — MagguuUI waits until you leave combat before applying profiles. If both look fine, try /mui install to re-open the installer and run Install All again. A UI reload is required at the end — confirm the popup or run /reload manually.',
    sortOrder: 0,
  },
  {
    category: 'troubleshooting',
    question: 'I do not get update hints in chat or as a popup',
    answer: 'Open /mui settings and check Update Hint Mode. If it is set to Disabled, no hint is shown for new versions. Also note that once you click "Got it" on a version popup, that exact version will not notify you again — you will only see hints for newer releases after that.',
    sortOrder: 1,
  },
  {
    category: 'troubleshooting',
    question: 'How do I reset everything and start fresh?',
    answer: 'Open /mui settings and use Hard Reset. This wipes the MagguuUI saved variables and sends you back through the full installer on next reload. Your other addons keep their own profiles, but the MagguuUI-managed ones will be re-imported the next time you click Install All.',
    sortOrder: 2,
  },
  {
    category: 'troubleshooting',
    question: 'Where can I report bugs or ask for help?',
    answer: 'Open the project page on CurseForge, Wago Addons, or WoWInterface and use the comments / issues section, or contact the author through the e-mail or GitHub link in the footer. When reporting a bug, please mention your WoW version, your ElvUI version, and the MagguuUI version (you can see it via /mui version).',
    sortOrder: 3,
  },
] as const

export const DEFAULT_SITE_CONTENT = [
  ...DEFAULT_HOME_CONTENT,
  ...DEFAULT_GUIDE_CONTENT,
] as const
