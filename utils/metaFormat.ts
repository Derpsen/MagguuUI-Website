import type { MetaStatBar } from './metaTypes'

export function formatShare(share: number): string {
  return `${Math.round(share * 1000) / 10}%`
}

export function formatSharePercent(share: number): number {
  return Math.round(share * 1000) / 10
}

/** Wowhead-style separators: large gap >>, medium >, close ≥. */
export function statPrioritySymbol(current: number, next: number): '>>' | '>' | '≥' {
  if (current <= 0) return '≥'
  const ratio = next / current
  if (ratio < 0.85) return '>>'
  if (ratio < 0.95) return '>'
  return '≥'
}

export function statPriorityParts(stats: MetaStatBar[]): Array<{ name: string, symbol: string | null }> {
  return stats.map((stat, index) => ({
    name: stat.label,
    symbol: index < stats.length - 1 ? statPrioritySymbol(stat.average, stats[index + 1]!.average) : null,
  }))
}
