/**
 * L3 / L4: the privacy text states no retention number that the code does not use, and the server-log wording matches
 * what sections 2, 11 and 12 say. Stored edits (site_content) always win over these defaults (mergePageCopy), so changing
 * a default never overwrites text the operator saved.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { COPY_TOKEN_RETENTION_DAYS, fillCopyTokens, mergePageCopy, PRIVACY_DEFAULTS } from '../../utils/pageCopyDefaults'
import { PUBLIC_SITE_SETTING_KEYS, PUBLIC_SITE_SETTINGS_DEFAULTS } from '../../utils/siteSettingsDefaults'

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8')

describe('L3: vitals retention in section 7 follows data_retention_days', () => {
  it('the default text carries the token and no fixed 90', () => {
    const s7 = PRIVACY_DEFAULTS.s7!.body!
    assert.ok(s7.includes(`deleted after ${COPY_TOKEN_RETENTION_DAYS} days`))
    assert.ok(!/after 90 days/.test(s7))
  })
  it('fillCopyTokens inserts the setting; junk falls back to the 90 default', () => {
    const html = `a ${COPY_TOKEN_RETENTION_DAYS} b ${COPY_TOKEN_RETENTION_DAYS}`
    assert.equal(fillCopyTokens(html, { retention_days: '30' }), 'a 30 b 30')
    assert.equal(fillCopyTokens(html, { retention_days: 180 }), 'a 180 b 180')
    for (const bad of [undefined, null, '', 'abc', '0', '-5', '1.5', '99999', '30</p><script>']) assert.equal(fillCopyTokens(html, { retention_days: bad }), 'a 90 b 90', String(bad))
    assert.equal(fillCopyTokens('no token', { retention_days: '30' }), 'no token')
  })
  it('the setting is public (the page reads it) with a default, and the deletion really uses it', () => {
    assert.ok((PUBLIC_SITE_SETTING_KEYS as readonly string[]).includes('data_retention_days'))
    assert.equal(PUBLIC_SITE_SETTINGS_DEFAULTS.data_retention_days, '90')
    assert.match(read('server/plugins/session-cleanup.ts'), /getDataRetentionDays\(\)/)
    assert.match(read('server/utils/retentionCleanup.ts'), /web vitals retention.*DELETE FROM web_vitals WHERE created_at < \?.*run\(cutoff\)/)
  })
  it('a stored edit is never replaced by a default', () => {
    const merged = mergePageCopy(PRIVACY_DEFAULTS, { s7: { body: '<p>my own text, 14 days</p>' } })
    assert.equal(merged.s7!.body, '<p>my own text, 14 days</p>')
    assert.equal(merged.s4!.title, PRIVACY_DEFAULTS.s4!.title)
  })
  it('the public Privacy view fills the token', () => {
    assert.match(read('components/PageView/Privacy.vue'), /fillCopyTokens\(html, \{ retention_days: siteSettings\.value\.data_retention_days \}\)/)
  })
})

describe('L4: section 4 does not call the IP address anonymized', () => {
  const s4 = PRIVACY_DEFAULTS.s4!.body!
  it('says the address is complete, and points to the opt-in records and Cloudflare', () => {
    assert.ok(!/IP address \(anonymized\)/i.test(s4))
    assert.match(s4, /IP address \(the full address; it is not shortened or anonymized\)/)
    assert.match(s4, /only if you agree to the optional visitor statistics \(sections 10 to 12\)/)
    assert.match(s4, /Cloudflare, which is described in section 12/)
  })
  it('no section claims anonymization of the IP address, except the daily counter code of section 7 which never holds it', () => {
    for (const [id, sec] of Object.entries(PRIVACY_DEFAULTS)) {
      const body = sec.body ?? ''
      assert.ok(!/IP address[^<]{0,40}anonymi[sz]ed\)/i.test(body.replace('not shortened or anonymized', '')), id)
    }
  })
})
