/**
 * CSV helpers for admin exports. Cells that start with = + - @ tab or CR are prefixed with a single quote so a
 * spreadsheet never evaluates them as a formula (OWASP "CSV injection"); cells with a comma, quote or line break
 * are quoted with doubled quotes. Pure, no imports (unit tested).
 */

const FORMULA_START = /^[=+\-@\t\r]/

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  let text = String(value)
  // Plain numbers are safe as they are (a negative number would otherwise get a quote and stop being a number).
  const isPlainNumber = typeof value === 'number' && Number.isFinite(value)
  if (!isPlainNumber && FORMULA_START.test(text)) text = `'${text}`
  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`
  return text
}

export function csvLine(cells: readonly unknown[]): string {
  return `${cells.map(csvCell).join(',')}\r\n`
}
