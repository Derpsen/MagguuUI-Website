# MagguuUI store descriptions — summary

Drafts live in `/workspace/magguuui-store-descriptions/`. No git tags. No push.

## Gaps vs live text

- **CurseForge + Wago (live):** Correctly say EllesmereUI / `/mui`. Update **one folder** to the **four sibling** MagguuUI group. **Included** QoL line stops at co-tank, stealth, death-release — **omits Smart Tab, Quick Focus, Audio device switcher**. Fixed-tooltip wording was soft (“tooltip stays put”).
- **WoWInterface (live):** Fuller page, same QoL gap — Death Release / Co-Tank / Stealth / Spell Alerts only; **no Smart Tab, Quick Focus, Audio switcher**.
- **Website `defaultContent.ts` (seed on box):** Feature 3 already lists Smart Tab / Quick Focus / Audio. Hero + cards here are a polish pass (clearer Setup/tools wording, explicit scale/tooltip on card 2). Website seed is aligned (EllesmereUI 9.0.6+, four siblings, Magguu Settings, DualRow NAMES & COLORS, Itemlevel 2P/4P). Remaining ElvUI strings are historical FAQ plus init.ts DB-repair markers.
- **All drafts:** Keep MagguuUI as a **module inside EllesmereUI** (not ElvUI). Require EllesmereUI **9.0.6+**. Four sibling folders: `MagguuUI`, `MagguuUI_Data` ([Data]), `MagguuUI_EUI` ([EUI]), `MagguuUI_Media` ([Media]) — keep all four enabled. Ready for **12.1**, still loads **12.0**.

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
