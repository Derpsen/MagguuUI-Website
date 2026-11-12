/**
 * Blizzard talent_loadout_code header: 8-bit serialization version, 16-bit
 * spec id, 128-bit tree hash, LSB-first in the standard base64 alphabet.
 */

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

export type MetaLoadoutHeader = {
  version: number
  specId: number
  treeHash: string
}

function bitsFromPrefix(code: string): number[] | null {
  if (typeof code !== 'string' || !/^[A-Za-z0-9+/]{26,}$/.test(code)) return null
  const bits: number[] = []
  for (const ch of code.slice(0, 26)) {
    const v = B64.indexOf(ch)
    if (v < 0) return null
    for (let i = 0; i < 6; i++) bits.push((v >> i) & 1)
  }
  return bits
}

export function decodeLoadoutHeader(code: string): MetaLoadoutHeader | null {
  const bits = bitsFromPrefix(code)
  if (!bits) return null
  let p = 0
  const read = (n: number) => {
    let x = 0
    for (let i = 0; i < n; i++) x |= (bits[p++] ?? 0) << i
    return x >>> 0
  }
  const version = read(8)
  const specId = read(16)
  let treeHash = ''
  for (let i = 0; i < 16; i++) treeHash += read(8).toString(16).padStart(2, '0')
  return { version, specId, treeHash }
}

/** Test helper: build a code whose first 26 characters decode to this header. */
export function encodeLoadoutHeader(version: number, specId: number, treeHashHex: string): string {
  const bits: number[] = []
  const write = (value: number, n: number) => {
    for (let i = 0; i < n; i++) bits.push((value >> i) & 1)
  }
  write(version & 0xff, 8)
  write(specId & 0xffff, 16)
  const hex = treeHashHex.replace(/[^0-9a-f]/gi, '').padEnd(32, '0').slice(0, 32)
  for (let i = 0; i < 16; i++) write(Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16) || 0, 8)
  while (bits.length % 6) bits.push(0)
  let out = ''
  for (let i = 0; i < bits.length; i += 6) {
    let v = 0
    for (let j = 0; j < 6; j++) v |= (bits[i + j] ?? 0) << j
    out += B64[v]!
  }
  return out
}
