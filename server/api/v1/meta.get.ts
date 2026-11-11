import { sqlite } from '~/server/database'
import { readMetaSnapshotState } from '~/server/utils/blizzardMetaStore'
import { assertMetaApiRateLimit } from '~/server/utils/metaRateLimit'
import { META_CLASSES } from '~/utils/metaCatalog'
import { META_COPY } from '~/utils/metaCopy'

function catalogLabel() {
  return META_CLASSES.map(entry => ({
    slug: entry.slug,
    label: entry.name,
    specs: entry.specs.map(spec => ({ slug: spec.slug, label: spec.name })),
  }))
}

export default defineEventHandler((event) => {
  assertMetaApiRateLimit(event)
  const state = readMetaSnapshotState(sqlite)
  const snapshot = state.status === 'ok' ? state.snapshot : null
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
    catalog: catalogLabel(),
    empty: state.status === 'empty' || (state.status === 'ok' && !snapshot),
    unavailable: state.status === 'unavailable',
    copy: { empty: META_COPY.empty, unavailable: META_COPY.unavailable, attribution: META_COPY.attribution },
  }
})
