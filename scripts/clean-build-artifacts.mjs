import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const targets = [
  '.output',
  join('.nuxt', 'dist'),
]

for (const target of targets) {
  if (!existsSync(target)) continue
  rmSync(target, { recursive: true, force: true })
  console.log(`[clean] removed ${target}`)
}

const requiredDirs = [
  '.nuxt',
  join('.nuxt', 'cache'),
  join('.nuxt', 'cache', 'fonts'),
  join('.nuxt', 'dist'),
]

for (const dir of requiredDirs) {
  mkdirSync(dir, { recursive: true })
  console.log(`[clean] ensured ${dir}`)
}
