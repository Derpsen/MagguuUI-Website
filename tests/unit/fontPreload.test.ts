import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import { ADMIN_FACES, ALL_FONT_FACES, DEFAULT_FACES, fontFacesForPath } from '../../utils/fontPreload'

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8')

/** Per-route font preloads (utils/fontPreload.ts, plugins/font-preload.ts). */
describe('font preload table', () => {
  it('public routes preload every face the first screen draws (measured: sans 400/600/700/800 + mono 400)', () => {
    for (const path of ['/', '/guide', '/strings', '/addons', '/meta', '/news', '/faq', '/changelog', '/forever', '/some/unknown']) {
      assert.deepEqual([...fontFacesForPath(path)].sort(), ['mono-400', 'sans-400', 'sans-600', 'sans-700', 'sans-800'], path)
    }
    assert.deepEqual(DEFAULT_FACES, ALL_FONT_FACES)
  })

  it('the admin shell preloads only the three faces the login screen draws', () => {
    for (const path of ['/admin', '/admin/login', '/admin/content']) {
      assert.deepEqual([...fontFacesForPath(path)].sort(), ['mono-400', 'sans-400', 'sans-600'], path)
    }
    assert.ok(ADMIN_FACES.length < DEFAULT_FACES.length)
  })

  it('query and hash do not change the route, and a prefix lookalike is not admin', () => {
    assert.deepEqual(fontFacesForPath('/admin/login?next=/x'), ADMIN_FACES)
    assert.deepEqual(fontFacesForPath('/admin#top'), ADMIN_FACES)
    assert.deepEqual(fontFacesForPath('/administrator'), DEFAULT_FACES)
    assert.deepEqual(fontFacesForPath('/adminx/y'), DEFAULT_FACES)
    assert.deepEqual(fontFacesForPath(''), DEFAULT_FACES)
  })

  it('every face id has a woff2 URL in the plugin', () => {
    const plugin = read('plugins/font-preload.ts')
    for (const id of ALL_FONT_FACES) assert.match(plugin, new RegExp(`'${id}':\\s*\\w+,`), id)
    assert.match(plugin, /fontFacesForPath\(route\.path\)/)
  })
})
