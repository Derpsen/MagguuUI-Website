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

Master switch: `NUXT_ADS`. Default **off** = **no markup**. Recognised
on-values: `on`, `true`, `1`, `yes`. Empty or missing `NUXT_ADS` is off.
The flag is resolved at process start (`plugins/nuxt-ads.ts` via `useState`)
and never written onto `runtimeConfig` (that object is frozen in production).
A container env change is picked up without a rebuild. `NUXT_PUBLIC_ADS` is
used only when `NUXT_ADS` is unset. The slot does not
receive spec or class data, is not placed inside the best-build block, and
is not immediately under it (no 32px gap under the card). The sidebar slot is visible from the `xl` breakpoint (1280px) and sits at least 150px from the talent-copy control.
Inline
`after-build` sits after Stats, before Gear; `between-sections` sits after
the heatmap; `sidebar` stays in the aside. This PR does not load AdSense;
the existing `AdBanner` stays for the later ads PR D.

Low-sample rows in the popularity table use an inset rail
(`useMetaTone.lowRow`) instead of `opacity-60` or a background wash,
so class-colored text stays contrast-safe in dark and light.

## Typecheck

`npm run typecheck` is still `tsc` (Vue SFCs are not checked). New `/meta`
Vue files are kept green under `vue-tsc --noEmit`. The existing repo-wide
vue-tsc error set is a separate audit PR.

## Not in this PR

- AdSense / TCF / `AdBanner` migration (PR D, DoD 11.02)
- Header/footer 10–11px labels (audit)
- Lighthouse budget, own tooltips, and putting `/meta` in the header, footer
  and sitemap (stacked PR C2, DoD 6.01 / 14.07 / 3.08). `/meta` stays off
  nav/sitemap until C2 *and* that budget are green. The fixture snapshot is
  the measurement baseline until a live one exists.
- Deleting `MetaLoadoutCopy`, `MetaGearRow`, `MetaPopularityBars`,
  `MetaShareBar` — those unused prototype components are not in this tree
