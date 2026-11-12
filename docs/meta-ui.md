# /meta UI (PR C + C2)

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
layout). Talent and gear names use our own accessible tooltips (hover, focus, Escape), not Wowhead scripts or Wowhead links.

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

## C2 (tooltips and budget)

- Own accessible tooltips on talent and gear names (DoD 3.08): hover, focus,
  Escape to dismiss. Plain site style, no third-party scripts, no Wowhead
  links or tooltip widgets.
- Lighthouse budgets for `/meta` and `/meta/mage/fire` follow DoD 6.01 and are
  a hard CI gate (other pages in the same workflow stay advisory). The numbers
  and the CLS fix are recorded in `docs/meta-lighthouse-baseline.md`. CI seeds
  the fixture with `scripts/seed-meta-fixture.ts` (and `NUXT_ALLOW_META_FIXTURE_SEED=true`) before the production
  Lighthouse server starts; the script refuses to run in production outside
  CI and must never be used on Unraid. The spec page SSR-renders the heatmap,
  gear and tooltips, then hydrates that below-fold block only when it is
  visible (`LazyMetaSpecBelowFold` + `hydrate-on-visible`) so it stays off the
  mobile TBT path.
- `/meta` is in the Retail header, footer and sitemap (the index only, not
  every class or spec page) after that budget went green in CI.

## Not in this PR

- AdSense / TCF / `AdBanner` migration, including Google CSP entries in
  `server/utils/htmlCsp.ts` (PR D, DoD 11.02)
- Header/footer 10–11px labels (audit)
- Deleting `MetaLoadoutCopy`, `MetaGearRow`, `MetaPopularityBars`,
  `MetaShareBar` — those unused prototype components are not in this tree
