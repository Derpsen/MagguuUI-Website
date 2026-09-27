import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const roots = ['pages', 'components']
const skipDirs = new Set(['node_modules', '.nuxt', '.output'])

/** Same line has label: and value: "" / '' (optional as const) — option-shaped empty value. */
const LABEL_KEY = /label\s*:/
const VALUE_EMPTY = /value\s*:\s*(?:""|''|""\s*as\s*const|''\s*as\s*const)/

function walk(dir, files = []) {
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return files
  }
  for (const name of entries) {
    if (skipDirs.has(name)) continue
    const full = join(dir, name)
    let st
    try {
      st = statSync(full)
    } catch {
      continue
    }
    if (st.isDirectory()) walk(full, files)
    else if (name.endsWith('.vue')) files.push(full)
  }
  return files
}

const hits = []
for (const root of roots) {
  for (const file of walk(root)) {
    const text = readFileSync(file, 'utf8')
    const lines = text.split(/\r?\n/)
    lines.forEach((line, i) => {
      if (LABEL_KEY.test(line) && VALUE_EMPTY.test(line)) {
        hits.push(`${relative(process.cwd(), file)}:${i + 1}`)
      }
    })
  }
}

if (hits.length) {
  console.error('USelect/Reka: option-shaped empty value: "" is forbidden (use a sentinel e.g. "all").')
  for (const hit of hits) console.error(hit)
  process.exit(1)
}

console.log('lint:uselect OK — no option-shaped empty values in pages/ or components/')
