import jakarta400 from '@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-400-normal.woff2?url'
import jakarta600 from '@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-600-normal.woff2?url'
import jakarta700 from '@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-700-normal.woff2?url'
import jakarta800 from '@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-800-normal.woff2?url'
import mono400 from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2?url'
import { fontFacesForPath, type FontFaceId } from '~/utils/fontPreload'

const FACE_URLS: Record<FontFaceId, string> = {
  'sans-400': jakarta400,
  'sans-600': jakarta600,
  'sans-700': jakarta700,
  'sans-800': jakarta800,
  'mono-400': mono400,
}

/**
 * Preloads the faces the first screen of this route draws (utils/fontPreload.ts, assets/css/fonts.css uses
 * `font-display: optional`): the font has to be in before the first render or the page keeps the metric-matched
 * fallback for this view. Same hashed files as the CSS.
 */
export default defineNuxtPlugin(() => {
  const route = useRoute()
  useHead(() => ({
    link: fontFacesForPath(route.path).map(id => ({
      rel: 'preload',
      as: 'font',
      type: 'font/woff2',
      href: FACE_URLS[id],
      crossorigin: 'anonymous',
    })),
  }))
})
