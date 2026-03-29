/**
 * Runtime Guard
 *
 * Fails fast in production when security-critical runtime config is missing
 * or still using insecure development defaults.
 */

export default defineNitroPlugin(() => {
  if (process.env.NODE_ENV !== 'production') return

  const config = useRuntimeConfig()
  const problems: string[] = []

  if (!config.jwtSecret || config.jwtSecret === 'change-me-in-production') {
    problems.push('NUXT_JWT_SECRET is missing or still using the insecure default value.')
  }

  if (config.githubToken && (!config.githubRepo || !/^[^/]+\/[^/]+$/.test(config.githubRepo))) {
    problems.push('NUXT_GITHUB_REPO must be set as owner/repo when NUXT_GITHUB_TOKEN is configured.')
  }

  const hasWebauthnRpId = Boolean(config.webauthnRpId)
  const hasWebauthnOrigin = Boolean(config.webauthnOrigin)

  if (hasWebauthnRpId !== hasWebauthnOrigin) {
    problems.push('NUXT_WEBAUTHN_RP_ID and NUXT_WEBAUTHN_ORIGIN must either both be set or both be empty.')
  }

  if (hasWebauthnOrigin) {
    try {
      const origin = new URL(config.webauthnOrigin)
      if (!['http:', 'https:'].includes(origin.protocol)) {
        problems.push('NUXT_WEBAUTHN_ORIGIN must use http or https.')
      }
    } catch {
      problems.push('NUXT_WEBAUTHN_ORIGIN must be a valid absolute URL.')
    }
  }

  if (!problems.length) return

  throw new Error([
    'Refusing to start in production because runtime configuration is unsafe:',
    ...problems.map(problem => `- ${problem}`),
  ].join('\n'))
})
