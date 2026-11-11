import { sqlite } from '~/server/database'
import { readCurrentMetaSnapshot } from '~/server/utils/blizzardMetaStore'
import { META_CLASSES } from '~/utils/metaCatalog'
import { META_COPY } from '~/utils/metaCopy'

export default defineEventHandler(() => {
  const snapshot = readCurrentMetaSnapshot(sqlite)
  return {
    data: snapshot
      ? {
          fetchedAt: snapshot.fetchedAt,
          expiresAt: snapshot.expiresAt,
          season: snapshot.payload.season,
          periods: snapshot.payload.periods,
          talentTree: snapshot.payload.talentTree,
          basis: snapshot.payload.basis,
          sampled: snapshot.payload.sampled,
          freshness: snapshot.payload.freshness,
          classes: snapshot.payload.classes,
        }
      : null,
    catalog: META_CLASSES.map(entry => ({ slug: entry.slug, name: entry.name, specs: entry.specs })),
    empty: !snapshot,
    copy: { empty: META_COPY.empty, attribution: META_COPY.attribution },
  }
})
