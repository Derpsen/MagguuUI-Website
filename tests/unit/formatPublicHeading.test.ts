import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { formatPublicHeading } from '../../utils/formatPublicHeading'

const NBSP = '\u00A0'
const RSQUO = '\u2019'

describe('formatPublicHeading', () => {
  it('turns straight apostrophes in possessives and names into typographic ones', () => {
    assert.equal(
      formatPublicHeading("Season 2's Mid-Season Refresh"),
      `Season${NBSP}2${RSQUO}s Mid-Season Refresh`,
    )
    assert.equal(formatPublicHeading("Kith'ix"), `Kith${RSQUO}ix`)
    assert.equal(formatPublicHeading("World of Warcraft's 22nd Anniversary"), `World of Warcraft${RSQUO}s 22nd Anniversary`)
  })

  it('keeps Season N and month-day phrases together with nbsp', () => {
    const titled = formatPublicHeading('Midnight Season 2 Mythic+: The Official Dungeon Pool')
    assert.ok(titled.includes(`Season${NBSP}2`), titled)
    const dates = formatPublicHeading('Runs November 17 to December 8')
    assert.equal(dates, `Runs November${NBSP}17${NBSP}to${NBSP}December${NBSP}8`)
  })

  it('is a no-op on an empty string and leaves typographic apostrophes alone', () => {
    assert.equal(formatPublicHeading(''), '')
    assert.equal(formatPublicHeading(`Kith${RSQUO}ix`), `Kith${RSQUO}ix`)
  })
})
