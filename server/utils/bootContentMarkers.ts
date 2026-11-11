/**
 * Exact-text and substring markers that repair known-stale seeded copy
 * without overwriting unrelated admin edits.
 */
import { and, eq } from 'drizzle-orm'
import { DEFAULT_SITE_CONTENT } from '~/server/database/defaultContent'
import { siteContent, settings } from '~/server/database/schema'
import { DEFAULT_CONTENT_LOCALE } from '~/server/utils/contentLocales'
import { SITE_SETTINGS_DEFAULTS } from '~/utils/siteSettingsDefaults'
import { isPrivateRepoUrl, rewritePrivateRepoLinks } from '~/utils/privateRepoLinks'
import type { WebsiteBootDb, WebsiteBootSetting, WebsiteBootSqlite } from './websiteBootTypes'

export const LEGACY_CONTENT_MARKERS = [
  { page: 'home', section: 'hero', key: 'title', marker: 'Your WoW Interface,' },
  { page: 'home', section: 'hero', key: 'title2', marker: 'perfected.' },
  { page: 'home', section: 'hero', key: 'title', marker: 'Dein WoW-Interface,', locale: 'de' },
  { page: 'home', section: 'hero', key: 'title2', marker: 'perfektioniert.', locale: 'de' },
  // exact: replace only the untouched old default, never an admin text that merely contains it.
  { page: 'home', section: 'hero', key: 'title2', marker: 'Ellesmere setup.', exact: true },
  { page: 'home', section: 'hero', key: 'title2', marker: 'Ellesmere-Setup.', locale: 'de', exact: true },
  { page: 'home', section: 'features_heading', key: 'title', marker: 'Why MagguuUI?' },
  { page: 'home', section: 'features_heading', key: 'title', marker: 'Warum MagguuUI?', locale: 'de' },
  { page: 'home', section: 'hero', key: 'description', marker: 'MagguuUI is an in-game addon that installs and configures ElvUI' },
  { page: 'home', section: 'hero', key: 'description', marker: 'MagguuUI is a standalone in-game installer that configures ElvUI' },
  { page: 'home', section: 'hero', key: 'description', marker: 'MagguuUI is a standalone installer for WoW Retail' },
  { page: 'home', section: 'hero', key: 'description', marker: 'Install **EllesmereUI**' },
  { page: 'home', section: 'hero', key: 'description', marker: 'open `/mui`' },
  { page: 'home', section: 'hero', key: 'badge', marker: 'New: AutoRoll + Pack system' },
  { page: 'home', section: 'hero', key: 'badge', marker: 'New: MRT + ilvl tags' },
  { page: 'home', section: 'hero', key: 'badge', marker: 'Ready for WoW 12.0.7' },
  { page: 'home', section: 'hero', key: 'badge', marker: 'Ready for WoW 12.0' },
  { page: 'home', section: 'features', key: 'feature_1_text', marker: 'Every supported addon — from ElvUI and Plater' },
  { page: 'home', section: 'features', key: 'feature_1_text', marker: 'Every supported addon you have enabled gets its profile applied' },
  { page: 'home', section: 'features', key: 'feature_1_text', marker: 'MagguuUI** and **MagguuUI_Data' },
  { page: 'home', section: 'features', key: 'feature_1_text', marker: 'Setup, Skinning, and QoL' },
  { page: 'home', section: 'features', key: 'feature_1_text', marker: 'individual profiles, presets' },
  { page: 'home', section: 'features', key: 'feature_1_text', marker: 'Profile imports Magguu strings' },
  { page: 'home', section: 'features', key: 'feature_1_text', marker: 'Setup runs the 4K install, Magguu-Look, and Magguu profile imports' },
  { page: 'home', section: 'features', key: 'feature_1_text', marker: 'WowUp copy popups. Werkzeuge exports your live profiles.' },
  { page: 'home', section: 'features', key: 'feature_2_text', marker: 'copies an Edit Mode layout' },
  { page: 'home', section: 'features', key: 'feature_2_text', marker: 'never writes Blizzard Edit Mode itself' },
  { page: 'guide', section: 'steps', key: 'step_4', marker: 'Per-addon Magguu imports live on the **Profile** tab' },
  { page: 'guide', section: 'steps', key: 'step_6', marker: 'Profile tab (import)' },
  { page: 'guide', section: 'steps', key: 'step_6', marker: 'reloads immediately so the layouts stick' },
  { page: 'home', section: 'features', key: 'feature_1_title', marker: 'One-click setup' },
  { page: 'home', section: 'features', key: 'feature_2_text', marker: 'the in-game changelog shows you exactly what changed' },
  { page: 'home', section: 'features', key: 'feature_2_text', marker: 'import as **Magguu - Class Spec**' },
  { page: 'home', section: 'features', key: 'feature_2_text', marker: 'never writes protected Blizzard layout state' },
  { page: 'home', section: 'features', key: 'feature_3_title', marker: 'Class layouts + custom tags' },
  { page: 'home', section: 'features', key: 'feature_3_title', marker: 'Useful extras built in' },
  { page: 'home', section: 'features', key: 'feature_3_text', marker: 'Cooldown layouts are pre-built for every class' },
  { page: 'home', section: 'features', key: 'feature_3_text', marker: 'AutoRoll, audio switching' },
  { page: 'home', section: 'hero', key: 'description', marker: 'Northern Sky Raid Tools stay optional' },
  { page: 'home', section: 'hero', key: 'description', marker: 'BigWigs and Northern Sky stay optional' },
  { page: 'home', section: 'hero', key: 'description', marker: 'BigWigs und Northern Sky bleiben optional', locale: 'de' },
  { page: 'home', section: 'hero', key: 'description', marker: 'Companion addons stay optional' },
  { page: 'home', section: 'hero', key: 'description', marker: 'Begleiter-Addons bleiben optional', locale: 'de' },
  { page: 'home', section: 'addons', key: 'subtitle', marker: 'Optional chips are Magguu imports' },
  { page: 'home', section: 'addons', key: 'subtitle', marker: 'Optionale Chips sind Magguu-Imports', locale: 'de' },
  { page: 'home', section: 'addons', key: 'subtitle', marker: 'BigWigs, LittleWigs, and Northern Sky Raid Tools are optional' },
  { page: 'home', section: 'addons', key: 'subtitle', marker: 'BigWigs, LittleWigs und Northern Sky Raid Tools sind optional', locale: 'de' },
  { page: 'home', section: 'addons', key: 'subtitle', marker: 'Chat pack:' },
  { page: 'home', section: 'addons', key: 'subtitle', marker: 'Chat-Pack:', locale: 'de' },
  { page: 'home', section: 'features', key: 'feature_1_text', marker: 'Two sidebar rows:' },
  { page: 'home', section: 'features', key: 'feature_1_text', marker: 'Zwei Sidebar-Zeilen:', locale: 'de' },
  { page: 'home', section: 'features', key: 'feature_2_text', marker: 'Optional Magguu profiles for BigWigs' },
  { page: 'home', section: 'features', key: 'feature_2_text', marker: 'Optionale Magguu-Profile für BigWigs', locale: 'de' },
  { page: 'home', section: 'features', key: 'feature_3_text', marker: 'Skinning is one' },
  { page: 'home', section: 'features', key: 'feature_3_text', marker: 'Skinning ist eine Kategorie', locale: 'de' },
  { page: 'guide', section: 'intro', key: 'text', marker: 'WowUp optional chat is' },
  { page: 'guide', section: 'steps', key: 'step_3', marker: 'includes Whisper Messenger (not WIM)' },
  { page: 'guide', section: 'intro', key: 'text', marker: 'BigWigs, LittleWigs, and Northern Sky Raid Tools are optional.' },
  { page: 'home', section: 'hero', key: 'description', marker: 'native EllesmereUI module for WoW Retail. Install <strong>EllesmereUI</strong> and the single' },
  { page: 'home', section: 'features', key: 'feature_1_text', marker: 'Tooltips stay at Magguu' },
  { page: 'home', section: 'features', key: 'feature_1_text', marker: 'required and optional Magguu imports, and WowUp copy popups' },
  { page: 'home', section: 'features', key: 'feature_1_text', marker: 'Werkzeuge exports your live profiles' },
  { page: 'home', section: 'features', key: 'feature_2_text', marker: 'After a successful import MagguuUI asks you to reload so the layouts stick' },
  { page: 'home', section: 'features', key: 'feature_2_text', marker: 'Cooldown Viewer class layouts import as' },
  { page: 'home', section: 'features', key: 'feature_3_text', marker: 'Split unit and group names, class-colored keybind modifiers' },
  { page: 'home', section: 'features', key: 'feature_3_text', marker: 'split unit, party, and raid names; class-colored keybind modifiers' },
  { page: 'home', section: 'features', key: 'feature_3_text', marker: 'geteilte Unit-, Party- und Raid-Namen', locale: 'de' },
  { page: 'guide', section: 'steps', key: 'step_5', marker: 'NAMES & COLORS: split unit-frame / party-raid names' },
  { page: 'home', section: 'features', key: 'feature_3_text', marker: 'audio device switcher on the Ellesmere speaker icon live in the MagguuUI profile' },
  { page: 'home', section: 'features', key: 'feature_3_text', marker: 'Split name colors and class-colored keybind modifiers' },
  { page: 'guide', section: 'steps', key: 'step_5', marker: 'split coloring for unit frames and party/raid names, plus class-colored keybind modifiers' },
  { page: 'guide', section: 'steps', key: 'step_4', marker: 'apply already-installed Magguu profiles to this character' },
  { page: 'guide', section: 'steps', key: 'step_4', marker: 'Import buttons turn green after a Magguu import' },
  { page: 'home', section: 'features_heading', key: 'subtitle', marker: 'Everything you need — in one package' },
  { page: 'home', section: 'features_heading', key: 'subtitle', marker: 'A complete setup without forced external dependencies' },
  { page: 'home', section: 'addons', key: 'subtitle', marker: 'Profiles for 30+ of the most popular WoW addons' },
  { page: 'home', section: 'addons', key: 'subtitle', marker: 'of the most popular WoW addons' },
  { page: 'home', section: 'addons', key: 'subtitle', marker: 'Every external integration is optional' },
  { page: 'guide', section: 'intro', key: 'text', marker: 'Install ElvUI, install MagguuUI' },
  { page: 'guide', section: 'intro', key: 'text', marker: 'Getting started takes about five minutes' },
  { page: 'guide', section: 'intro', key: 'text', marker: 'Install the two included MagguuUI folders' },
  { page: 'guide', section: 'intro', key: 'text', marker: 'then open /mui and run the 4K setup. BigWigs, LittleWigs, and Northern Sky Raid Tools are optional.' },
  { page: 'guide', section: 'intro', key: 'text', marker: 'open /mui and run the 4K setup. BigWigs, LittleWigs' },
  { page: 'guide', section: 'steps', key: 'step_1_title', marker: '1. Install ElvUI' },
  { page: 'guide', section: 'steps', key: 'step_1_title', marker: '1. Install MagguuUI' },
  { page: 'guide', section: 'steps', key: 'step_1', marker: 'will not work without it' },
  { page: 'guide', section: 'steps', key: 'step_1', marker: 'MagguuUI` and `MagguuUI_Data' },
  { page: 'guide', section: 'steps', key: 'step_1', marker: 'from CurseForge, Wago, or WoWInterface.\n\nWithout EllesmereUI' },
  { page: 'guide', section: 'steps', key: 'step_2_title', marker: '2. Add the addons you want' },
  { page: 'guide', section: 'steps', key: 'step_2', marker: 'Get MagguuUI from any of these sources:' },
  { page: 'guide', section: 'steps', key: 'step_2', marker: 'MagguuUI runs on its own. Install only the supported addons' },
  { page: 'guide', section: 'steps', key: 'step_2', marker: 'ElvUI is optional too' },
  { page: 'guide', section: 'steps', key: 'step_2', marker: 'WoW does not load nested TOC files' },
  { page: 'guide', section: 'steps', key: 'step_3_title', marker: '3. Log in and open the installer' },
  { page: 'guide', section: 'steps', key: 'step_3', marker: 'MagguuUI Installer' },
  { page: 'guide', section: 'steps', key: 'step_4_title', marker: '4. Click Install All' },
  { page: 'guide', section: 'steps', key: 'step_4', marker: 'MagguuUI applies the correct profile to every supported addon' },
  { page: 'guide', section: 'steps', key: 'step_4', marker: 'click **Install All**' },
  { page: 'guide', section: 'steps', key: 'step_3', marker: 'WowUp starter pack on the Strings page' },
  { page: 'guide', section: 'steps', key: 'step_3', marker: 'A WowUp starter pack on the Strings page' },
  { page: 'guide', section: 'steps', key: 'step_4', marker: 'copy the Edit Mode layout' },
  { page: 'guide', section: 'steps', key: 'step_4', marker: 'Run the **4K install**. MagguuUI imports the Ellesmere profile' },
  { page: 'guide', section: 'steps', key: 'step_4', marker: 'On the same tab you can apply **Magguu-Look**' },
  { page: 'guide', section: 'steps', key: 'step_4', marker: 'protected actions wait until combat ends' },
  { page: 'guide', section: 'steps', key: 'step_4', marker: 'Setup has no Edit Mode action' },
  { page: 'guide', section: 'steps', key: 'step_4', marker: 'Ellesmere QoL/Shifter defaults' },
  { page: 'guide', section: 'steps', key: 'step_5', marker: 'The Magguu accent-color toggle is no longer in the UI' },
  { page: 'guide', section: 'steps', key: 'step_5', marker: 'Load Profiles** popup' },
  { page: 'guide', section: 'steps', key: 'step_6', marker: 'shift+left-click opens Settings' },
  { page: 'guide', section: 'steps', key: 'step_6', marker: 'Row direction, icon borders, visibility and banner position are configurable' },
  { page: 'guide', section: 'steps', key: 'step_6', marker: '**Custom ElvUI tags**' },
  { page: 'home', section: 'hero', key: 'description', marker: 'and the single <strong>MagguuUI</strong> folder' },
  { page: 'home', section: 'features', key: 'feature_1_text', marker: 'One sidebar row with Setup, Skinning, and QoL' },
  { page: 'home', section: 'features', key: 'feature_2_text', marker: 'Optional profiles for BigWigs, Northern Sky, WIM, and Waypoint UI' },
  { page: 'home', section: 'features', key: 'feature_2_text', marker: 'Optional profiles for BigWigs, Northern Sky, WIM, Waypoint UI, and EXBoss' },
  { page: 'home', section: 'features', key: 'feature_2_text', marker: 'Optionale Profile für BigWigs, Northern Sky, WIM, Waypoint UI und EXBoss', locale: 'de' },
  { page: 'guide', section: 'intro', key: 'text', marker: 'add the MagguuUI folder, then open /mui' },
  { page: 'guide', section: 'steps', key: 'step_1', marker: 'EllesmereUI 7.9.5 or newer' },
  { page: 'guide', section: 'steps', key: 'step_2', marker: 'The download is **one folder**' },
  { page: 'guide', section: 'steps', key: 'step_2', marker: 'delete those leftover folders' },
  { page: 'guide', section: 'steps', key: 'step_3', marker: 'Optional pack extras include BugSack, MDT, Raider.IO, WIM, GTFO' },
  { page: 'guide', section: 'steps', key: 'step_3', marker: 'Premade Groups Filter, KeystoneLoot.' },
  { page: 'guide', section: 'steps', key: 'step_4', marker: '**Set scale only**' },
  { page: 'guide', section: 'steps', key: 'step_4', marker: '**Install everything** imports the Ellesmere profile at UI scale' },
  { page: 'guide', section: 'steps', key: 'step_3', marker: 'KeystoneLoot, Auctionator' },
  { page: 'guide', section: 'steps', key: 'step_3', marker: 'HandyNotes, MDT, Raider.IO' },

  { page: 'guide', section: 'steps', key: 'step_3', marker: '**KeystoneLoot**' },
  { page: 'guide', section: 'steps', key: 'step_4', marker: 'KeystoneLoot' },
  { page: 'home', section: 'features', key: 'feature_2_text', marker: 'KeystoneLoot' },
  { page: 'home', section: 'features', key: 'feature_2_text', marker: 'EXBoss, and KeystoneLoot' },
  { page: 'home', section: 'features', key: 'feature_2_text', marker: 'EXBoss und KeystoneLoot' },
  { page: 'home', section: 'features', key: 'feature_2_text', marker: 'BugSack, and Premade Groups Filter.' },
  { page: 'home', section: 'addons', key: 'subtitle', marker: 'BugSack, and Premade Groups Filter are optional.' },
  { page: 'guide', section: 'steps', key: 'step_3', marker: 'KeystoneLoot' },
  { page: 'home', section: 'features', key: 'feature_3_text', marker: 'split EXBoss names' },
  { page: 'home', section: 'features', key: 'feature_3_text', marker: 'EXBoss split does not use' },
  { page: 'home', section: 'features', key: 'feature_3_text', marker: 'EXBoss-Namen', locale: 'de' },
  { page: 'guide', section: 'steps', key: 'step_4', marker: 'all four Skinning NAMES & COLORS toggles' },
  { page: 'guide', section: 'steps', key: 'step_5', marker: 'split EXBoss names' },
  { page: 'guide', section: 'steps', key: 'step_5', marker: 'EXBoss split does not use' },
  { page: 'home', section: 'hero', key: 'description', marker: 'run <strong>Install All</strong>' },
  { page: 'home', section: 'features', key: 'feature_1_text', marker: 'Gold <strong>Install All</strong>' },
  { page: 'home', section: 'features', key: 'feature_1_text', marker: 'Goldenes <strong>Install All</strong>', locale: 'de' },
  { page: 'home', section: 'features', key: 'feature_3_text', marker: 'Hide Services on General, <strong>Quick Focus</strong>, and an <strong>Audio device switcher</strong>' },
  { page: 'home', section: 'features', key: 'feature_3_text', marker: 'Hide Services on General (secret-safe)' },
  { page: 'home', section: 'features', key: 'feature_3_text', marker: 'and an <strong>Audio device switcher</strong> on the Ellesmere speaker, and <strong>Targeted Spell Bars</strong>' },
  { page: 'home', section: 'features', key: 'feature_3_text', marker: 'Hide Services auf General, <strong>Quick Focus</strong> und ein <strong>Audio-Geräte-Umschalter</strong>', locale: 'de' },
  { page: 'home', section: 'features', key: 'feature_3_text', marker: 'Hide Services auf General (secret-safe)', locale: 'de' },
  { page: 'home', section: 'features', key: 'feature_3_text', marker: 'Lautsprecher und <strong>Targeted Spell Bars</strong>', locale: 'de' },
  { page: 'guide', section: 'intro', key: 'text', marker: 'run Install All. Magguu Settings' },
  { page: 'guide', section: 'steps', key: 'step_4_title', marker: '4. Open Setup and Install All' },
  { page: 'guide', section: 'steps', key: 'step_4', marker: '**Install All** is the gold button' },
  { page: 'guide', section: 'steps', key: 'step_4', marker: 'delta-only Ellesmere bake' },
  { page: 'guide', section: 'steps', key: 'step_4', marker: 'reimport the Ellesmere bake' },
  { page: 'guide', section: 'steps', key: 'step_4', marker: 'Magguu dumps via' },
  { page: 'guide', section: 'steps', key: 'step_3', marker: 'Magguu dumps via' },
  { page: 'guide', section: 'steps', key: 'step_4', marker: 'companions (BigWigs, Northern Sky, WIM, Waypoint UI, EXBoss)' },
  { page: 'guide', section: 'steps', key: 'step_4', marker: 'BigWigs, Northern Sky, WIM, Waypoint UI, and EXBoss' },
  { page: 'guide', section: 'steps', key: 'step_3', marker: '**WIM**, **Waypoint UI**, and **EXBoss** — optional Magguu imports' },
  { page: 'guide', section: 'steps', key: 'step_4', marker: 'appearance and author configs' },
  { page: 'guide', section: 'steps', key: 'step_5', marker: 'Hide Services on General, Quick Focus (modifier-click to focus), and an audio device switcher' },
  { page: 'guide', section: 'steps', key: 'step_5', marker: 'Hide Services on General (secret-safe)' },
  { page: 'guide', section: 'steps', key: 'step_4', marker: 'chat channels and size with Services off General' },
  { page: 'home', section: 'features', key: 'feature_2_text', marker: 'EXBoss, WIM, Whisper Messenger' },
  { page: 'home', section: 'features', key: 'feature_2_text', marker: 'EXBoss, WIM, Waypoint UI' },
  { page: 'home', section: 'features', key: 'feature_2_text', marker: 'EXBoss, WIM, Whisper Messenger', locale: 'de' },
  { page: 'home', section: 'features', key: 'feature_2_text', marker: 'EXBoss, WIM, Waypoint UI', locale: 'de' },
  { page: 'home', section: 'addons', key: 'subtitle', marker: 'EXBoss, WIM, Waypoint UI' },
  { page: 'home', section: 'addons', key: 'subtitle', marker: 'EXBoss, WIM, Waypoint UI', locale: 'de' },
  { page: 'guide', section: 'intro', key: 'text', marker: 'EXBoss, WIM, Waypoint UI' },
  { page: 'guide', section: 'steps', key: 'step_3', marker: 'Ellesmere WIM Skin' },
  { page: 'guide', section: 'steps', key: 'step_4', marker: 'EXBoss, WIM, Waypoint UI' },
  { page: 'guide', section: 'steps', key: 'step_4', marker: 'Northern Sky, EXBoss, and Smart Reminders' },
  // 2026-10 guide shorten + home chips subtitle
  { page: 'guide', section: 'intro', key: 'text', marker: 'Magguu Settings (overlay/QoL only), Load profiles (activate only), and WowUp copy popups live on Setup. Companion addons' },
  { page: 'guide', section: 'steps', key: 'step_1', marker: "Ellesmere's start popup is skipped. MagguuUI Setup opens on that login so you can run Apply Magguu profiles." },
  { page: 'guide', section: 'steps', key: 'step_2', marker: 'Nested-only copies inside MagguuUI are obsolete.' },
  { page: 'guide', section: 'steps', key: 'step_3', marker: 'Whisper Messenger** — Magguu profile. Setup import button when loaded' },
  { page: 'guide', section: 'steps', key: 'step_4', marker: 'Logging in on an alt asks whether to load those profiles onto that character.' },
  { page: 'guide', section: 'steps', key: 'step_5', marker: 'TopBar, Hearth-Picker, and MagguuUI FPS/MS are not part of this build.' },
  { page: 'guide', section: 'steps', key: 'step_6', marker: "After a successful Cooldown Viewer import MagguuUI asks you to reload via Ellesmere's confirm popup" },
  { page: 'home', section: 'addons', key: 'subtitle', marker: 'BigWigs and Northern Sky Raid Tools are optional.' },
  { page: 'home', section: 'addons', key: 'subtitle', marker: 'BigWigs, Northern Sky, EXBoss, WIM, Whisper Messenger, Waypoint UI, HandyNotes, Talent Tree Tweaks, GTFO, BugSack, Premade Groups Filter, and Smart Reminders are optional.' },
  { page: 'home', section: 'addons', key: 'subtitle', marker: 'BigWigs, Northern Sky, EXBoss, WIM, Whisper Messenger, Waypoint UI, HandyNotes, Talent Tree Tweaks, GTFO, BugSack, Premade Groups Filter und Smart Reminders sind optional.', locale: 'de' },
  { page: 'home', section: 'hero', key: 'subtitle', marker: 'A native 4K overhaul for EllesmereUI.' },
  { page: 'home', section: 'hero', key: 'subtitle', marker: 'Ein natives 4K-Overhaul für EllesmereUI.', locale: 'de' },
  { page: 'home', section: 'features_heading', key: 'subtitle', marker: 'A 4K EllesmereUI setup with optional raid tools' },
  { page: 'home', section: 'features_heading', key: 'subtitle', marker: 'Ein 4K-EllesmereUI-Setup mit optionalen Raid-Tools', locale: 'de' },
  { page: 'home', section: 'features', key: 'feature_1_text', marker: 'Zwei Sidebar-Zeilen: <strong>Options</strong>', locale: 'de' },
  { page: 'guide', section: 'steps', key: 'step_4', marker: 'MagguuUI → Optionen → Setup' },
  { page: 'guide', section: 'steps', key: 'step_5', marker: 'In **MagguuUI → Optionen**:' },
  { page: 'home', section: 'features', key: 'feature_1_text', marker: '<li><strong>Changelog</strong></li>' },
  { page: 'home', section: 'features', key: 'feature_1_text', marker: '<li><strong>Changelog</strong></li>', locale: 'de' },
  { page: 'guide', section: 'steps', key: 'step_3', marker: 'HandyNotes, MapNotes, and' },
  { page: 'home', section: 'hero', key: 'description', marker: 'open <code>/mui</code>, run <strong>Apply Magguu profiles</strong>' },
  { page: 'home', section: 'hero', key: 'description', marker: '<code>/mui</code>, <strong>Magguu-Profile übernehmen</strong>', locale: 'de' },
  { page: 'home', section: 'hero', key: 'description', marker: 'four MagguuUI folders' },
  { page: 'home', section: 'hero', key: 'description', marker: 'vier MagguuUI-Ordner', locale: 'de' },
  { page: 'guide', section: 'intro', key: 'text', marker: 'four MagguuUI folders' },
  { page: 'guide', section: 'steps', key: 'step_2', marker: 'Copy all four folders' },
  { page: 'guide', section: 'steps', key: 'step_5', marker: 'leave EXBoss MythicCast off' },
  // 2026-11-02 QA copy: only the untouched old defaults (full text) are replaced; admin edits stay.
  { page: 'guide', section: 'steps', key: 'step_1', marker: 'Install **EllesmereUI 9.0.6+** from CurseForge, Wago, or WoWInterface and keep it enabled. MagguuUI will not load without it. Ellesmere start popup is skipped; MagguuUI Setup opens on that login.' },
  { page: 'home', section: 'hero', key: 'description', marker: 'Native <strong>EllesmereUI</strong> module for WoW Retail. Designed for 4K. Download EllesmereUI and MagguuUI from CurseForge, Wago, or WoWInterface, open <code>/mui</code>, and run <strong>Apply Magguu profiles</strong>.' },
] as const

export const LEGACY_FAQ_MARKERS = [
  { category: 'general', sortOrder: 0, marker: 'Instead of spending hours tweaking ElvUI' },
  { category: 'general', sortOrder: 0, marker: 'standalone World of Warcraft Retail installer' },
  { category: 'general', sortOrder: 1, marker: 'https://www.curseforge.com/wow/addons)' },
  { category: 'general', sortOrder: 2, marker: 'only ElvUI is required' },
  { category: 'general', sortOrder: 2, marker: 'Do I need every supported addon?' },
  { category: 'general', sortOrder: 2, marker: 'two folders included with every MagguuUI download' },
  { category: 'general', sortOrder: 4, marker: '11 localizations' },
  { category: 'general', sortOrder: 4, marker: 'WoW Retail 12.0' },
  { category: 'general', sortOrder: 4, marker: 'TOC interfaces 120000' },
  { category: 'installation', sortOrder: 0, marker: 'Install **ElvUI 15.12+**' },
  { category: 'installation', sortOrder: 0, marker: 'Five steps, takes about two minutes' },
  { category: 'installation', sortOrder: 0, marker: 'click **Install All**' },
  { category: 'installation', sortOrder: 0, marker: 'run the **4K install** on the Setup tab' },
  { category: 'installation', sortOrder: 1, marker: '/mui install' },
  { category: 'installation', sortOrder: 2, marker: 'Load Profiles** popup' },
  { category: 'installation', sortOrder: 2, marker: 're-run class layouts if you want' },
  { category: 'installation', sortOrder: 3, marker: '**No.** ElvUI is the foundation' },
  { category: 'installation', sortOrder: 3, marker: 'without ElvUI' },
  { category: 'installation', sortOrder: 3, marker: 'hard dependency' },
  { category: 'installation', sortOrder: 1, marker: 'in this build' },
  { category: 'addons', sortOrder: 0, marker: 'BigWigs (or Northern Sky Raid Tools)' },
  { category: 'addons', sortOrder: 0, marker: '**Main integrations**' },
  { category: 'addons', sortOrder: 0, marker: 'Plater or Platynator' },
  { category: 'addons', sortOrder: 2, marker: 'Master toggle sits in **Settings → Tags**' },
  { category: 'addons', sortOrder: 2, marker: '[mui:ilvl]' },
  { category: 'addons', sortOrder: 3, marker: 'Install All** — full first-time setup' },
  { category: 'addons', sortOrder: 0, marker: 'profile and alerts, if NSRT is present' },
  { category: 'addons', sortOrder: 0, marker: 'then an immediate reload' },
  { category: 'addons', sortOrder: 3, marker: 'from the **Profile** tab' },
  { category: 'addons', sortOrder: 1, marker: 'reloads immediately so Blizzard' },
  { category: 'addons', sortOrder: 1, marker: 'Addon code never writes Blizzard Edit Mode' },
  { category: 'addons', sortOrder: 1, marker: 'left tainted' },
  { category: 'addons', sortOrder: 1, marker: "Setup tab's copy action" },
  { category: 'addons', sortOrder: 3, marker: 'from the Setup tab' },
  { category: 'addons', sortOrder: 3, marker: '**4K install** — Ellesmere, then BigWigs if present' },
  { category: 'addons', sortOrder: 9, marker: 'Profile (import)' },
  { category: 'addons', sortOrder: 4, marker: 'WowUp Required / Optional' },
  { category: 'addons', sortOrder: 4, marker: 'They are recommendations, not requirements.' },
  { category: 'addons', sortOrder: 4, marker: 'WowUp](https://wowup.io/)' },
  { category: 'addons', sortOrder: 4, marker: 'MagguuUI no longer ships a WowUp package file' },
  { category: 'addons', sortOrder: 4, marker: 'The Strings page has two' },
  { category: 'addons', sortOrder: 3, marker: '**Magguu-Look** and a standalone **4K scale**' },
  { category: 'addons', sortOrder: 3, marker: 'Setup has no Edit Mode action' },
  { category: 'addons', sortOrder: 3, marker: 'Ellesmere QoL/Shifter defaults' },
  { category: 'addons', sortOrder: 7, marker: 'does not proxy EllesmereUI' },
  { category: 'addons', sortOrder: 8, marker: 'Nested TOC files' },
  { category: 'addons', sortOrder: 8, marker: 'LoadOnDemand MagguuUI_Data' },
  { category: 'addons', sortOrder: 9, marker: '/mui changelog' },
  { category: 'troubleshooting', sortOrder: 0, marker: 'protected setup waits until combat ends' },
  { category: 'troubleshooting', sortOrder: 2, marker: 'MagguuDB.toolsUnlocked' },
  { category: 'addons', sortOrder: 5, marker: 'Can MagguuUI auto-roll on loot for me?' },
  { category: 'addons', sortOrder: 5, marker: 'ColorModifiers' },
  { category: 'addons', sortOrder: 6, marker: 'What is MagguuUI Data' },
  { category: 'addons', sortOrder: 6, marker: 'audio output switcher' },
  { category: 'addons', sortOrder: 7, marker: 'What are the Dev Tools?' },
  { category: 'addons', sortOrder: 7, marker: 'AutoRoll' },
  { category: 'addons', sortOrder: 8, marker: 'MagguuUI Data' },
  { category: 'addons', sortOrder: 9, marker: 'Dev Tools tab' },
  { category: 'addons', sortOrder: 10, marker: 'Keystone List section in MagguuUI settings' },
  { category: 'addons', sortOrder: 10, marker: 'Keystone List' },
  { category: 'addons', sortOrder: 10, marker: 'character name and realm separately' },
  { category: 'addons', sortOrder: 3, marker: 'turn green after a Magguu import' },
  { category: 'installation', sortOrder: 2, marker: "Re-import class layouts if you want that character's Cooldown Viewer layout" },
  { category: 'addons', sortOrder: 7, marker: 'Per-spec proc-overlay hiding\n- Smart Tab' },
  { category: 'addons', sortOrder: 11, marker: '[mui:ilvl]' },
  { category: 'troubleshooting', sortOrder: 0, marker: 'ElvUI enabled and version 15.12' },
  { category: 'troubleshooting', sortOrder: 0, marker: 'At least one supported addon is enabled' },
  { category: 'troubleshooting', sortOrder: 0, marker: 'MagguuUI_Data is installed and enabled' },
  { category: 'troubleshooting', sortOrder: 0, marker: 'You confirmed Ellesmere and BigWigs popups' },
  { category: 'troubleshooting', sortOrder: 1, marker: 'Update Hint Mode' },
  { category: 'troubleshooting', sortOrder: 2, marker: 'Hard Reset' },
  { category: 'troubleshooting', sortOrder: 3, marker: 'Your ElvUI version' },
  { category: 'general', sortOrder: 0, marker: 'plus the MagguuUI folder' },
  { category: 'general', sortOrder: 2, marker: 'EllesmereUI 7.9.5+' },
  { category: 'general', sortOrder: 2, marker: 'one AddOns folder with nested' },
  { category: 'general', sortOrder: 4, marker: 'EllesmereUI 7.9.5 or newer' },
  { category: 'installation', sortOrder: 0, marker: 'Copy the single **MagguuUI** folder' },
  { category: 'installation', sortOrder: 0, marker: 'Delete leftover' },
  { category: 'installation', sortOrder: 0, marker: 'EllesmereUI 7.9.5+' },
  { category: 'addons', sortOrder: 0, marker: '**WIM**, and **Waypoint UI**, if those addons are present' },
  { category: 'addons', sortOrder: 2, marker: 'Data and Media live **inside** the MagguuUI folder' },
  { category: 'addons', sortOrder: 2, marker: 'If you still have' },
  { category: 'addons', sortOrder: 3, marker: 'standalone **4K scale** action' },
  { category: 'addons', sortOrder: 3, marker: 'Optional: BigWigs, Northern Sky, WIM, and Waypoint UI' },
  { category: 'addons', sortOrder: 4, marker: 'plus the MagguuUI folder' },
  { category: 'addons', sortOrder: 4, marker: 'extras such as BugSack, MDT, Raider.IO' },
  { category: 'addons', sortOrder: 4, marker: 'Premade Groups Filter, and KeystoneLoot' },
  { category: 'addons', sortOrder: 8, marker: 'Why is MagguuUI only one folder now?' },
  { category: 'addons', sortOrder: 8, marker: 'ships **one folder**. Leave it enabled. Delete leftover' },
  { category: 'addons', sortOrder: 11, marker: 'standalone scale action apply' },
  { category: 'troubleshooting', sortOrder: 0, marker: 'EllesmereUI 7.9.5+ is installed and enabled' },
  { category: 'troubleshooting', sortOrder: 0, marker: 'MagguuUI is the single folder' },
  { category: 'troubleshooting', sortOrder: 1, marker: 'EllesmereUI is 7.9.5 or newer' },
  { category: 'troubleshooting', sortOrder: 2, marker: 'Delete leftover MagguuUI_* folders' },
  { category: 'addons', sortOrder: 4, marker: 'KeystoneLoot, and Auctionator' },
  { category: 'addons', sortOrder: 4, marker: 'HandyNotes, MDT, Raider.IO' },

  { category: 'general', sortOrder: 2, marker: 'KeystoneLoot' },
  { category: 'installation', sortOrder: 0, marker: 'KeystoneLoot' },
  { category: 'installation', sortOrder: 2, marker: 'KeystoneLoot Best in Slot' },
  { category: 'addons', sortOrder: 0, marker: 'KeystoneLoot' },
  { category: 'addons', sortOrder: 3, marker: 'KeystoneLoot' },
  { category: 'installation', sortOrder: 2, marker: 'KeystoneLoot' },
  { category: 'addons', sortOrder: 4, marker: 'KeystoneLoot' },
  { category: 'addons', sortOrder: 3, marker: 'all four Skinning NAMES & COLORS toggles' },
  { category: 'addons', sortOrder: 10, marker: 'Split EXBoss names' },
  { category: 'addons', sortOrder: 10, marker: 'How do split names work?' },
  { category: 'addons', sortOrder: 7, marker: 'Smart Tab (chat channel cycling)\n- Quick Focus' },
  { category: 'general', sortOrder: 0, marker: 'run **Install All**' },
  { category: 'installation', sortOrder: 0, marker: 'run **Install All** on Setup' },
  { category: 'addons', sortOrder: 0, marker: 'What does Install All configure?' },
  { category: 'addons', sortOrder: 0, marker: 'authors per role' },
  { category: 'addons', sortOrder: 0, marker: '**Northern Sky Raid Tools**, **WIM**, **Waypoint UI**, and **EXBoss**' },
  { category: 'addons', sortOrder: 3, marker: 'delta-only Ellesmere bake at scale 0.58' },
  { category: 'addons', sortOrder: 3, marker: 'reimport the Ellesmere bake' },
  { category: 'addons', sortOrder: 3, marker: 'Dump addons apply' },
  { category: 'installation', sortOrder: 0, marker: 'bake + Magguu Settings + companions' },
  { category: 'installation', sortOrder: 2, marker: 'does not reimport the bake' },
  { category: 'addons', sortOrder: 0, marker: 'bake + Magguu Settings + companions' },
  { category: 'addons', sortOrder: 3, marker: 'Optional: BigWigs, Northern Sky, WIM, Waypoint UI, and EXBoss' },
  { category: 'general', sortOrder: 2, marker: 'Optional Magguu imports also include WIM, Waypoint UI, and EXBoss' },
  { category: 'installation', sortOrder: 0, marker: 'Optionally install BigWigs, LittleWigs, Northern Sky, WIM, Waypoint UI, and/or EXBoss' },
  { category: 'addons', sortOrder: 3, marker: 'What is the difference between Install All and individual profiles?' },
  { category: 'general', sortOrder: 2, marker: 'BugSack, and Premade Groups Filter.' },
  { category: 'addons', sortOrder: 0, marker: 'BugSack**, and **Premade Groups Filter**, if those addons are present' },
  { category: 'addons', sortOrder: 3, marker: 'GTFO / BugSack / Premade Groups Filter if present' },
  { category: 'addons', sortOrder: 7, marker: 'Hide Services on General\n- Quick Focus' },
  { category: 'addons', sortOrder: 7, marker: 'Hide Services on General (secret-safe)' },
  { category: 'addons', sortOrder: 3, marker: 'chat channels and size with Services off General' },
  { category: 'addons', sortOrder: 7, marker: 'leave EXBoss MythicCast off)\n\nSettings are stored' },
  { category: 'troubleshooting', sortOrder: 0, marker: "Install All didn't do anything" },
  { category: 'troubleshooting', sortOrder: 2, marker: 're-run **Install All**' },
  { category: 'general', sortOrder: 2, marker: 'EXBoss, WIM, Waypoint UI' },
  { category: 'installation', sortOrder: 0, marker: 'EXBoss, WIM, Waypoint UI' },
  { category: 'general', sortOrder: 2, marker: 'EXBoss, WIM, Whisper Messenger' },
  { category: 'installation', sortOrder: 0, marker: 'EXBoss, WIM, Whisper Messenger' },
  { category: 'addons', sortOrder: 0, marker: '**Whisper Messenger**, **WIM**' },
  { category: 'addons', sortOrder: 3, marker: '/ WIM / Whisper Messenger' },
  { category: 'addons', sortOrder: 3, marker: 'Smart Reminders. WIM, Waypoint UI' },
  { category: 'addons', sortOrder: 0, marker: '- **WIM**, **Waypoint UI**, **HandyNotes**' },
  { category: 'addons', sortOrder: 3, marker: 'EXBoss / WIM / Waypoint UI' },
  { category: 'addons', sortOrder: 3, marker: 'Northern Sky, EXBoss, Smart Reminders' },
  { category: 'addons', sortOrder: 4, marker: 'Ellesmere WIM Skin' },
  { category: 'general', sortOrder: 0, marker: 'native 4K overhaul and curated profile companion' },
  { category: 'addons', sortOrder: 11, marker: 'current **4K Ellesmere profile**' },
  { category: 'general', sortOrder: 0, marker: 'MagguuUI → Optionen' },
  { category: 'installation', sortOrder: 1, marker: 'opens hidden Werkzeuge' },
  { category: 'addons', sortOrder: 1, marker: 'Werkzeuge can copy a layout' },
  { category: 'addons', sortOrder: 6, marker: 'hidden **Werkzeuge**' },
  { category: 'addons', sortOrder: 9, marker: '/mui werkzeuge` — Werkzeuge' },
  { category: 'troubleshooting', sortOrder: 2, marker: 'Werkzeuge stays unlocked' },
  { category: 'general', sortOrder: 0, marker: 'four MagguuUI addon folders' },
  { category: 'general', sortOrder: 2, marker: 'four sibling AddOns folders' },
  { category: 'installation', sortOrder: 0, marker: 'Copy all four MagguuUI folders' },
  { category: 'addons', sortOrder: 2, marker: 'BigWigs-style group' },
  { category: 'addons', sortOrder: 4, marker: 'four MagguuUI addon folders' },
  { category: 'addons', sortOrder: 8, marker: 'four sibling addons' },
  { category: 'troubleshooting', sortOrder: 0, marker: 'All four MagguuUI folders are enabled' },
  { category: 'troubleshooting', sortOrder: 1, marker: 'all four MagguuUI folders' },
  { category: 'troubleshooting', sortOrder: 2, marker: 'four sibling folders' },
  { category: 'general', sortOrder: 0, marker: 'no separate options window' },
  { category: 'addons', sortOrder: 9, marker: '/mui werkzeuge` — Tools' },
] as const

export const BOOT_LEGACY_SETTING_VALUES = [
  {
    key: 'meta_title',
    value: 'MagguuUI - Your WoW Interface, perfected.',
    replacement: SITE_SETTINGS_DEFAULTS.meta_title,
  },
  {
    key: 'site_description',
    value: 'World of Warcraft UI Configuration',
    replacement: SITE_SETTINGS_DEFAULTS.site_description,
  },
  {
    key: 'site_description',
    value: 'Standalone World of Warcraft Retail UI installer',
    replacement: SITE_SETTINGS_DEFAULTS.site_description,
  },
  {
    key: 'meta_description',
    value: 'High-quality import strings for ElvUI, Plater, BigWigs, Details and more. Simply copy and paste into WoW.',
    replacement: SITE_SETTINGS_DEFAULTS.meta_description,
  },
  {
    key: 'meta_description',
    value: 'Standalone WoW Retail setup with no required external addons. Install MagguuUI, choose the integrations you want, and apply their profiles with one click.',
    replacement: SITE_SETTINGS_DEFAULTS.meta_description,
  },
  {
    key: 'meta_description',
    value: 'Native 4K overhaul for EllesmereUI. Install EllesmereUI and MagguuUI, open /mui, and run the 4K setup. BigWigs and Northern Sky Raid Tools stay optional.',
    replacement: SITE_SETTINGS_DEFAULTS.meta_description,
  },
  {
    key: 'meta_description',
    value: 'Native 4K overhaul for EllesmereUI. Install EllesmereUI and the four MagguuUI folders, open /mui, and run Apply Magguu profiles. BigWigs and Northern Sky stay optional.',
    replacement: SITE_SETTINGS_DEFAULTS.meta_description,
  },
  {
    key: 'site_description',
    value: 'Native 4K overhaul and curated profiles for EllesmereUI',
    replacement: SITE_SETTINGS_DEFAULTS.site_description,
  },
  {
    key: 'meta_description',
    value: 'Native 4K overhaul for EllesmereUI. Install EllesmereUI and the four MagguuUI folders, open /mui, and run Apply Magguu profiles. Companion addons stay optional.',
    replacement: SITE_SETTINGS_DEFAULTS.meta_description,
  },
  {
    key: 'meta_description',
    value: 'Native overhaul for EllesmereUI, designed for 4K. Download EllesmereUI and MagguuUI from CurseForge, open /mui, and run Apply Magguu profiles.',
    replacement: SITE_SETTINGS_DEFAULTS.meta_description,
  },
  {
    key: 'site_description',
    value: 'Native overhaul and curated profiles for EllesmereUI',
    replacement: SITE_SETTINGS_DEFAULTS.site_description,
  },
  {
    key: 'meta_description',
    value: 'Native overhaul for EllesmereUI. Install EllesmereUI and the four MagguuUI folders, open /mui, and run Apply Magguu profiles. Companion addons stay optional.',
    replacement: SITE_SETTINGS_DEFAULTS.meta_description,
  },
  {
    key: 'meta_description',
    value: 'Native overhaul for EllesmereUI, designed for 4K. Install EllesmereUI and the four MagguuUI folders, open /mui, and run Apply Magguu profiles.',
    replacement: SITE_SETTINGS_DEFAULTS.meta_description,
  },
] as const

/** Rewrites links to the private addon repo in content, FAQs and changelogs. */
export function rewritePrivateRepoLinksInDb(sqlite: WebsiteBootSqlite): number {
  const like = '%github.com/Derpsen/MagguuUI%'
  let changed = 0
  const targets: Array<{ table: string, columns: string[] }> = [
    { table: 'site_content', columns: ['value'] },
    { table: 'faqs', columns: ['question', 'answer'] },
    { table: 'changelogs', columns: ['content', 'content_en'] },
  ]
  for (const { table, columns } of targets) {
    for (const column of columns) {
      const rows = sqlite.prepare(`SELECT id, "${column}" AS v FROM "${table}" WHERE "${column}" LIKE ?`).all(like) as Array<{ id: number, v: string | null }>
      const update = sqlite.prepare(`UPDATE "${table}" SET "${column}" = ? WHERE id = ?`)
      for (const row of rows) {
        if (!row.v) continue
        const next = rewritePrivateRepoLinks(row.v)
        if (next !== row.v) {
          update.run(next, row.id)
          changed++
        }
      }
    }
  }
  return changed
}

export function repairLegacySettingValues(db: WebsiteBootDb, existingSettings: WebsiteBootSetting[]): number {
  let repairedSettings = 0
  for (const legacy of BOOT_LEGACY_SETTING_VALUES) {
    const setting = existingSettings.find(item => item.key === legacy.key)
    if (!setting || setting.value !== legacy.value) continue
    db.update(settings)
      .set({ value: legacy.replacement, updatedAt: new Date() })
      .where(eq(settings.id, setting.id))
      .run()
    repairedSettings++
  }
  return repairedSettings
}

export function clearPrivateGithubSetting(db: WebsiteBootDb, existingSettings: WebsiteBootSetting[]): number {
  const githubSetting = existingSettings.find(item => item.key === 'github_url')
  if (githubSetting && isPrivateRepoUrl(githubSetting.value)) {
    db.update(settings).set({ value: '', updatedAt: new Date() }).where(eq(settings.id, githubSetting.id)).run()
    return 1
  }
  return 0
}

export function applyLegacyContentMarkers(db: WebsiteBootDb): number {
  let repairedContent = 0
  for (const legacy of LEGACY_CONTENT_MARKERS) {
    const locale = 'locale' in legacy ? legacy.locale : DEFAULT_CONTENT_LOCALE
    const replacement = DEFAULT_SITE_CONTENT.find(entry =>
      entry.page === legacy.page
      && entry.section === legacy.section
      && entry.key === legacy.key
      && entry.locale === locale,
    )
    if (!replacement) continue

    const row = db.select().from(siteContent)
      .where(and(
        eq(siteContent.page, legacy.page),
        eq(siteContent.section, legacy.section),
        eq(siteContent.key, legacy.key),
        eq(siteContent.locale, locale),
      ))
      .get()
    if (!row) continue
    const exact = 'exact' in legacy && legacy.exact
    if (exact ? row.value.trim() !== legacy.marker : !row.value.includes(legacy.marker)) continue

    db.update(siteContent)
      .set({
        value: replacement.value,
        type: replacement.type,
        sortOrder: replacement.sortOrder,
        updatedAt: new Date(),
      })
      .where(eq(siteContent.id, row.id))
      .run()
    repairedContent++
  }
  return repairedContent
}

export function repairRetiredContactEmail(db: WebsiteBootDb): void {
  try {
    const fixed = db.update(settings)
      .set({ value: SITE_SETTINGS_DEFAULTS.contact_email })
      .where(and(eq(settings.key, 'contact_email'), eq(settings.value, 'contact@magguui.com')))
      .run()
    if ((fixed.changes ?? 0) > 0) console.log('[Init] Updated retired contact email')
  }
  catch (err) {
    console.error('[Init] Contact email fix failed:', err)
  }
}
