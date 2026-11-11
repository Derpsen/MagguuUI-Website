/**
 * Centralized Meta page copy. English is the confirmed language.
 * German strings stay next to it so a later switch does not scatter text.
 */

export type MetaCopy = {
  eyebrow: string
  indexTitle: string
  indexDescription: string
  indexLead: string
  empty: string
  attribution: string
  alsoSee: string
  murlokLabel: string
  archonLabel: string
  icyVeinsLabel: string
  alsoSeeAfter: string
  homeLink: string
  popularSpecs: string
  talents: string
  gear: string
  noSpecData: string
  noClassData: string
  characters: string
  share: string
  count: string
  snapshot: string
  fetched: string
  sample: string
  keyLevels: string
  region: string
  source: string
  sourceValue: string
  noSnapshot: string
  roleAll: string
  roleDps: string
  roleTank: string
  roleHealer: string
  roleFilter: string
  classGrid: string
  popularity: string
  avgKey: string
  topKey: string
  methodology: string
  methodologyBody: string
  minSample: string
  lowPopularity: string
  faqTitle: string
  faqSampleQ: string
  faqSampleA: string
  faqLowPopQ: string
  faqLowPopA: string
  faqSourceQ: string
  faqSourceA: string
  overview: string
  stats: string
  trinkets: string
  rings: string
  embellishments: string
  enchantsGems: string
  enchants: string
  gems: string
  races: string
  faq: string
  topBuild: string
  alternatives: string
  copyBuild: string
  copied: string
  heroSplit: string
  talentClass: string
  talentSpec: string
  talentHero: string
  bandCore: string
  bandFlexible: string
  bandRare: string
  statPrio: string
  statBias: string
  setBadge: string
  craftBadge: string
  furtherReading: string
  belowSample: string
  slot: string
  bestBuild: string
  maxKey: string
  talentPopularity: string
  viewMore: string
  bySpec: string
  byClass: string
  groupBy: string
  filters: string
  season: string
  statPriority: string
  pickRate: string
  parses: string
  classTitle: (className: string) => string
  specTitle: (className: string, specName: string) => string
  classDescription: (className: string) => string
  specDescription: (className: string, specName: string) => string
}

export const META_COPY_EN: MetaCopy = {
  eyebrow: 'Meta',
  indexTitle: 'Mythic+ Meta',
  indexDescription: 'Popular specializations, talents and gear for EU Mythic+, aggregated from public game data.',
  indexLead: 'What shows up most often in EU Mythic+, from a nightly server-side snapshot. Independent overviews stay on their own sites.',
  empty: 'No data yet. This page is filled by a nightly update once the game data source is configured.',
  attribution: "Data provided by Blizzard's Battle.net API. Not affiliated with or endorsed by Blizzard Entertainment.",
  alsoSee: 'Also see',
  murlokLabel: 'murlok.io',
  archonLabel: 'Archon',
  icyVeinsLabel: 'Icy Veins',
  alsoSeeAfter: 'for independent overviews (outbound links only).',
  homeLink: 'MagguuUI',
  popularSpecs: 'Popular specializations',
  talents: 'Talents',
  gear: 'Gear',
  noSpecData: 'No data yet for this specialization.',
  noClassData: 'No data yet for this class.',
  characters: 'characters',
  share: 'Share',
  count: 'Count',
  snapshot: 'Snapshot',
  fetched: 'As of',
  sample: 'Sample',
  keyLevels: 'Key levels',
  region: 'Region',
  source: 'Source',
  sourceValue: 'Blizzard Battle.net API',
  noSnapshot: 'No snapshot yet.',
  roleAll: 'All',
  roleDps: 'DPS',
  roleTank: 'Tank',
  roleHealer: 'Healer',
  roleFilter: 'Role',
  classGrid: 'Classes',
  popularity: 'Popularity',
  avgKey: 'Avg key',
  topKey: 'Top key',
  methodology: 'Methodology',
  methodologyBody: 'Figures come from a capped sample of EU Mythic+ leaderboard entries, then a further capped look at character specializations and equipment. Totals are counts in that sample, not a complete region census. The nightly job stores only aggregates — no character names. Consumables are omitted because the APIs used here do not provide them.',
  minSample: 'A specialization with fewer than 20 sampled characters is shown faded. Treat those numbers as indicative, not conclusive.',
  lowPopularity: 'Low popularity ≠ unplayable.',
  faqTitle: 'FAQ',
  faqSampleQ: 'Why is a specialization faded?',
  faqSampleA: 'It is below the minimum sample of 20 characters in this snapshot. The row stays visible so you can still see the trend.',
  faqLowPopQ: 'Does a low share mean a specialization is weak?',
  faqLowPopA: 'No. Low popularity ≠ unplayable. This page reports what the sample used, not a tier list.',
  faqSourceQ: 'Where does the data come from?',
  faqSourceA: 'The operator retrieves EU Mythic+ leaderboards and character specializations/equipment from the Blizzard Game Data and Profile APIs on the server. Pages here do not call those APIs from your browser.',
  overview: 'Overview',
  stats: 'Stats',
  trinkets: 'Trinkets',
  rings: 'Rings',
  embellishments: 'Embellishments',
  enchantsGems: 'Enchants & Gems',
  enchants: 'Enchants',
  gems: 'Gems',
  races: 'Race',
  faq: 'FAQ',
  topBuild: 'Top build',
  alternatives: 'Alternative builds',
  copyBuild: 'Copy',
  copied: 'Copied',
  heroSplit: 'Hero tree',
  talentClass: 'Class',
  talentSpec: 'Specialization',
  talentHero: 'Hero',
  bandCore: 'Core',
  bandFlexible: 'Flexible',
  bandRare: 'Rare',
  statPrio: 'Stat priority (sample averages)',
  statBias: 'Averages are taken from equipped items in the sample. They can lag the current season and are not a recommendation.',
  setBadge: 'Set',
  craftBadge: 'Craft',
  furtherReading: 'Further reading',
  belowSample: 'Below minimum sample',
  slot: 'Slot',
  bestBuild: 'Best build',
  maxKey: 'Max key',
  talentPopularity: 'Popularity',
  viewMore: 'View more',
  bySpec: 'By spec',
  byClass: 'By class',
  groupBy: 'Group by',
  filters: 'Filters',
  season: 'Season',
  statPriority: 'Stat priority',
  pickRate: 'Pick rate',
  parses: 'in sample',
  classTitle: className => `${className} · Mythic+ Meta`,
  specTitle: (className, specName) => `${specName} ${className} – Mythic+ Builds`,
  classDescription: className => `Popular specializations, talents and gear for ${className} in EU Mythic+.`,
  specDescription: (className, specName) => `Talents, stats and gear for ${specName} ${className} in EU Mythic+.`,
}

export const META_COPY_DE: MetaCopy = {
  ...META_COPY_EN,
  attribution: 'Daten bereitgestellt von der Battle.net-API von Blizzard. Nicht affiliert mit oder empfohlen von Blizzard Entertainment.',
  empty: 'Noch keine Daten. Diese Seite wird durch ein nächtliches Update gefüllt, sobald die Spieldatenquelle eingerichtet ist.',
}

/** Confirmed language: English. */
export const META_COPY: MetaCopy = META_COPY_EN
