import assert from 'node:assert/strict'
import { test } from 'node:test'
import { stripHtml } from '../../utils/plainText'

test('strips simple and nested tags', () => {
  assert.equal(stripHtml(' <b>Step <i>one</i></b> '), 'Step one')
})
test('does not leave a script tag from split fragments', () => {
  assert.ok(!stripHtml('<scr<script>ipt>alert(1)</script>').includes('<script'))
})
test('keeps plain text characters', () => {
  assert.equal(stripHtml('A & B "q" it\'s'), 'A & B "q" it\'s')
  assert.equal(stripHtml(''), '')
})
