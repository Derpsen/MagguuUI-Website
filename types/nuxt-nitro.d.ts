// Nuxt 4.5 reads nitro config from NitroTypes. @nuxt/nitro-server does not
// register it, so routeRules falls back to a shape without headers or swr.
import 'nitropack/types'

declare module '@nuxt/schema' {
  interface NitroTypes {
    config: import('nitropack/types').NitroConfig
    routeRuleConfig: import('nitropack/types').NitroRouteConfig
  }
}
