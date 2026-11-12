/** GET /news/feed.xml: RSS 2.0 feed of published news articles. */
export default defineEventHandler(event => serveNewsFeed(event))
