import { sqlite } from '~/server/database'
import { readCurrentMetaSnapshot } from '~/server/utils/blizzardMetaStore'
import { findMetaSpec } from '~/utils/metaCatalog'
import { META_COPY } from '~/utils/metaCopy'

export default defineEventHandler((event) => {
  const classSlug = getRouterParam(event, 'classSlug') || ''
  const specSlug = getRouterParam(event, 'specSlug') || ''
  const found = findMetaSpec(classSlug, specSlug)
  if (!found) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  const snapshot = readCurrentMetaSnapshot(sqlite)
  const cls = snapshot?.payload.classes.find(item => item.slug === found.classEntry.slug)
  const spec = cls?.specs.find(item => item.slug === found.spec.slug) ?? null
  return {
    data: {
      class: { slug: found.classEntry.slug, name: found.classEntry.name },
      spec: { slug: found.spec.slug, name: found.spec.name },
      snapshot: spec,
      fetchedAt: snapshot?.fetchedAt ?? null,
      freshness: snapshot?.payload.freshness ?? null,
    },
    empty: !spec,
    copy: { empty: META_COPY.noSpecData, attribution: META_COPY.attribution },
  }
})
