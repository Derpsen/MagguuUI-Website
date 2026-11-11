# Audit small fixes (G, C, D)

From `/workspace/web-audit/report.md` and the website-queue audit list.

## G — Forever e2e is version-independent

`tests/forever.spec.ts` asserts the release line with `/v\d+\.\d+\.\d+/` instead of a
pinned `v12.1.9`, so a package bump does not fail the spec until the page copy is
updated on purpose.

## C — `/strings` cache like `/guide` / `/changelog`

`/strings` is in `CDN_CACHEABLE_PATHS`. The bare URL sends the same browser
`Cache-Control` and `CDN-Cache-Control` as the other marketing pages. There is
**no** page-level `swr` (the page takes `?class=` / `?spec=` / `?pack=`; Nitro
would cache every variant). Query URLs are still not edge-cached.

A Cloudflare Cache Rule that respects origin `CDN-Cache-Control` is still required
for an actual edge HIT; that setting is not an app PR.

## D — Heading order on Guide and Changelog

- Guide steps use `h2.guide-step-title` after the page `h1`.
- Changelog has a page `h1` (“Changelog”). Version numbers, including the current
  release, are `h2` (the current one keeps the larger type). The “Release notes”
  eyebrow is a `p`. Markdown under a version may start at `h3`.
