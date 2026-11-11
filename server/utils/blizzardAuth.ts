/**
 * Blizzard OAuth client-credentials helper.
 * Client id/secret come from runtimeConfig / env only and are never logged.
 */

export const BLIZZARD_TOKEN_URL = 'https://oauth.battle.net/token'

export type BlizzardCredentials = { id: string, secret: string }

export function blizzardCredentialsFromConfig(config: {
  blizzardClientId?: unknown
  blizzardClientSecret?: unknown
}): BlizzardCredentials | null {
  const id = typeof config.blizzardClientId === 'string' ? config.blizzardClientId.trim() : ''
  const secret = typeof config.blizzardClientSecret === 'string' ? config.blizzardClientSecret.trim() : ''
  if (!id || !secret) return null
  return { id, secret }
}

export function sanitizeBlizzardLog(value: string, secrets: readonly string[] = []): string {
  let out = value
  for (const secret of secrets) {
    if (secret) out = out.split(secret).join('[redacted]')
  }
  out = out.replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
  out = out.replace(/Basic\s+\S+/gi, 'Basic [redacted]')
  return out
}

export function basicAuthHeader(credentials: BlizzardCredentials): string {
  const raw = `${credentials.id}:${credentials.secret}`
  return `Basic ${Buffer.from(raw, 'utf8').toString('base64')}`
}

type TokenCache = { token: string, expiresAt: number }
let tokenCache: TokenCache | null = null

export function resetBlizzardAccessTokenCache() {
  tokenCache = null
}

export type TokenResponse = {
  access_token?: unknown
  expires_in?: unknown
  token_type?: unknown
}

export async function getBlizzardAccessToken(
  credentials: BlizzardCredentials,
  requestToken: (credentials: BlizzardCredentials) => Promise<TokenResponse>,
  now = Date.now(),
): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > now + 5_000) return tokenCache.token
  let body: TokenResponse
  try {
    body = await requestToken(credentials)
  } catch (err) {
    const message = sanitizeBlizzardLog(err instanceof Error ? err.message : 'token request failed', [credentials.id, credentials.secret])
    throw new Error(message, { cause: err })
  }
  const token = typeof body.access_token === 'string' ? body.access_token : ''
  const expiresIn = typeof body.expires_in === 'number' && Number.isFinite(body.expires_in)
    ? body.expires_in
    : Number(body.expires_in)
  if (!token) throw new Error('Blizzard token response was missing an access token')
  const ttlSec = Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 3600
  tokenCache = { token, expiresAt: now + ttlSec * 1000 }
  return token
}
