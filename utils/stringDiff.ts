/**
 * Tiny line-oriented diff for admin import-string review.
 * Returns unified hunks with equal / add / remove markers.
 */

export type DiffOp = 'equal' | 'add' | 'remove'

export interface DiffLine {
  op: DiffOp
  text: string
  oldNo: number | null
  newNo: number | null
}

function splitLines(value: string): string[] {
  if (!value) return []
  return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
}

/**
 * Myers-inspired O(ND) for short strings; falls back to a simple LCS table
 * for typical import-string sizes (few thousand chars).
 */
export function diffLines(before: string, after: string): DiffLine[] {
  const a = splitLines(before)
  const b = splitLines(after)
  const n = a.length
  const m = b.length

  // LCS lengths
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i]![j] = a[i] === b[j] ? (dp[i + 1]![j + 1]! + 1) : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!)
    }
  }

  const out: DiffLine[] = []
  let i = 0
  let j = 0
  let oldNo = 1
  let newNo = 1
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ op: 'equal', text: a[i]!, oldNo: oldNo++, newNo: newNo++ })
      i++
      j++
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      out.push({ op: 'remove', text: a[i]!, oldNo: oldNo++, newNo: null })
      i++
    } else {
      out.push({ op: 'add', text: b[j]!, oldNo: null, newNo: newNo++ })
      j++
    }
  }
  while (i < n) {
    out.push({ op: 'remove', text: a[i++]!, oldNo: oldNo++, newNo: null })
  }
  while (j < m) {
    out.push({ op: 'add', text: b[j++]!, oldNo: null, newNo: newNo++ })
  }
  return out
}

export function stringStats(value: string): { chars: number; lines: number; bytes: number } {
  const text = value || ''
  const lines = text.length === 0 ? 0 : splitLines(text).length
  return {
    chars: text.length,
    lines,
    bytes: typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(text).length : text.length,
  }
}
