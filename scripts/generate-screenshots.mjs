// Pre-generates responsive AVIF/WebP (+ resized JPG) variants of the homepage
// screenshots in public/screenshots. Run after replacing a source JPG:
//   node scripts/generate-screenshots.mjs
// Outputs <name>-<width>.{avif,webp,jpg}; components/ScreenshotFrame.vue
// builds the srcset from SCREENSHOT_WIDTHS (utils/screenshots.ts).
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'

const dir = join(import.meta.dirname, '..', 'public', 'screenshots')
const widths = [800, 1280, 2000]
const sources = (await readdir(dir)).filter(f => /^[a-z-]+\.jpg$/.test(f))

for (const file of sources) {
  const name = file.replace(/\.jpg$/, '')
  for (const width of widths) {
    const base = sharp(join(dir, file)).resize({ width, withoutEnlargement: true })
    await base.clone().avif({ quality: 62, effort: 6 }).toFile(join(dir, `${name}-${width}.avif`))
    await base.clone().webp({ quality: 82, effort: 6 }).toFile(join(dir, `${name}-${width}.webp`))
    await base.clone().jpeg({ quality: 82, mozjpeg: true }).toFile(join(dir, `${name}-${width}.jpg`))
  }
  console.log(`[screenshots] ${name}: ${widths.join(', ')}`)
}
