import { sqlite } from '~/server/database'
import { readCurrentMetaSnapshot } from '~/server/utils/blizzardMetaStore'
import { findMetaClass } from '~/utils/metaCatalog'
import { META_COPY } from '~/utils/metaCopy'

export default defineEventHandler((event) => {
  const classSlug = getRouterParam(event, 'classSlug') || ''
  const catalog = findMetaClass(classSlug)
  if (!catalog) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  const snapshot = readCurrentMetaSnapshot(sqlite)
  const cls = snapshot?.payload.classes.find(item => item.slug === catalog.slug) ?? null
  return {
    data: {
      class: { slug: catalog.slug, name: catalog.name, specs: catalog.specs },
      snapshot: cls,
      fetchedAt: snapshot?.fetchedAt ?? null,
      freshness: snapshot?.payload.freshness ?? null,
    },
    empty: !cls,
    copy: { empty: META_COPY.noClassData, attribution: META_COPY.attribution },
  }
})
