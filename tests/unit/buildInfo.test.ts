import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { formatBuildLabel, readBuildInfo } from '../../utils/buildInfo'

describe('admin live build info', () => {
  it('falls back to dev without build args', () => {
    assert.deepEqual(readBuildInfo({}), { gitSha: 'dev', shortSha: 'dev', buildTime: 'dev' })
    assert.equal(readBuildInfo({ GIT_SHA: 'unknown' }).gitSha, 'dev')
    assert.equal(formatBuildLabel(readBuildInfo({})), 'dev · built dev')
  })

  it('shows the short image SHA and UTC build time', () => {
    const info = readBuildInfo({ GIT_SHA: '0123456789abcdef0123456789abcdef01234567', BUILD_TIME: '2026-10-14T10:20:30Z' })
    assert.equal(info.shortSha, '0123456')
    assert.equal(formatBuildLabel(info), '0123456 · built 2026-10-14 10:20 UTC')
  })
})
