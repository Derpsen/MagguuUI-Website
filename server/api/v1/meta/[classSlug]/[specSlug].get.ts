import { sqlite } from '~/server/database'
import { readMetaSnapshotState } from '~/server/utils/blizzardMetaStore'
import { assertMetaApiRateLimit } from '~/server/utils/metaRateLimit'
import { findMetaSpec } from '~/utils/metaCatalog'
import { META_COPY } from '~/utils/metaCopy'

export default defineEventHandler((event) => {
  assertMetaApiRateLimit(event)
  const classSlug = getRouterParam(event, 'classSlug') || ''
  const specSlug = getRouterParam(event, 'specSlug') || ''
  const found = findMetaSpec(classSlug, specSlug)
  if (!found) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  const state = readMetaSnapshotState(sqlite)
  const snapshot = state.status === 'ok' ? state.snapshot : null
  const cls = snapshot?.payload.classes.find(item => item.slug === found.classEntry.slug)
  const spec = cls?.specs.find(item => item.slug === found.spec.slug) ?? null
  return {
    data: {
      class: { slug: found.classEntry.slug, label: found.classEntry.name },
      spec: { slug: found.spec.slug, label: found.spec.name },
      snapshot: spec,
      fetchedAt: snapshot?.fetchedAt ?? null,
      freshness: snapshot?.payload.freshness ?? null,
    },
    empty: state.status === 'empty' || (state.status === 'ok' && !spec),
    unavailable: state.status === 'unavailable',
    copy: { empty: META_COPY.noSpecData, unavailable: META_COPY.unavailable, attribution: META_COPY.attribution },
  }
})
