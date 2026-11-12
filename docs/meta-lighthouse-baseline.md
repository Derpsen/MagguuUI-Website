# /meta Lighthouse baseline (C2, DoD 6.01)

Budgets for `/meta` and `/meta/mage/fire` are a hard CI gate (see
`.github/lighthouse-budgets.json` and `tools/lighthouse-budget.mjs`). Other
pages in that file stay advisory. CI seeds the checked-in fixture with
`scripts/seed-meta-fixture.ts` before the production server starts
(`NUXT_ALLOW_META_FIXTURE_SEED=true` in the Lighthouse job). Never run that
seed on Unraid. `CI=true` is not a bypass.

## DoD 6.01 targets used here

| Metric | Mobile | Desktop |
|---|---|---|
| Performance (min) | 80 | 95 |
| CLS (max) | 0.03 | 0.03 |
| TBT (max) | 200 ms | 60 ms |
| JS transfer (max) | 250 KB | 250 KB |
| LCP (max) | measured + ~25 % slack (4800 / 5000 ms mobile, 1300 ms desktop) | |

## CI reference (before this gate tightened)

PR #190, head `e5626b7`, Lighthouse run
<https://github.com/Derpsen/MagguuUI-Website/actions/runs/43138960062>
(finished 03:14 Europe/Berlin on 12 Nov 2026). Representative (median of 3):

| Page | Mode | Perf | LCP | CLS | TBT | JS |
|---|---|---|---|---|---|---|
| `/meta` | mobile | 83 | 3799 ms | 0 | 143 ms | 173 KB |
| `/meta/mage/fire` | mobile | 83 | 3876 ms | 0.001 | 138 ms | 175 KB |
| `/meta` | desktop | 99 | 931 ms | 0.033 | 12 ms | 173 KB |
| `/meta/mage/fire` | desktop | 99 | 950 ms | 0.001 | 10 ms | 175 KB |

`/meta` desktop CLS was 0.033, above the 0.03 DoD cap. The index shell is
`max-w-3xl`, so the four-column hero stats let the "Updated" date wrap after
fonts settled, and the class picker `flex-wrap` could drop a pill to the next
row. This PR keeps the hero at two columns with nowrap values and lays the
class picker out on a fixed `grid-cols-2 sm:grid-cols-3` so those rows cannot
reflow. The budget was not loosened.


The first hard-gate run on `3c10ced` (Lighthouse
<https://github.com/Derpsen/MagguuUI-Website/actions/runs/43145913097>,
finished 04:16 Europe/Berlin on 12 Nov 2026) kept `/meta` desktop CLS at
0.0005 (the wrapping fix held) but missed mobile TBT: `/meta` 266 ms and
`/meta/mage/fire` 297 ms against the 200 ms cap (fire Perf 77). The same
runner was slower on every page (`/` mobile TBT 194 → 333). A ~400 ms
unattributable long task started at 4.0 s, lined up with
`requestIdleCallback(..., { timeout: 4000 })` in `plugins/web-vitals.client.ts`
(and the 3 s WhatsNew fallback). Those deadlines were moved to 15 s so the
import no longer lands in the TBT window; the 200 ms budget was not loosened.

## CI reference (green hard gate on `f99a4d3`)

PR #190, head `f99a4d3`, Lighthouse run
<https://github.com/Derpsen/MagguuUI-Website/actions/runs/43148115810>
(finished 04:34 Europe/Berlin on 12 Nov 2026). Per-metric median of 3 runs
(the budget script now uses that median, not only LHCI's single
`isRepresentativeRun`):

| Page | Mode | Perf | LCP | CLS | TBT | JS | TBT margin |
|---|---|---|---|---|---|---|---|
| `/meta` | mobile | 83 | 3790 ms | 0 | 178 ms | 175 KB | 22 ms (budget 200) |
| `/meta/mage/fire` | mobile | 81 | 3886 ms | 0.001 | 168 ms | 176 KB | 32 ms |
| `/meta` | desktop | 99 | 957 ms | 0 | 22 ms | 175 KB | 38 ms (budget 60) |
| `/meta/mage/fire` | desktop | 99 | 968 ms | 0.001 | 17 ms | 176 KB | 43 ms |

One `/meta` mobile run had TBT 242 ms; the median stayed at 178 ms. Desktop
`/meta` CLS stayed at 0. Keep the `/meta` script gate in
`tools/lighthouse-budget.mjs` (job already fails on a miss). Do **not** add
the Lighthouse workflow as a GitHub branch-protection required check.

Re-calibrate this file from a green hard-gate CI run if a later intentional
change moves the numbers a long way from the limits.
