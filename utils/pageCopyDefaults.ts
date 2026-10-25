/**
 * Default copy for public pages whose text is editable in Admin → Content → Pages
 * (and the Home hero extras). The public page renders the site_content value when
 * present and falls back to these defaults, so an empty DB keeps the current text.
 * Saving an empty field in admin deletes the row and restores the default.
 */

export interface PageCopyField {
  section: string
  key: string
  label: string
  type: 'text' | 'html'
}

export type PageCopyDefaults = Record<string, Record<string, string>>

export const HOME_HERO_EXTRA_DEFAULTS = {
  eyebrow: 'WoW Retail · EllesmereUI',
  step_1: 'Download EllesmereUI and MagguuUI from CurseForge, Wago, or WoWInterface.',
  step_2: 'Open <code>/mui</code>.',
  step_3: 'Run <strong>Apply Magguu profiles</strong>.',
} as const

export const ABOUT_DEFAULTS: PageCopyDefaults = {
  header: { eyebrow: 'Project', title: 'About' },
  intro: {
    title: 'What is MagguuUI?',
    body: '<p>MagguuUI is a native overhaul for <strong>EllesmereUI</strong> on World of Warcraft Retail. Designed for 4K. It has no standalone installer and no options window of its own; Setup opens inside EllesmereUI. Everything lives in EllesmereUI under MagguuUI → Options.</p><p>Download <strong>EllesmereUI 9.0.6+</strong> and MagguuUI from CurseForge, Wago, or WoWInterface, and leave them enabled. BigWigs, Northern Sky, EXBoss, Whisper Messenger, Waypoint UI, HandyNotes, Talent Tree Tweaks, GTFO, BugSack, Premade Groups Filter, and Smart Reminders are optional. MagguuUI sets them up when they are installed and skips them otherwise.</p>',
  },
  features: {
    title: 'What it does',
    body: '<dl>'
      + '<dt>Native Ellesmere module</dt><dd>Two sidebar rows: Options (Setup, Skinning, QoL) and Changelog. Open it with <code>/mui</code>.</dd>'
      + '<dt>Apply Magguu profiles</dt><dd>Magguu Ellesmere profile at UI scale 0.58 plus Magguu Settings and companions. Magguu Settings is overlay/QoL only. Load profiles activates Magguu profiles, including optional companions. Ellesmere start popup is skipped. MagguuUI Setup opens on that login.</dd>'
      + '<dt>Class layouts</dt><dd>Imported as <code>Magguu - Class Spec</code>. After a successful Cooldown Viewer import MagguuUI asks you to reload. Import buttons: green = Magguu profile loaded on this character, orange = installed but not loaded here, red = missing.</dd>'
      + '<dt>WowUp copy popups</dt><dd>Starter pack (EllesmereUI, MagguuUI, BigWigs, LittleWigs, Northern Sky, EXBoss, EXCore) and optional extras (including Premade Groups Filter, Auctionator, Smart Reminders, and HandyNotes MapNotes) copy from Setup. Paste in WowUp. Buttons turn green when the pack addons are present. Apply Magguu profiles writes the HUD Edit Mode layout MagguuUI once.</dd>'
      + '<dt>Skinning</dt><dd>One NAMES &amp; COLORS section (two columns): two-tone unit-frame and party/raid names (default + class color) plus class-colored keybind modifiers.</dd>'
      + '<dt>Quality of life</dt><dd>Death-release protection, co-tank frame and debuffs, stealth and stance reminders, spell-alert opacity, per-spec proc-overlay hiding, party and raid item level (and 2P/4P), Smart Tab, Quick Focus, the audio device switcher, Boiling Point, and Targeted Spell Bars. Services stay untouched.</dd>'
      + '<dt>Hidden Tools</dt><dd>Profile exports and Discord boost via <code>/mui tools</code>. Click the MagguuUI header ten times to unlock the sidebar row.</dd>'
      + '</dl>',
  },
  website: {
    title: 'What this website is for',
    body: '<p>The website is a backup for the profiles MagguuUI already ships in-game. Use <a href="/strings">Strings</a> to copy a class layout or to see the current set, and the <a href="/changelog">Changelog</a> for each release. For most people, <code>/mui</code> and Apply Magguu profiles are enough.</p>',
  },
  contact: {
    title: 'Contact',
    lead: 'Questions, feedback or bug reports: email',
  },
  legal: {
    title: 'Legal',
    body: '<p>World of Warcraft and all related trademarks are registered trademarks of Blizzard Entertainment, Inc. MagguuUI is not officially affiliated with Blizzard Entertainment.</p>',
  },
}

export const IMPRINT_DEFAULTS: PageCopyDefaults = {
  header: { title: 'Legal notice' },
  operator: { label: 'Operator', text: 'MagguuUI is a free, non-commercial project operated from Switzerland.' },
  contact: { label: 'Contact' },
  disclaimer: {
    label: 'Disclaimer',
    text: 'World of Warcraft and all related trademarks are registered trademarks of Blizzard Entertainment, Inc. MagguuUI is not officially affiliated with Blizzard Entertainment.',
  },
}

export const PRIVACY_DEFAULTS: PageCopyDefaults = {
  header: { eyebrow: 'GDPR', title: 'Privacy' },
  s1: {
    title: '1. Privacy at a Glance',
    body: '<h3>General Information</h3><p>The following information provides a simple overview of what happens to your personal data when you visit this website.</p><h3>Data Collection on This Website</h3><p>Data processing on this website is carried out by the website operator. Contact details can be found in the <a href="/imprint">Legal notice</a>.</p>',
  },
  s2: {
    title: '2. Hosting',
    body: '<p>This website is hosted on private servers. When visiting the website, the server automatically collects information in server log files that your browser transmits (IP address, browser type, operating system, referrer URL, time of access).</p>',
  },
  s3: {
    title: '3. General Information and Mandatory Disclosures',
    body: '<h3>Data Protection</h3><p>The operator of this site takes the protection of your personal data very seriously. We treat your personal data confidentially and in accordance with the statutory data protection regulations and this privacy policy.</p><h3>Responsible Party</h3><p>The responsible party for data processing on this website can be found in the <a href="/imprint">Legal notice</a>.</p>',
  },
  s4: {
    title: '4. Data Collection on This Website',
    body: '<h3>Cookies and browser storage</h3><p>Without your agreement this website sets no cookie apart from <strong>mg_consent</strong>, which only remembers your choice in the cookie banner and is set when you click one of its buttons (see sections 10 and 11). The local storage of your browser is used for two functional settings only, which are never sent to the server: your Dark/Light theme choice (key <strong>nuxt-color-mode</strong>) and the release note you last saw (key <strong>lastSeenVersion</strong>). No tracking cookies or third-party cookies are used.</p><h3>Server Log Files</h3><p>The hosting provider automatically collects and stores information in server log files that your browser transmits:</p><ul><li>Browser type and version</li><li>Operating system</li><li>Referrer URL</li><li>IP address (the full address; it is not shortened or anonymized)</li><li>Time of server request</li></ul><p>This site itself writes these values to its database only if you agree to the optional visitor statistics (sections 10 to 12); the anonymous counting in section 7 stores no address. Every request also passes through Cloudflare, which is described in section 12.</p><h3>Contact via Email</h3><p>If you contact us via email, your information will be stored for the purpose of processing your inquiry. Your data will not be shared with third parties.</p>',
  },
  s5: {
    title: '5. External Services',
    body: '<h3>Self-Hosted Fonts</h3><p>This site uses self-hosted web fonts for font rendering. The required font files are served directly by this application, so no separate font request is sent from your browser to a third-party font provider when you open a page.</p>',
  },
  s6: {
    title: '6. Your Rights',
    body: '<p>You have the right at any time to free information about your stored personal data, its origin and recipients, and the purpose of data processing, as well as the right to correction, blocking, or deletion of this data. For this purpose and for any further questions regarding data protection, you may contact us at any time.</p>',
  },
  s7: {
    title: '7. Anonymous Usage Counting',
    body: '<p>To see which pages and import strings are useful, this site counts visits and copy clicks without identifying anyone.</p><h3>What is counted</h3><ul><li>A page view: the page address (without any query), the referring website name if there is one, and your browser family, operating system and device type (for example Firefox, Windows, desktop).</li><li>A copy click: which published profile, WowUp collection, class layout or approved community preset was copied, and when.</li><li>A daily visitor figure: a short code made from a coarse part of your network address and your browser family, mixed with a random secret that is kept only in memory and replaced every day. The code cannot be turned back into an address and cannot be matched from one day to the next.</li><li>A page load measurement: the page address and the loading speed values your browser reports for it (LCP, INP, CLS and TTFB, as plain numbers), sent once when you leave the page. It carries no identifier, no cookie and no address of yours, and it is not sent from the administration area.</li></ul><h3>What is not stored</h3><p>No cookies, no browser storage identifiers, no fingerprinting, no full IP address and no user-agent text. Nothing is shared with third parties. If your browser sends Do Not Track or Global Privacy Control, nothing is counted. Crawlers, administrators who are logged in, and unknown pages are not counted in the page view and copy click figures.</p><h3>How long it is kept</h3><p>Individual counting records are deleted after 14 days. Before that they are summed into daily totals per page and per copied item, which contain no visitor codes and are kept for up to 400 days (about 13 months). Page load measurements are deleted after {{retention_days}} days.</p><h3>Optional detailed statistics</h3><p>The counting in this section is separate from the optional detailed statistics in sections 10 to 12. Those run only if you agree in the cookie banner. Without your agreement, only what this section describes happens.</p>'
  },
  s8: {
    title: '8. Community Preset Submissions',
    body: '<p>Visitors can send in their own preset strings through the submission form. This is optional and works without an account.</p><h3>What you submit</h3><ul><li>A short name, the addon, the preset string itself, an optional short note and the addon version you tested it with.</li><li>Please do not enter personal data. The form asks for no name, no email address and no contact details, and links are not accepted in the text fields.</li></ul><h3>What is not stored</h3><p>No cookies, no account, no IP address and no user-agent text are stored with a submission. To block automated abuse, the form uses a signed time token that is not stored anywhere and short-lived counters that exist only in memory. They are derived from a code of your network address that is mixed with a random daily secret, and they disappear at the latest when the server restarts. Nothing is written to the database or to a log.</p><h3>Review and publication</h3><p>Every submission is moderated by the site operator before anything is shown. Only approved presets are public: they appear on the Import Strings page with the name, the addon, the tested version and the note, clearly marked as community-submitted and not verified or endorsed by MagguuUI. Anyone can copy them. Copy clicks on approved presets are counted anonymously as described in section 7.</p><h3>How long it is kept</h3><p>Submissions that are not approved are deleted automatically 30 days after they were sent (rejected ones 30 days after the review). Approved presets stay online until they are removed. Because no identifying data is stored, a submission cannot be linked to a person. To have a preset removed, write to contact<span>&#64;</span>magguu.xyz (the Imprint page has the same address) and name the preset and the addon.</p>',
  },
  s9: {
    title: '9. Temporary Technical Records and Backups',
    body: '<p>Two technical details that go with sections 7 and 8.</p><h3>Request limits</h3><p>To keep the site usable, the server counts how often one visitor sends requests. For the anonymous counting requests this counter is stored in the database under a code, never under the address itself: the code is made from the network part of your address (for IPv6 the first 64 bits) mixed with the random daily secret from section 7. These counters are deleted after about ten minutes, and their number is capped. The sign-in protection of the administration area may keep a network address for up to 24 hours. The preset form uses counters in memory only, as described in section 8.</p><h3>Earlier data and backups</h3><p>Earlier versions of the counting stored a full IP address and user-agent text with page views and copy clicks. Those values were removed, and the database file was compacted so that the removed values no longer remain in free space. Backups of the database that were made before this clean-up may still contain these old values until those backups are replaced or deleted. Backups are private to the operator and are not shared. If you want a specific record handled earlier, write to the address on the Imprint page.</p>',
  },
  s10: {
    title: '10. Optional Visitor Statistics: Consent and Purpose',
    body: '<p>Besides the anonymous counting in section 7, this site can measure its reach in more detail. This happens only if you agree in the cookie banner. Until you agree, none of what sections 10 to 12 describe takes place, and the site works the same way.</p><h3>Consent and how to withdraw it</h3><p>The banner shows the buttons "Accept all" and "Necessary only" with equal prominence. You can change your mind at any time with the link <strong>Cookie settings</strong> in the footer. Withdrawing consent stops the statistics immediately, removes the statistics cookies from your browser and deletes the records that belong to that browser (its sessions, visited pages and clicks). If your browser sends a Global Privacy Control or Do Not Track signal, this is treated as a refusal: the banner only tells you so, no statistics cookie and no consent cookie is set, and nothing is recorded.</p><h3>Purpose</h3><p>The only purpose is measuring reach: where visitors come from, which pages and features are used, and whether people come back. It helps the operator decide what to improve. The data is not used for advertising, profiling or any other purpose and is not combined with other data.</p><h3>Legal basis</h3><p>Your consent under Article 6(1)(a) GDPR and, for storing and reading information on your device (the cookies), Section 25(1) of the German TDDDG. Consent is voluntary and can be withdrawn at any time with effect for the future. Not agreeing has no disadvantage.</p><h3>No third parties</h3><p>The statistics are collected by this site itself, on the operator\'s own server. No third-party script, tracker, analytics service or advertising network is loaded, and no data about your visit is sent to one.</p>'
  },
  s11: {
    title: '11. Optional Visitor Statistics: What Is Stored',
    body: '<p>If you agree, the following is stored for each visit, in full, with nothing shortened or masked:</p><ul><li>Your complete IP address and your complete user-agent text (browser name and version, operating system, device). The network part of the address (for IPv6 the first 64 bits) is stored next to it and is used only for a daily limit per network, so that nobody can flood the records.</li><li>Your country and, if available, your city. Both come from headers that Cloudflare adds to the request; no separate location database is used on this site.</li><li>The referring website and its address, and campaign parameters in the address (utm_source, utm_medium, utm_campaign, utm_term, utm_content), shortened to a fixed length.</li><li>Screen size, browser language and time zone.</li><li>The pages you open, in order, with the time each page was visible and how far you scrolled (in steps of 25 %).</li><li>Clicks on marked buttons, on download links and on links to other websites, recorded as a fixed type and a short target name, never as free text.</li><li>The time of each step.</li></ul><h3>Cookies</h3><p>All three are first-party cookies set by this site and never shared.</p><ul><li><strong>mg_consent</strong>: your choice (yes or no), a format number and the time of your choice. Lifetime: 6 months from the day of your choice (renewed whenever you change it), so that the banner does not ask again on every visit. It is also set if you choose "Necessary only", because that choice has to be remembered as well.</li><li><strong>mg_sid</strong>: a random session number without any personal meaning. Set only after you agreed, lifetime: 30 minutes, renewed with every page you open, then it expires; not readable by scripts on the page.</li><li><strong>mg_vid</strong>: a random visitor number that lets the site recognize a returning visit. Set only after you agreed, lifetime: 13 months (395 days) from the day it was set, not extended by later visits; not readable by scripts on the page.</li></ul><p>Neither visitor cookie contains your IP address or any other data; they are only keys to the stored records. They are removed when you withdraw consent.</p>'
  },
  s12: {
    title: '12. Optional Visitor Statistics: Retention, Processors and Your Rights',
    body: '<h3>How long it is kept</h3><p>Records are kept in full for 13 months after the last activity of the visit and are then deleted. There is no earlier shortening of the IP address or the user agent. If you withdraw consent, the records of your browser are deleted right away.</p><h3>Backups</h3><p>Backups of the database that were made before a record was deleted may still contain it until those backups are replaced or deleted. Backups are private to the operator and are not shared.</p><h3>Cloudflare</h3><p>This site is reached through a Cloudflare Tunnel. Cloudflare therefore receives every request to this site (your IP address, the address you open, browser details) and passes it on to the operator\'s server. In doing so Cloudflare acts as a processor on behalf of the operator and as the transport network, and it adds the country and city headers described in section 11. This applies to every visit, whether or not you agree to statistics. The statistics records themselves are stored only on the operator\'s own server. Cloudflare is the only external service involved; no other third party receives data about your visit.</p><h3>Your rights</h3><p>You can ask for information about the data stored about you, for its correction or deletion, and you can object or withdraw consent at any time. To find your records the operator needs your IP address and the approximate time of your visit. Write to contact<span>&#64;</span>magguu.xyz. You also have the right to complain to a data protection supervisory authority.</p>'
  },
}

/** Pages editable in Admin → Content → Pages (site_content page key → defaults). */
export const EDITABLE_PAGE_DEFAULTS = {
  about: ABOUT_DEFAULTS,
  imprint: IMPRINT_DEFAULTS,
  privacy: PRIVACY_DEFAULTS,
} as const

export type EditablePageKey = keyof typeof EDITABLE_PAGE_DEFAULTS

export function isHtmlCopyKey(key: string): boolean {
  return key === 'body' || key.startsWith('step_')
}

/** Placeholders in the copy that the page fills from live settings, so a text never states a number the code does not use. */
export const COPY_TOKEN_RETENTION_DAYS = '{{retention_days}}'

export function fillCopyTokens(html: string, values: { retention_days?: string | number | null }): string {
  const n = Number(values.retention_days)
  const days = Number.isInteger(n) && n >= 1 && n <= 3650 ? n : 90
  return html.split(COPY_TOKEN_RETENTION_DAYS).join(String(days))
}

/** Merge DB content (section → key → value) over defaults; empty values fall back. */
export function mergePageCopy(defaults: PageCopyDefaults, content?: Record<string, Record<string, string>> | null): PageCopyDefaults {
  const out: PageCopyDefaults = {}
  for (const [section, keys] of Object.entries(defaults)) {
    out[section] = {}
    for (const [key, value] of Object.entries(keys)) {
      const stored = content?.[section]?.[key]
      out[section]![key] = typeof stored === 'string' && stored.trim() ? stored : value
    }
  }
  return out
}
