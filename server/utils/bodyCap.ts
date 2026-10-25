/**
 * Request body reading with a hard byte cap (pure: only the Node request stream, unit tested).
 *
 * Content-Length is only a hint a client can leave out (chunked) or lie about, so public endpoints
 * must stop reading once the cap is passed instead of buffering whatever arrives first.
 */
import type { H3Event } from 'h3'

export type CappedBody = { ok: true, text: string } | { ok: false, reason: 'too_large' | 'unreadable' }

/**
 * Reads at most `maxBytes` of the request body as UTF-8. When the cap is passed, reading stops at
 * once (at most one extra chunk is held) and the rest is left unread; Node discards it when the
 * response ends. An empty body is `{ ok: true, text: '' }`.
 */
export function readBodyCapped(event: H3Event, maxBytes: number): Promise<CappedBody> {
  const req = event.node.req
  const declared = Number(req.headers['content-length'] || 0)
  if (Number.isFinite(declared) && declared > maxBytes) return Promise.resolve({ ok: false, reason: 'too_large' })
  if (req.readableEnded) return Promise.resolve({ ok: true, text: '' })

  return new Promise((resolve) => {
    const chunks: Buffer[] = []
    let size = 0
    let settled = false
    const finish = (result: CappedBody) => {
      if (settled) return
      settled = true
      req.off('data', onData)
      req.off('end', onEnd)
      req.off('error', onError)
      req.off('close', onClose)
      if (!result.ok) req.pause()
      resolve(result)
    }
    const onData = (chunk: Buffer | string) => {
      const buf = typeof chunk === 'string' ? Buffer.from(chunk) : chunk
      size += buf.length
      if (size > maxBytes) return finish({ ok: false, reason: 'too_large' })
      chunks.push(buf)
    }
    const onEnd = () => finish({ ok: true, text: Buffer.concat(chunks).toString('utf8') })
    const onError = () => finish({ ok: false, reason: 'unreadable' })
    const onClose = () => finish(req.readableEnded ? { ok: true, text: Buffer.concat(chunks).toString('utf8') } : { ok: false, reason: 'unreadable' })
    req.on('data', onData)
    req.on('end', onEnd)
    req.on('error', onError)
    req.on('close', onClose)
  })
}
