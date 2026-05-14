// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt({
  ignores: [
    '.nuxt/**',
    '.output/**',
    'coverage/**',
    'data/**',
    'dist/**',
    'node_modules/**',
    'test-results/**',
    'uploads/**',
  ],
  rules: {
    'vue/attributes-order': 'off',
    'vue/first-attribute-linebreak': 'off',
    'vue/html-self-closing': 'off',
  },
})
