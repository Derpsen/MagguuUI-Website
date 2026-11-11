import { sqlite } from '~/server/database'
import { readMetaSnapshotState } from '~/server/utils/blizzardMetaStore'
import { assertMetaApiRateLimit } from '~/server/utils/metaRateLimit'
import { findMetaClass } from '~/utils/metaCatalog'
import { META_COPY } from '~/utils/metaCopy'

export default defineEventHandler((event) => {
  assertMetaApiRateLimit(event)
  const classSlug = getRouterParam(event, 'classSlug') || ''
  const catalog = findMetaClass(classSlug)
  if (!catalog) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  const state = readMetaSnapshotState(sqlite)
  const snapshot = state.status === 'ok' ? state.snapshot : null
  const cls = snapshot?.payload.classes.find(item => item.slug === catalog.slug) ?? null
  return {
    data: {
      class: {
        slug: catalog.slug,
        label: catalog.name,
        specs: catalog.specs.map(spec => ({ slug: spec.slug, label: spec.name })),
      },
      snapshot: cls,
      fetchedAt: snapshot?.fetchedAt ?? null,
      freshness: snapshot?.payload.freshness ?? null,
    },
    empty: state.status === 'empty' || (state.status === 'ok' && !cls),
    unavailable: state.status === 'unavailable',
    copy: { empty: META_COPY.noClassData, unavailable: META_COPY.unavailable, attribution: META_COPY.attribution },
  }
})
