import assert from 'node:assert/strict'
import { test } from 'node:test'
import { errorMessage } from '../../utils/errors'

test('errorMessage prefers the API error over the fetch status line', () => {
  const err = new Error('[POST] "/api/v1/admin/version-check": 502')
  Object.assign(err, {
    data: {
      error: true,
      statusCode: 502,
      message: '[GET] "https://api.github.com/repos/Derpsen/MagguuUI/releases/latest": 404',
      data: {
        success: false,
        error: { code: 'GITHUB_ERROR', message: 'No published release for Derpsen/MagguuUI, or the token cannot read releases.' },
      },
    },
  })

  assert.equal(
    errorMessage(err, 'Version check failed'),
    'No published release for Derpsen/MagguuUI, or the token cannot read releases.',
  )
})

test('errorMessage falls back when the body is only a fetch status line', () => {
  const err = new Error('[POST] "/api/v1/admin/version-check": 502')
  assert.equal(errorMessage(err, 'Version check failed'), 'Version check failed')
})
