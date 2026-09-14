/**
 * Load reflect-metadata before @simplewebauthn/server pulls in @peculiar/x509 2.x
 * (tsyringe). Nitro scans server/plugins alphabetically, so the `00-` prefix
 * evaluates this first. Smoke/preview crash at startup without the polyfill.
 */
import 'reflect-metadata'

export default defineNitroPlugin(() => {
  // Side-effect import above is the whole plugin.
})
