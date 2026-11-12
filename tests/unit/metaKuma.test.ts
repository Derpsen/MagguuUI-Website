import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { buildMetaKumaPushUrl, kumaStatusForMetaRun, pushMetaKuma } from '../../server/utils/metaKuma'
import { purgeCloudflareMeta } from '../../server/utils/cloudflarePurge'

describe('Kuma push and Cloudflare /meta purge', () => {
  it('does not log or require a URL, and treats error/partial as down', async () => {
    assert.equal(kumaStatusForMetaRun('ok'), 'up')
    assert.equal(kumaStatusForMetaRun('skipped'), 'up')
    assert.equal(kumaStatusForMetaRun('partial'), 'down')
    assert.equal(kumaStatusForMetaRun('error'), 'down')
    const url = buildMetaKumaPushUrl('https://kuma.example/api/push/secret-token', 'up', 'ok')
    assert.match(url, /status=up/)
    assert.equal(await pushMetaKuma('', 'up', 'ok'), 'skipped')
    const calls: string[] = []
    await pushMetaKuma('https://kuma.example/api/push/secret-token', 'down', 'gate failed', async (href) => {
      calls.push(href)
      return { ok: true, status: 200 }
    })
    assert.equal(calls.length, 1)
    assert.match(calls[0]!, /status=down/)
  })

  it('purges only /meta prefixes and no-ops without credentials', async () => {
    assert.equal(await purgeCloudflareMeta({}), 'skipped')
    let body = ''
    const result = await purgeCloudflareMeta(
      { CLOUDFLARE_ZONE_ID: 'zone', CLOUDFLARE_API_TOKEN: 'token' },
      async (_url, init) => {
        body = init.body
        return { ok: true, status: 200, text: async () => '' }
      },
    )
    assert.equal(result, 'purged')
    assert.match(body, /ui\.magguu\.xyz\/meta/)
    assert.doesNotMatch(body, /purge_everything/)
  })
})
