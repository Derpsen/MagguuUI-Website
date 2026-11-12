import jakarta400 from '@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-400-normal.woff2?url'
import jakarta600 from '@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-600-normal.woff2?url'
import jakarta700 from '@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-700-normal.woff2?url'
import jakarta800 from '@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-800-normal.woff2?url'
import mono400 from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2?url'

/**
 * Preloads the five faces the first screen uses (assets/css/fonts.css, `font-display: optional`): the font has to be in
 * before the first render or the page keeps the metric-matched fallback for this view. Same hashed files as the CSS.
 */
export default defineNuxtPlugin(() => {
  useHead({
    link: [jakarta400, jakarta600, jakarta700, jakarta800, mono400].map(href => ({
      rel: 'preload',
      as: 'font',
      type: 'font/woff2',
      href,
      crossorigin: 'anonymous',
    })),
  })
})
