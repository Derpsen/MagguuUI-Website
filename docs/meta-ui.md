# /meta UI (PR C)

Public Mythic+ Meta pages: `/meta`, `/meta/<class>`, `/meta/<class>/<spec>`.
English copy, SSR, no third-party scripts on the page. Data comes from the
snapshot APIs shipped in PR A/B (`/api/v1/meta…`). Display strings use
`label`, never a reserved `name` key from the payload.

## Layout

Plain site style: thin borders and typography, no boxed cards or icon
tiles. Uppercase section labels are `text-xs` (12px). The global header
and footer label size is left to a later audit PR.

- Index: freshness, one CTA (“Choose your spec”), class picker (13 contrast-safe colour pills), role / by-spec-or-class filters as plain `?role=` / `?by=` links, popularity table, methodology, FAQ.
- Spec page: breadcrumb, freshness, sibling-spec pills, hero-tree toggle (`?hero=<id>`), sticky on-this-page nav, best build + copy, hero split, at-a-glance, three-tree talent heatmap, stat bars, gear slot list, enchants/gems, races, methodology.
- Collecting (`n < 10` or no snapshot): “Collecting data.” and no figures.
- Unavailable (expired snapshot): “Data unavailable.”
- Low sample (`n < 50`): figures stay visible with a badge; no best-build claim.

## Best build and copy

`MetaBuildCard` shows one loadout (hero tree + core) with a read-only code
field (works without JS) and a Copy button after mount when the Clipboard
API is present. Success is visible “Copied!” plus `role="status"` /
`aria-live="polite"`. Alternatives sit in a native `<details>`. Ads are
never placed inside this block.

The hero toggle filters loadouts and, when `talentsByHero` is present,
switches the heatmap to that hero tree’s talent counts.

## Heatmap and gear

Heatmap columns are Class | Hero | Spec, grouped core / flexible / rare.
Counts and percentages are always in text. Nodes with `unmapped: true`
get an “Unmapped choice” label (choice nodes not in the published static
layout). Wowhead links use `spellId` when present; there is no Wowhead
tooltip script.

Gear is a two-column slot list (not cards): icon, name, ilvl, source,
enchant/gems, pick rate, and a low-sample badge when `lowSample` is set.
Icons use `https://render.worldofwarcraft.com/icons/56/{file}.jpg` from
the stored filename.

Class colours are contrast-safe (`metaClassTextColor`). On dark
backgrounds a low-luminance official colour (Shaman `#0070dd`) is
lightened toward white, not greyed out.

## Ads

`AdSlot` is a network-neutral reserved box with a `placement` prop
(`after-build`, `sidebar`, `between-sections`, `index-inline`) and a
fixed height (100px inline, 250px sidebar) so consent cannot cause CLS.

Master switch: `NUXT_ADS` / `runtimeConfig.public.ads`. Default **off** =
**no markup**. Recognised on-values: `on`, `true`, `1`, `yes`. The slot
does not receive spec or class data and is not used in the best-build
area. This PR does not load AdSense; the existing `AdBanner` stays for
the later ads PR.

## Typecheck

`npm run typecheck` is still `tsc` (Vue SFCs are not checked). New `/meta`
Vue files are kept green under `vue-tsc --noEmit`. The existing repo-wide
vue-tsc error set is a separate audit PR.

## Not in this PR

- AdSense / TCF / `AdBanner` migration (PR D)
- Header/footer 10–11px labels (audit)
- Lighthouse budgets for `/meta` (calibrate after a live snapshot)
- Deleting `MetaLoadoutCopy`, `MetaGearRow`, `MetaPopularityBars`,
  `MetaShareBar` — those unused prototype components are not in this tree
