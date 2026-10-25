/**
 * Readable diff for the audit log (pure, shared by the admin page and tests).
 * Snapshots are flat objects; strings get a line diff, everything else a value change.
 */

export type DiffLine = { type: 'same' | 'add' | 'del', text: string }

export interface FieldChange {
  field: string
  kind: 'added' | 'removed' | 'changed'
  before: string | null
  after: string | null
  lines: DiffLine[]
}

const show = (v: unknown): string | null => {
  if (v === null || v === undefined) return null
  return typeof v === 'string' ? v : JSON.stringify(v)
}

/** Line diff via LCS. Inputs are capped, so the O(n*m) table stays small. */
export function diffLines(before: string, after: string): DiffLine[] {
  const a = before.split('\n').slice(0, 400)
  const b = after.split('\n').slice(0, 400)
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0))
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i]![j] = a[i] === b[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!)
    }
  }
  const out: DiffLine[] = []
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { out.push({ type: 'same', text: a[i]! }); i++; j++ }
    else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) { out.push({ type: 'del', text: a[i]! }); i++ }
    else { out.push({ type: 'add', text: b[j]! }); j++ }
  }
  while (i < a.length) out.push({ type: 'del', text: a[i++]! })
  while (j < b.length) out.push({ type: 'add', text: b[j++]! })
  return out
}

export function diffSnapshots(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): FieldChange[] {
  const b = before || {}
  const a = after || {}
  const fields = [...new Set([...Object.keys(b), ...Object.keys(a)])]
  const changes: FieldChange[] = []
  for (const field of fields) {
    const hasBefore = field in b && b[field] !== null && b[field] !== undefined
    const hasAfter = field in a && a[field] !== null && a[field] !== undefined
    const bs = show(b[field])
    const as = show(a[field])
    if (bs === as) continue
    changes.push({
      field,
      kind: !hasBefore ? 'added' : !hasAfter ? 'removed' : 'changed',
      before: bs,
      after: as,
      lines: diffLines(bs ?? '', as ?? ''),
    })
  }
  return changes
}
