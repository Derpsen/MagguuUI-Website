import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { copyTextToClipboard } from '../../utils/clipboard'

function fakeDocument(execResult: boolean | 'throw') {
  const calls: string[] = []
  const body = {
    appended: [] as unknown[],
    appendChild(el: unknown) { this.appended.push(el); return el },
    removeChild(el: unknown) { this.appended = this.appended.filter(x => x !== el); return el },
  }
  const doc = {
    body,
    activeElement: { focus() { calls.push('restore-focus') } },
    createElement() {
      const el = {
        value: '',
        style: {} as Record<string, string>,
        attrs: {} as Record<string, string>,
        setAttribute(k: string, v: string) { this.attrs[k] = v },
        focus() { calls.push('focus') },
        select() { calls.push('select') },
        setSelectionRange() { calls.push('range') },
      }
      return el
    },
    execCommand(cmd: string) {
      calls.push(`exec:${cmd}`)
      if (execResult === 'throw') throw new Error('blocked')
      return execResult
    },
  }
  return { doc: doc as unknown as Document, calls, body }
}

describe('copyTextToClipboard', () => {
  it('uses the async Clipboard API when it works', async () => {
    let written = ''
    const ok = await copyTextToClipboard('abc', {
      navigator: { clipboard: { writeText: async (t: string) => { written = t } } },
      document: fakeDocument(false).doc,
    })
    assert.equal(ok, true)
    assert.equal(written, 'abc')
  })

  it('falls back to execCommand when the API rejects, and cleans up', async () => {
    const { doc, calls, body } = fakeDocument(true)
    const ok = await copyTextToClipboard('abc', {
      navigator: { clipboard: { writeText: async () => { throw new Error('denied') } } },
      document: doc,
    })
    assert.equal(ok, true)
    assert.ok(calls.includes('exec:copy'))
    assert.equal(body.appended.length, 0)
    assert.ok(calls.includes('restore-focus'))
  })

  it('falls back when the Clipboard API is missing (insecure context)', async () => {
    const { doc, calls } = fakeDocument(true)
    assert.equal(await copyTextToClipboard('abc', { navigator: {}, document: doc }), true)
    assert.ok(calls.includes('exec:copy'))
  })

  it('reports failure honestly when both paths fail', async () => {
    const failing = fakeDocument(false)
    assert.equal(await copyTextToClipboard('abc', { navigator: {}, document: failing.doc }), false)
    const throwing = fakeDocument('throw')
    assert.equal(await copyTextToClipboard('abc', { navigator: {}, document: throwing.doc }), false)
    assert.equal(throwing.body.appended.length, 0)
    assert.equal(await copyTextToClipboard('abc', { navigator: {}, document: {} as Document }), false)
  })
})
