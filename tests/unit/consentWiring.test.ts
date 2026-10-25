/**
 * Wiring guards: the places where the consent flag and the consent choice are connected to the runtime
 * (route files, plugins, components). They are Nuxt files that cannot be imported under tsx, so the source is checked.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { PRIVACY_DEFAULTS } from '../../utils/pageCopyDefaults'

const root = new URL('../../', import.meta.url)
const src = (rel: string) => readFileSync(new URL(rel, root), 'utf8')
const code = (rel: string) => src(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('route files: the flag and the tracking switch gate every capture endpoint', () => {
  for (const f of ['visitor-hit', 'visitor-event', 'consent']) {
    it(`${f}.post.ts needs NUXT_VISITOR_LOG`, () => {
      const c = code(`server/api/v1/${f}.post.ts`)
      assert.match(c, /enabled: \(\) => visitorLogEnabled\(process\.env\.NUXT_VISITOR_LOG\)/, f)
    })
  }
  for (const f of ['visitor-hit', 'visitor-event']) {
    it(`${f}.post.ts also respects the admin tracking switch (AND, not OR)`, () => {
      assert.match(code(`server/api/v1/${f}.post.ts`), /visitorLogEnabled\(process\.env\.NUXT_VISITOR_LOG\) && isPageViewTrackingEnabled\(\)/, f)
    })
  }
  it('visitor-hit.post.ts hands the request to handleVisitorHit and records through recordVisitorHit', () => {
    const c = code('server/api/v1/visitor-hit.post.ts')
    assert.match(c, /handleVisitorHit\(event, \{/)
    assert.match(c, /record: input => recordVisitorHit\(sqlite, input\)/)
    assert.match(c, /gate: e => beaconGate\(e, 'visitor-hit', 120\)/)
  })
})

describe('plugin wiring', () => {
  it('the visitor-log plugin publishes the flag from the server env only (never read in the browser)', () => {
    const c = code('plugins/visitor-log.ts')
    assert.match(c, /useState<boolean>\('visitorLog', \(\) => \(import\.meta\.server \? visitorLogEnabled\(process\.env\.NUXT_VISITOR_LOG\) : false\)\)/)
  })
  it('the web-vitals plugin honours Do Not Track / Global Privacy Control in the browser', () => {
    const c = code('plugins/web-vitals.client.ts')
    assert.match(c, /import \{ clientOptedOut \} from '~\/utils\/beacon'/)
    assert.match(c, /if \(clientOptedOut\(\)\) return/)
    // The check comes before anything is queued or sent.
    assert.ok(c.indexOf('clientOptedOut()') < c.indexOf('sendBeacon'))
    assert.match(c, /\/api\/v1\/vitals/)
    assert.doesNotMatch(c, /cookie|localStorage|getClientIp/i)
  })
  it('the server vitals endpoint stays anonymous and honours the signals too', () => {
    const c = code('server/api/v1/vitals.post.ts')
    assert.match(c, /requestOptedOut\(event\)/)
    assert.doesNotMatch(c, /getCookie|setCookie|user-agent|userAgent/i)
  })
})

describe('advertising stays behind the consent gate (default off)', () => {
  const c = code('components/AdBanner.vue')
  it('needs the flag, a positive choice and no refusal signal before anything is shown or loaded', () => {
    assert.match(c, /consent\.enabled\.value && consent\.choice\.value === true && !consent\.optedOut\.value/)
    assert.match(c, /const shouldShow = computed\(\(\) => enabled\.value && consented\.value && publisherId\.value && slotId\.value\)/)
  })
  it('loads the script only from the watcher on shouldShow, never unconditionally on mount', () => {
    assert.doesNotMatch(c, /onMounted/)
    assert.match(c, /watch\(shouldShow, \(on\) => \{[\s\S]*?showAd\(\)/)
    assert.equal((c.match(/loadAdSenseScript\(\)/g) ?? []).length, 2) // definition call site + the function declaration use
  })
  it('the setting itself defaults to off', () => {
    assert.match(code('components/AdBanner.vue'), /adsense_enabled === 'true'/)
  })
})

describe('no third-party hints in the document head', () => {
  it('nuxt.config.ts has no dns-prefetch / preconnect to an external host', () => {
    const c = code('nuxt.config.ts')
    assert.doesNotMatch(c, /dns-prefetch|preconnect/)
    assert.doesNotMatch(c, /api\.iconify\.design/)
  })
})

describe('banner and privacy text match what the code does', () => {
  it('the banner names what happens without a click and with a click', () => {
    const t = src('components/ConsentBanner.vue').replace(/\s+/g, ' ')
    for (const needle of ['Without your agreement', 'no tracking cookie', 'anonymously', 'one small cookie (mg_consent, 6 months)', 'Accept all', 'two random cookies (30 minutes and 13 months)']) {
      assert.ok(t.includes(needle), needle)
    }
    assert.ok(!t.includes('works without cookies'), 'the old claim is gone: a click always sets mg_consent')
  })
  it('s4 names the cookie and both local storage keys, s7 names the page load measurement, s11 the lifetimes', () => {
    const s4 = PRIVACY_DEFAULTS.s4!.body!
    for (const needle of ['mg_consent', 'nuxt-color-mode', 'lastSeenVersion', 'local storage']) assert.ok(s4.includes(needle), needle)
    const s7 = PRIVACY_DEFAULTS.s7!.body!
    for (const needle of ['page load measurement', 'LCP, INP, CLS and TTFB', '90 days', 'Global Privacy Control']) assert.ok(s7.includes(needle), needle)
    const s11 = PRIVACY_DEFAULTS.s11!.body!
    for (const needle of ['6 months from the day of your choice', '30 minutes', '13 months (395 days)']) assert.ok(s11.includes(needle), needle)
  })
})
