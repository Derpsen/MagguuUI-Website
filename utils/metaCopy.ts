import { META_MIN_BUILD_SAMPLE, META_MIN_ITEM_SAMPLE, META_MIN_SHOW_SAMPLE, META_SNAPSHOT_TTL_MS } from './metaTypes'

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
  unavailable: string
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
  partialNote: string
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


const META_RETAIN_DAYS = META_SNAPSHOT_TTL_MS / (24 * 60 * 60 * 1000)
const META_LOW_SAMPLE_MAX = META_MIN_BUILD_SAMPLE - 1

function stripEndPeriod(value: string): string {
  return value.endsWith('.') ? value.slice(0, -1) : value
}

function methodologyThresholds(empty: string, unavailable: string): { minSample: string, faqSampleA: string } {
  return {
    minSample: `A specialization needs ${META_MIN_BUILD_SAMPLE} sampled players for a best build. Between ${META_MIN_SHOW_SAMPLE} and ${META_LOW_SAMPLE_MAX} players the figures are shown with a low-sample badge. Below ${META_MIN_SHOW_SAMPLE}, and when no snapshot is available, the page says ${stripEndPeriod(empty)}. Slot items below ${META_MIN_ITEM_SAMPLE} samples get a low-sample badge. After ${META_RETAIN_DAYS} days without a fresh snapshot the page says ${stripEndPeriod(unavailable)}.`,
    faqSampleA: `It is below the minimum sample of ${META_MIN_BUILD_SAMPLE} characters in this snapshot. The row stays visible so you can still see the trend.`,
  }
}

const META_THRESHOLD_COPY = methodologyThresholds('Collecting data.', 'Data unavailable.')

export const META_COPY_EN: MetaCopy = {
  eyebrow: 'Meta',
  indexTitle: 'Mythic+ Meta',
  indexDescription: 'Popular specializations, talents and gear for EU Mythic+, aggregated from public game data.',
  indexLead: 'What shows up most often in EU Mythic+, from a nightly server-side snapshot. Independent overviews stay on their own sites.',
  empty: 'Collecting data.',
  unavailable: 'Data unavailable.',
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
  noSpecData: 'Collecting data.',
  noClassData: 'Collecting data.',
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
  partialNote: 'Partial data.',
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
  minSample: META_THRESHOLD_COPY.minSample,
  lowPopularity: 'Low popularity ≠ unplayable.',
  faqTitle: 'FAQ',
  faqSampleQ: 'Why is a specialization faded?',
  faqSampleA: META_THRESHOLD_COPY.faqSampleA,
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
  empty: 'Daten werden gesammelt.',
  unavailable: 'Daten nicht verfügbar.',
  partialNote: 'Unvollständige Daten.',
}

/** Confirmed language: English. */
export const META_COPY: MetaCopy = META_COPY_EN
