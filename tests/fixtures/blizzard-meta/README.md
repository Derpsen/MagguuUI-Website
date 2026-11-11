Aggregated Meta snapshot fixture (`snapshot.json`) and, in a later PR, raw Blizzard HTTP fixtures for the nightly client.

Schema and field types: `docs/meta-snapshot.md` and `utils/metaTypes.ts`.
Parse with `parseMetaSnapshotPayload` from `utils/metaSnapshot.ts`.
Do not serve this fixture on live pages.
