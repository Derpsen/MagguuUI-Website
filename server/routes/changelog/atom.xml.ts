/** GET /changelog/atom.xml: Atom 1.0 feed of released MagguuUI versions. */
export default defineEventHandler(event => serveChangelogFeed(event, 'atom'))
