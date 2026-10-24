/** GET /changelog/feed.xml: RSS 2.0 feed of released MagguuUI versions. */
export default defineEventHandler(event => serveChangelogFeed(event, 'rss'))
