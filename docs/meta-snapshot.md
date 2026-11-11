# Meta snapshot fixture schema

Canonical fixture in the repo: `tests/fixtures/blizzard-meta/snapshot.json`
Types: `utils/metaTypes.ts`
Parser: `utils/metaSnapshot.ts` (`parseMetaSnapshotPayload`)

This is the **aggregated** snapshot shape stored in SQLite (`meta_snapshots.payload`) and served by `/api/v1/meta`. It is not a raw Blizzard API response. Buddy can generate a real EU Mythic+ aggregate in this format and drop it in as the same JSON.

Rules:

- No character or player names, battletags, or realm+character profile identifiers.
- `share` values are fractions from `0` to `1` (not 0–100). `0.42` is 42%.
- `count`, `characterCount`, `profileCount`, and `sampled.*` are non-negative numbers (sample sizes in this snapshot).
- `fetchedAt` in `freshness` is Unix time in **seconds** (UTC). Values `>= 1e12` are treated as milliseconds by the display helper; do not send milliseconds here.
- `region` is always `"eu"`. `focus` is always `"mythic-plus"`. `freshness.source` is always `"blizzard"`.
- `belowMinSample` must be `true` when `characterCount < 20` (`META_MIN_SAMPLE`), otherwise `false`. Grey the row in the UI; do not omit it.
- Talent `band`: `"core"` if `share >= 0.8`, `"flexible"` if `share >= 0.2`, otherwise `"rare"`.
- Gear `slot` uses Blizzard slot types (`HEAD`, `CHEST`, `TRINKET_1`, `FINGER_1`, …). Each `gearSlots[]` entry lists the top items for that slot (up to 5), each with pick-rate `share` and `count`.
- `trinkets`, `rings`, and `embellishments` are separate flat lists (same item object shape). Leave an array empty when the API has nothing; do not invent consumables (not in this schema).
- `season` and `period` may be `null` when unknown. `heroTree` on a loadout may be `null`.
- Extra JSON keys are ignored. Unknown required-field types fail the parser (returns `null`; a failed run must not replace a still-valid snapshot).

## Root object (`MetaSnapshotPayload`)

| Field | Type | Notes |
|---|---|---|
| `region` | `"eu"` | Fixed. |
| `focus` | `"mythic-plus"` | Fixed. |
| `season` | `{ id: number, name: string } \| null` | Current season from Game Data, or null. |
| `period` | `{ id: number } \| null` | Current Mythic+ period id, or null. |
| `freshness` | `MetaFreshness` | Displayed under the page heading. |
| `sampled` | object | How wide the capped sample was. |
| `sampled.realms` | number | Connected realms visited (cap: 8). |
| `sampled.leaderboards` | number | Leaderboard maps read (cap: 40). |
| `sampled.characters` | number | Distinct characters in the leaderboard sample. |
| `sampled.profiles` | number | Character profile fetches (specializations + equipment, cap: 40). |
| `classes` | `MetaClassSummary[]` | Only classes that appeared in the sample need be present. |

### `freshness` (`MetaFreshness`)

| Field | Type | Notes |
|---|---|---|
| `fetchedAt` | number | Unix **seconds** (UTC) when this snapshot was built. |
| `characters` | number | Characters represented in the snapshot (usually equals `sampled.characters`). |
| `keyLevels` | `{ min: number, max: number } \| null` | Key levels from leaderboards, not Raider.IO rating. |
| `region` | `"eu"` | Fixed. |
| `source` | `"blizzard"` | Fixed. |

## Per class (`MetaClassSummary`)

| Field | Type |
|---|---|
| `slug` | string (URL slug, e.g. `"mage"`) |
| `name` | string (e.g. `"Mage"`) |
| `characterCount` | number |
| `specs` | `MetaSpecSummary[]` |

## Per specialization (`MetaSpecSummary`)

| Field | Type | Notes |
|---|---|---|
| `slug` | string | e.g. `"fire"` |
| `name` | string | e.g. `"Fire"` |
| `characterCount` | number | Sample size for this spec. |
| `share` | number `0..1` | Share of the snapshot's characters. |
| `profileCount` | number | Profiles actually inspected for talents/gear. |
| `belowMinSample` | boolean | `true` when `characterCount < 20`. |
| `keyLevels` | `{ min, max, average: number } \| null` | From leaderboards for this spec. |
| `heroSplit` | `MetaHeroSplit[]` | Hero-tree popularity. |
| `loadouts` | `MetaLoadout[]` | Talent loadout codes, most popular first. |
| `talents` | `{ class, spec, hero: MetaTalentCount[] }` | Heatmap counters, not a visual talent calculator. |
| `stats` | `MetaStatBar[]` | Average ratings, highest first (UI uses `>>` / `>` / `≥`). |
| `gearSlots` | `MetaSlotGroup[]` | Two-column slot list in the UI; schema is a list of slots. |
| `trinkets` | `MetaGearCount[]` | Flat trinket list. |
| `rings` | `MetaGearCount[]` | Flat ring list. |
| `embellishments` | `MetaGearCount[]` | Only items flagged embellished; empty array is fine. |
| `enchants` | `MetaEnchantGem[]` | Aggregated enchant picks. |
| `gems` | `MetaEnchantGem[]` | Aggregated gem picks. |
| `races` | `MetaRaceCount[]` | Race popularity for this spec. |

### `heroSplit[]` (`MetaHeroSplit`)

`id: number`, `name: string`, `count: number`, `share: number (0..1)`.

### `loadouts[]` (`MetaLoadout`)

| Field | Type | Notes |
|---|---|---|
| `code` | string | `talent_loadout_code` (one copy button in the UI). |
| `count` | number | |
| `share` | number `0..1` | |
| `heroTree` | `{ id: number, name: string } \| null` | Active hero tree for that loadout. |

### `talents.class|spec|hero[]` (`MetaTalentCount`)

`id: number`, `name: string`, `count: number`, `share: number (0..1)`, `tree: "class" \| "spec" \| "hero"`, `band: "core" \| "flexible" \| "rare"`.

### `stats[]` (`MetaStatBar`)

`id: string` (e.g. `"CRIT_RATING"`), `name: string`, `average: number`.

### `gearSlots[]` (`MetaSlotGroup`)

`slot: string`, `items: MetaGearCount[]` (top 3–5 for that slot).

### Item object (`MetaGearCount`) — also used by `trinkets`, `rings`, `embellishments`

| Field | Type | Notes |
|---|---|---|
| `slot` | string | Blizzard slot type. |
| `itemId` | number | |
| `name` | string | Item name only, never a player. |
| `count` | number | |
| `share` | number `0..1` | Pick rate. |
| `quality` | string \| null | e.g. `"EPIC"`, `"RARE"`. |
| `setName` | string \| null | Set badge when present. |
| `crafted` | boolean | |
| `embellished` | boolean | |
| `enchant` | `{ id: number, name: string } \| null` | Enchant on this row. |
| `gems` | `{ id: number, name: string }[]` | Gems on this row; empty array when none. |

### `enchants[]` / `gems[]` (`MetaEnchantGem`) and `races[]` (`MetaRaceCount`)

`id: number`, `name: string`, `count: number`, `share: number (0..1)`.

## Example

See `tests/fixtures/blizzard-meta/snapshot.json` (Mage Fire fully filled, Frost and Warrior Protection below the minimum sample). The live site must not serve this fixture; pages stay on "No data yet." until a real snapshot is written to `meta_snapshots`.
