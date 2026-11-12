# Meta snapshot fixture schema

Canonical fixture in the repo: `tests/fixtures/blizzard-meta/snapshot.json`  
Types: `utils/metaTypes.ts`  
Parser: `utils/metaSnapshot.ts` (`parseMetaSnapshotPayload`)  
Storage: SQLite `meta_snapshots` (primary key `snapshot_id`) plus `meta_snapshot_active` (region → active `snapshot_id`)

This is the **aggregated** snapshot shape stored as `meta_snapshots.payload` and served by `/api/v1/meta`. It is not a raw Blizzard API response. Buddy can generate a real EU Mythic+ aggregate in this format and drop it in as the same JSON.

## Rollout (nav, sitemap, budget)

`/meta` is in the Retail header, footer, and sitemap (the index only, not every
class or spec page) after the C2 Lighthouse budget for `/meta` and
`/meta/mage/fire`, measured against this fixture, went green in CI. Seed the
fixture for Lighthouse with `npx tsx scripts/seed-meta-fixture.ts` — never on
Unraid. AdBanner / AdSense migration is a later ads PR (D), not C2.


## Hard rules

- **No player names, realm names, or character ids.** Reserved JSON keys (rejected by the parser, at any depth): `name`, `realm`, `character`, `playerName`, `characterName`, `characterId`, `battletag` (and snake_case / battleTag variants). Display strings use **`label`**, never `name`.
- `share` values are fractions from `0` to `1` (not 0–100). `0.42` is 42%.
- Counts (`count`, `n`, `profileCount`, `sampled.*`) are non-negative numbers.
- `fetchedAt` in `freshness` is Unix time in **seconds** (UTC). Do not send milliseconds.
- `region` is always `"eu"`. `focus` is always `"mythic-plus"`. `freshness.source` and `basis.source` are always `"blizzard"`.
- Sample thresholds (also in methodology copy):
  - `META_MIN_BUILD_SAMPLE` = **50** — best-build and headline figures.
  - `META_MIN_ITEM_SAMPLE` = **20** — slot items below this get `lowSample: true`.
  - `META_MIN_SHOW_SAMPLE` = **10** — below this the spec shows **Collecting data** and no figures.
  - After 30 days with no valid snapshot the page shows **Data unavailable**.
- Spec flags must match `n` or the parser returns null:
  - `empty` = `n === 0`
  - `collecting` = `0 < n < 10`
  - `lowSample` = `n < 50` (includes empty and collecting)
  - `bestBuild` is a loadout only when `n >= 50`; otherwise it must be `null`
- Loadout `code` values are counted only for the **current talent tree** (`treeHash` / snapshot `talentTree.hash`). Outdated trees are omitted.
- Periods: **current season**, **current period plus the two previous** (`periods.included`, current first).
- Extra JSON keys are ignored. Invalid types or flags fail the parser (returns `null`). A failed run must not replace a still-valid snapshot (the active pointer stays put).
- The live site must not serve this fixture; pages stay on "Collecting data." until a real snapshot is written and promoted.

## Storage (0.08)

- `meta_snapshots.snapshot_id` is the stable id.
- `meta_snapshot_active.region` points at the promoted snapshot. Readers join this pointer; they never see a half-written row.
- Promotion happens in one transaction after the payload is complete. Sanity gates that may refuse to promote belong to the nightly job (later PR). Failed or expired rows do not move the pointer; if the active row expires or is deleted (retention 30 days) the page is **Data unavailable**.

## Root object (`MetaSnapshotPayload`)

| Field | Type | Notes |
|---|---|---|
| `region` | `"eu"` | Fixed. |
| `focus` | `"mythic-plus"` | Fixed. |
| `season` | `{ id: number, label: string } \| null` | Current season, or null. |
| `periods` | `{ current: { id: number }, included: { id: number }[] } \| null` | Current + two previous; `current.id` must appear in `included`. |
| `talentTree` | `{ hash: string \| null, build: string \| null } \| null` | Current talent tree state used to filter loadout codes. |
| `freshness` | `MetaFreshness` | Displayed under the heading. |
| `basis` | `MetaDataBasis` | Data basis shown on the page (must agree with season, periods, freshness.players, sampled.profiles). |
| `sampled` | object | How wide the capped sample was. |
| `sampled.realms` | number | Connected realms visited. |
| `sampled.leaderboards` | number | Leaderboard maps read. |
| `sampled.players` | number | Distinct players in the counted population. |
| `sampled.profiles` | number | Profile fetches (specializations + equipment). |
| `sampled.skipped404` | number | Private/missing profiles skipped. |
| `sampled.specMismatch` | number | Profiles dropped because the active spec ≠ the leaderboard spec. |
| `sampled.unknownTalentNodes` | number | Talent picks whose node/id is not in the published static tree (kept, marked `unmapped`). |
| `classes` | `MetaClassSummary[]` | Classes that appeared in the sample. |

### `freshness`

| Field | Type | Notes |
|---|---|---|
| `fetchedAt` | number | Unix **seconds** (UTC) when this snapshot was built. |
| `players` | number | Usually equals `sampled.players`. |
| `keyLevels` | `{ min: number, max: number } \| null` | From leaderboards, not Raider.IO rating. |
| `region` | `"eu"` | Fixed. |
| `source` | `"blizzard"` | Fixed. |

### `basis` (shown on the page)

`region`, `focus`, `season`, `periods`, `talentTree`, `keyLevels`, `players`, `profiles`, `source: "blizzard"`.

## Per class (`MetaClassSummary`)

`slug` (e.g. `"mage"`, `"demon-hunter"`), `label` (e.g. `"Mage"`), `n` (sample size), `specs`.

## Per specialization (`MetaSpecSummary`)

| Field | Type | Notes |
|---|---|---|
| `slug` | string | e.g. `"fire"`, `"augmentation"`, `"devourer"` |
| `label` | string | e.g. `"Fire"` |
| `n` | number | Sample size for this spec. |
| `share` | number `0..1` | Share of the snapshot's players. |
| `profileCount` | number | Profiles inspected for talents/gear. |
| `empty` | boolean | `n === 0` |
| `collecting` | boolean | `0 < n < 10` |
| `lowSample` | boolean | `n < 50` |
| `bestBuild` | `MetaLoadout \| null` | Only when `n >= 50` |
| `keyLevels` | `{ min, max, average: number } \| null` | From the same counted population. |
| `heroSplit` | `MetaHeroSplit[]` | Hero-tree popularity. |
| `loadouts` | `MetaLoadout[]` | Current-tree talent codes, most popular first. |
| `talents` | `{ class, spec, hero: MetaTalentCount[] }` | Heatmap counters, not a visual calculator. |
| `stats` | `MetaStatBar[]` | Average ratings, highest first (`>>` / `>` / `≥` in the UI). |
| `gearSlots` | `MetaSlotGroup[]` | Slot list (UI may render two columns). |
| `trinkets` | `MetaGearCount[]` | Flat trinket list. |
| `rings` | `MetaGearCount[]` | Flat ring list. |
| `embellishments` | `MetaGearCount[]` | Only items flagged embellished; empty array is fine. |
| `enchants` | `MetaEnchantGem[]` | Aggregated enchant picks. |
| `gems` | `MetaEnchantGem[]` | Aggregated gem picks. |
| `races` | `MetaRaceCount[]` | Race popularity for this spec. |

### `heroSplit[]`

`id: number`, `label: string`, `count: number`, `share: number (0..1)`.

### `loadouts[]` / `bestBuild`

| Field | Type | Notes |
|---|---|---|
| `code` | string | `talent_loadout_code` (one copy button in the UI). |
| `count` | number | |
| `share` | number `0..1` | |
| `heroTree` | `{ id: number, label: string } \| null` | |
| `treeHash` | string \| null | Must match the snapshot's current tree, or the row is omitted. |

### `talents.class\|spec\|hero[]`

`id`, `label`, `count`, `share` (`0..1`), `tree: "class"\|"spec"\|"hero"`, `band: "core"\|"flexible"\|"rare"` (`core` ≥ 0.8, `flexible` ≥ 0.2, else `rare`).

### `stats[]`

`id` (e.g. `"CRIT_RATING"`), `label`, `average`.

### `gearSlots[]`

`slot` (Blizzard type: `HEAD`, `CHEST`, `TRINKET_1`, `FINGER_1`, …), `items` (top 3–5).

### Item object — also `trinkets`, `rings`, `embellishments`

| Field | Type | Notes |
|---|---|---|
| `slot` | string | Blizzard slot type. |
| `itemId` | number | |
| `label` | string | Item label only, never a player. |
| `count` | number | |
| `share` | number `0..1` | Pick rate. |
| `quality` | string \| null | e.g. `"EPIC"`. |
| `setName` | string \| null | Set badge when present. (`setName` is allowed; `name` is not.) |
| `crafted` | boolean | |
| `embellished` | boolean | |
| `ilvl` | number \| null | Item level. |
| `source` | string \| null | e.g. `"Dungeon"`, `"Raid"`, `"Crafted"`. |
| `lowSample` | boolean | `true` when `count < 20`. |
| `enchant` | `{ id: number, label: string } \| null` | |
| `gems` | `{ id: number, label: string }[]` | Empty array when none. |

### `enchants[]` / `gems[]` / `races[]`

`id`, `label`, `count`, `share` (`0..1`).

## Fixture coverage

`tests/fixtures/blizzard-meta/snapshot.json` includes:

- **Fire Mage** — `n >= 50`, full build, `bestBuild` set (normal case)
- **Frost Mage** — `n = 8`, `collecting: true`, no figures in the UI
- **Arcane Mage** — `n = 0`, `empty: true`
- **Augmentation Evoker** — normal case (`n >= 50`)
- **Devourer Demon Hunter** — `lowSample: true` (`10 ≤ n < 50`), no `bestBuild`
- **Protection Warrior** — `lowSample: true`

Season / period / tree hash values in the fixture are examples. Replace them with the live season, the current period plus the two previous, and the current talent-tree hash.


## Optional data-layer fields (nightly)

- Gear entries may include `icon` (filename, no host), `ilvl`, and `source` (`Dungeon`, `Raid`, `Crafted`, …).
- `talentsByHero` holds talent counts split by hero tree.
- `talentLayout` is the static class/spec/hero node layout for the heatmap, including empty `CHOICE` nodes.
- Talent rows may include `node`, `spellId`, `icon`, and `unmapped`.
