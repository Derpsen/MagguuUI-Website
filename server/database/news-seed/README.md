# News seed fixtures

Buddy-authored articles (YAML frontmatter + Markdown body). Boot inserts a
slug at most once: it never overwrites an admin edit, and a slug recorded in
`news_seed_markers` (including after an admin delete) never comes back.

`pouch-of-violet-dust-launch-celebration` is always seeded unpublished because
the Twitch drop it describes ends 2026-11-13 01:30 Europe/Berlin. Publish it
from the admin only if you still want it public after that cutoff.
