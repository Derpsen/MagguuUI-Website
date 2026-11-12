/**
 * GET /api/v1/news
 *
 * Published news articles, newest first. List items omit the Markdown body.
 */

import { listPublishedNews, toNewsListItem } from '~/server/utils/newsStore'

export default defineEventHandler(() => {
  const items = listPublishedNews().map(toNewsListItem)
  return apiSuccess(items, { count: items.length })
})
