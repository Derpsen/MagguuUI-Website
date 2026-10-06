import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { diffLines, stringStats } from '../../utils/stringDiff.ts'

describe('stringDiff', () => {
  it('reports equal lines unchanged', () => {
    const lines = diffLines('a\nb', 'a\nb')
    assert.equal(lines.length, 2)
    assert.ok(lines.every(l => l.op === 'equal'))
  })

  it('marks additions and removals', () => {
    const lines = diffLines('one\ntwo', 'one\nthree')
    const ops = lines.map(l => l.op)
    assert.deepEqual(ops, ['equal', 'remove', 'add'])
  })

  it('handles empty → content as pure adds', () => {
    const lines = diffLines('', 'hello')
    assert.equal(lines.length, 1)
    assert.equal(lines[0]?.op, 'add')
  })

  it('stringStats counts chars and lines', () => {
    const s = stringStats('a\nb\nc')
    assert.equal(s.chars, 5)
    assert.equal(s.lines, 3)
  })
})
