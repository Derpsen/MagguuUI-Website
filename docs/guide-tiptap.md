# TipTap on `/guide` (audit B)

Guest visits of `/guide` must not download TipTap/ProseMirror (~105 KB
compressed). The public page previously referenced `LazyTipTapEditor`, so the
client manifest still emitted `<link rel="prefetch">` for that chunk.

- The editor is loaded only after an admin clicks **Edit Page**, via
  `import('~/components/TipTapEditor.vue')` in `startEdit()`. There is no
  `Lazy*` component in the public tree.
- The `build:manifest` hook still marks TipTap / ProseMirror / admin chunks
  (by key, `file`, or `src`) as not prefetch/preload, and strips those keys
  from other chunks' `dynamicImports` so a late `import()` on `/guide` cannot
  reintroduce a prefetch link.
- `/admin/content/*` is unchanged and can keep using `TipTapEditor` as before.

Guard: `tests/unit/guideTipTap.test.ts`.
