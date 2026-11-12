/**
 * GET /api/v1/news/:slug
 *
 * One published news article. Unpublished or unknown slugs are 404.
 */

import { getPublishedNewsBySlug } from '~/server/utils/newsStore'
import { isNewsSlug } from '~/utils/news'

export default defineEventHandler((event) => {
  const slug = String(getRouterParam(event, 'slug') || '')
  if (!isNewsSlug(slug)) {
    throw createError({ statusCode: 404, message: 'Not found' })
  }
  const article = getPublishedNewsBySlug(slug)
  if (!article) throw createError({ statusCode: 404, message: 'Not found' })
  return apiSuccess(article)
})
