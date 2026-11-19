# News seed fixtures

Buddy-authored articles (YAML frontmatter + Markdown body). These files are
the editorial source. `scripts/embed-news-seeds.mjs` embeds them into
`server/utils/newsSeedEmbedded.ts` before `nuxt build` (`prebuild`). Run
`npm run embed:news-seeds` after editing a fixture, and keep the generated
catalog committed. `postinstall` is only `nuxt prepare`, because the Docker
build runs `npm ci` before the rest of the source is copied.

Boot inserts a slug at most once: it never overwrites an admin edit, and a
slug recorded in `news_seed_markers` (including after an admin delete) never
comes back.

`pouch-of-violet-dust-launch-celebration` is always seeded unpublished because
the Twitch drop it describes ended 2026-11-13 01:30 Europe/Berlin. Publish it
from the admin only if you still want that historical note public.
