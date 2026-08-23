# MagguuUI store descriptions — summary

Drafts live in `/workspace/magguuui-store-descriptions/`. No git tags. No push.

## Gaps vs live text

- **CurseForge + Wago (live):** Correctly say EllesmereUI / `/mui` / one folder. **Included** QoL line stops at co-tank, stealth, death-release — **omits Smart Tab, Quick Focus, Audio device switcher**. Fixed-tooltip wording was soft (“tooltip stays put”).
- **WoWInterface (live):** Fuller page, same QoL gap — Death Release / Co-Tank / Stealth / Spell Alerts only; **no Smart Tab, Quick Focus, Audio switcher**.
- **Website `defaultContent.ts` (seed on box):** Feature 3 already lists Smart Tab / Quick Focus / Audio. Hero + cards here are a polish pass (clearer Setup/tools wording, explicit scale/tooltip on card 2). Live marketing site may still show older ElvUI copy in places — replace with these EN (and optional DE) strings.
- **All drafts:** Keep MagguuUI as a **module inside EllesmereUI** (not ElvUI). Require EllesmereUI **7.9.5+**. One folder `MagguuUI`. Ready for **12.1**, still loads **12.0**.

## Paste instructions

1. **CurseForge** — Project → Description. Paste markdown from `curseforge-wago-en.md` (HTML header block + markdown body as live already uses). Summary/tagline can stay: `A native 4K overhaul for EllesmereUI.`
2. **Wago** — Addon → About / description. Same file `curseforge-wago-en.md`. Slug/id `5NR84pK3`.
3. **WoWInterface** — Edit file `info27061` → Description field. Paste `wowinterface-en.md` (markdown or convert to WoWI HTML if the editor strips MD).
4. **Website** — Admin `/home` content **or** seed `defaultContent.ts` (`DEFAULT_HOME_CONTENT`):
   - EN keys from `website-home-en.md` (hero + three feature cards)
   - DE keys from `website-home-de.md` if locale `de` is enabled
5. Do **not** create git tags or push from this draft folder.

## QoL checklist (must appear everywhere)

- [x] Smart Tab  
- [x] Quick Focus  
- [x] Audio device switcher (Ellesmere speaker)  

Also listed: Death Release, Co-Tank, Stealth/Stance, Spell Alerts.
