# Profile preview images

The page `/profiles` ("Profile previews") lists every supported addon that MagguuUI ships a
profile for, using live data (visible addons + visible profiles). Each entry has one image slot.
Until a real screenshot exists the slot shows a neutral placeholder, "Preview image to be added".
No fake screenshots are ever generated.

## How an image is picked up

1. Save the file as `public/previews/<slug>.<ext>` (create the folder if it does not exist).
2. Commit and push. CI builds the image; after the next deploy the page uses the file.
   (On `npm run dev` it appears immediately.)
3. Nothing else to configure. The server lists `public/previews/` at runtime (cached 10 s) and the
   page falls back to the placeholder for every slug without a file.

Rules:

- `<slug>` is the addon slug (list below), lower-case, exactly as written.
- Extensions: `webp` (preferred), `avif`, `png`, `jpg`, `jpeg`. If several exist for one slug the
  first in that order wins.
- Recommended size: **1600 × 1000 px (16:10)**, in-game screenshot at 4K scaled down. The page shows
  every image in a fixed 16:10 frame (`object-fit: cover`), so other aspect ratios are cropped, never
  stretched, and the layout never shifts (width/height are set, images below the fold are lazy).
- Keep each file under about 250 KB (webp quality 80 is plenty).
- Show the addon with the MagguuUI profile applied. Do not include character names, guild names or
  other players' names.
- Only the files in the table are looked up. Extra files are ignored.

## Images needed (12)

| File (`public/previews/…`)     | Addon                   | Suggested shot                                   |
| ------------------------------ | ----------------------- | ------------------------------------------------ |
| `ellesmereui.webp`             | EllesmereUI (required)  | Full HUD in a dungeon or raid, profile applied   |
| `bigwigs.webp`                 | BigWigs                 | Boss timer bars and messages during a pull       |
| `northern-sky-raid-tools.webp` | Northern Sky Raid Tools | Raid note / assignment panel in a raid           |
| `exboss.webp`                  | EXBoss                  | Boss alert frame during an encounter             |
| `whisper-messenger.webp`       | Whisper Messenger       | A whisper window next to the chat                |
| `waypointui.webp`              | Waypoint UI             | A waypoint marker on the world map or in the UI  |
| `handynotes.webp`              | HandyNotes              | World map with note pins                         |
| `talent-tree-tweaks.webp`      | Talent Tree Tweaks      | The talent frame with the tweaks visible         |
| `gtfo.webp`                    | GTFO                    | Options panel (or an alert on screen)            |
| `bugsack.webp`                 | BugSack                 | The error list frame                             |
| `premade-groups-filter.webp`   | Premade Groups Filter   | Group Finder with the filter panel open          |
| `smart-reminders.webp`         | Smart Reminders         | A reminder on screen during gameplay             |

The list is derived from `PROFILE_KEY_BY_SLUG` in `utils/addonChipMeta.ts`. When a new addon gets a
profile there, add its slug here (a unit test fails until it is listed).

Check what the server currently sees: `GET /api/v1/profile-previews` (`image` is `null` for slots
that still show the placeholder; `meta.withImage` counts the filled ones).
