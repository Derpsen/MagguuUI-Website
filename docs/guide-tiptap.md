# TipTap on `/guide` (audit B)

Guest visits of `/guide` must not download TipTap/ProseMirror (~105 KB
compressed). The public page previously referenced `LazyTipTapEditor`, so the
client manifest still emitted `<link rel="prefetch">` for that chunk.

- The editor is loaded only after an admin clicks **Edit Page**, via
  `import('~/components/TipTapEditor.vue')` in `startEdit()`. There is no
  `Lazy*` component in the public tree.
- The `build:manifest` hook (`applyAdminManifestPolicy` in
  `utils/adminManifest.ts`) marks TipTap / ProseMirror / admin chunks as not
  prefetch/preload. Vite 8 / Rolldown keys a chunk like `_D5hSvx60.js` with
  `name: 'TipTapEditor'` and no `src`; `isAdminKey` therefore also checks
  `chunk.name` and CSS names. Matching keys are stripped from other chunks'
  `dynamicImports` so a late `import()` on `/guide` cannot reintroduce a
  prefetch link.
- `startEdit()` shows a loading state, toasts on failure, and clears the
  cached import promise so the admin can retry.
- After a production build, `scripts/verify-build.mjs` inspects the `.output`
  client manifest and `/guide` HTML so the TipTap chunk is not prefetched.
- `/admin/content/*` is unchanged and can keep using `TipTapEditor` as before.

Guards: `tests/unit/guideTipTap.test.ts` and the verify-build TipTap check.
