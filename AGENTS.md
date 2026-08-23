# AGENTS.md

## Project Context

MagguuUI-Website is the Nuxt public site + admin + API for MagguuUI import
strings. Live: `https://ui.magguu.xyz`. Production runs as Unraid container
**MagguuUI** from image `ghcr.io/derpsen/magguuui-website` (LAN origin
`http://192.168.178.21:3000` on `br0`). Depth: `CLAUDE.md`. Ops notes: `MEMORY.md`.

## Safe Working Rules

- Read `CLAUDE.md` and the touched module before changing behavior.
- Do not commit `.env`, `data/*.db*`, `uploads/`, or build output.
- Do not build directly on Unraid; CI publishes GHCR, Unraid pulls/updates.
- Transient HTTP 500 right after a container update can occur while the new
  process binds — recheck before treating it as a lasting regression.
- `error.vue` Home must navigate to `/`, never `/home` (clearError redirect
  can strand SPA/admin clients on a 404 `/home`).
- CodeQL: `github/codeql-action/init` and `analyze` must use the **same**
  commit pin in `.github/workflows/codeql.yml`.

## Git / publish (Buddy hub)

- Interactive/ad-hoc sessions: do not commit, push, or create git tags unless
  the user explicitly asks for that exact publish step.
- Grok Bot helpers under Buddy's hub standing order: for clear in-scope
  bug/tasks, may commit, push, and merge to main without a per-change ask;
  never force-push; never publish unrelated dirty WIP; report results to Buddy.
- Tags and releases still need an explicit release ask.

## Grok Bot / Buddy

Marco uses Grok Bot "Buddy" as the single front door. Helpers report back to
Buddy.