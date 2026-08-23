import { defineNuxtModule } from '@nuxt/kit'

/**
 * Build-time patch for @nuxt/ui colors SPA FOUC cleanup.
 * See plugins/unhead-hookonce-compat.client.ts for the runtime story.
 * This transform is the durable fix so production builds do not depend on
 * plugin order between unhead init and the UI colors plugin.
 */
export default defineNuxtModule({
  meta: {
    name: 'fix-nuxt-ui-colors-hookonce',
  },
  setup(_options, nuxt) {
    nuxt.hook('vite:extendConfig', (config) => {
      config.plugins ||= []
      config.plugins.push({
        name: 'fix-nuxt-ui-colors-hookonce',
        transform(code: string, id: string) {
          if (!id.replace(/\\/g, '/').includes('/@nuxt/ui/') || !id.includes('colors')) {
            return null
          }
          if (!code.includes('hookOnce') || !code.includes('dom:rendered')) {
            return null
          }

          const next = code.replace(
            /injectHead\(\)\.hooks\.hookOnce\(\s*["']dom:rendered["']\s*,\s*removeTemporaryColorsStyle\s*\)/,
            [
              '(() => {',
              '  const head = injectHead()',
              '  const unhook = head.hooks?.hook("dom:rendered", () => {',
              '    removeTemporaryColorsStyle()',
              '    unhook?.()',
              '  })',
              '})()',
            ].join('\n    '),
          )

          if (next === code) {
            return null
          }

          return { code: next, map: null }
        },
      })
    })
  },
})