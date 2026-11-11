import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import { CURRENT_ADDON_VERSION } from '../../utils/currentAddonVersion'
import { CURRENT_ADDON_CHANGELOG } from '../../server/database/defaultAddonChangelog'

const PINNED = /v\d+\.\d+\.\d+/

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, acc)
    else if (/\.(vue|ts|js)$/.test(name)) acc.push(full)
  }
  return acc
}

describe('public page copy does not hardcode the addon version', () => {
  it('keeps CURRENT_ADDON_CHANGELOG on the shared constant', () => {
    assert.match(CURRENT_ADDON_VERSION, /^v\d+\.\d+\.\d+$/)
    assert.equal(CURRENT_ADDON_CHANGELOG.version, CURRENT_ADDON_VERSION)
  })

  it('has no leftover hardcoded addon version such as v12.1.9 in pages/', () => {
    const leftovers: string[] = []
    for (const file of walk(join(process.cwd(), 'pages'))) {
      const text = readFileSync(file, 'utf8')
      if (PINNED.test(text)) leftovers.push(`${file.slice(process.cwd().length + 1)}: ${text.match(PINNED)?.[0]}`)
    }
    assert.deepEqual(leftovers, [])
  })
})
