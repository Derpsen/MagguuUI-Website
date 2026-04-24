/**
 * WebAuthn / Passkey Utilities
 *
 * Server-side helpers for registration and authentication
 * using @simplewebauthn/server. Challenges stored in DB.
 */

import type { H3Event } from 'h3'
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server'
import type {
  GenerateRegistrationOptionsOpts,
  GenerateAuthenticationOptionsOpts,
  VerifiedRegistrationResponse,
  VerifiedAuthenticationResponse,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/server'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { db, sqlite } from '~/server/database'
import { passkeys, webauthnChallenges, users } from '~/server/database/schema'

// Authenticator transports per WebAuthn spec + simplewebauthn extensions.
// Anything outside this list is dropped so malformed DB rows can't break
// the registration/authentication options building.
const transportsSchema = z.array(
  z.enum(['ble', 'cable', 'hybrid', 'internal', 'nfc', 'smart-card', 'usb']),
)
type Transport = z.infer<typeof transportsSchema>[number]

function parseTransports(raw: string | null | undefined): Transport[] | undefined {
  if (!raw) return undefined
  try {
    const parsed = transportsSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : undefined
  } catch {
    return undefined
  }
}

// ─── Internal DB row types ─────────────────────────

interface ChallengeRow { id: number }
interface CountRow { count: number }

// ─── Base64URL Helpers (native, replacing @simplewebauthn/server/helpers) ───
const base64urlToBuffer = (str: string): Uint8Array<ArrayBuffer> => {
  const buf = Buffer.from(str, 'base64url')
  return new Uint8Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer)
}
const bufferToBase64url = (buf: Uint8Array): string => Buffer.from(buf).toString('base64url')
const utf8ToUint8Array = (str: string): Uint8Array => new TextEncoder().encode(str)

// ─── RP Config Helpers ─────────────────────────────

/**
 * Get Relying Party configuration from runtimeConfig or request.
 *
 * Precedence:
 *  1. Explicit `NUXT_WEBAUTHN_RP_ID` / `NUXT_WEBAUTHN_ORIGIN` runtime config (preferred)
 *  2. Derived from the incoming request URL (dev or missing env)
 *  3. `localhost` fallback only in development
 *
 * In production we refuse to silently fall back to `localhost` — that would
 * cause passkeys registered against a wrong RP-ID to fail later with a
 * confusing mismatch. Missing config without a request context is fatal.
 */
function getRpConfig(event?: H3Event) {
  const config = useRuntimeConfig()
  const isDev = process.env.NODE_ENV === 'development'
  const rpName = config.webauthnRpName || 'MagguuUI Admin'

  let rpId = config.webauthnRpId
  let origin = config.webauthnOrigin

  if (event && (!rpId || !origin)) {
    const requestUrl = getRequestURL(event)
    if (!rpId) rpId = requestUrl.hostname
    if (!origin) origin = requestUrl.origin
  }

  if (!rpId || !origin) {
    if (isDev) {
      rpId = rpId || 'localhost'
      origin = origin || 'http://localhost:3000'
    } else {
      throw createError({
        statusCode: 500,
        message:
          'WebAuthn RP configuration missing — set NUXT_WEBAUTHN_RP_ID and NUXT_WEBAUTHN_ORIGIN.',
      })
    }
  }

  return { rpName, rpId, origin }
}

// ─── Challenge Management ──────────────────────────

/**
 * Store a WebAuthn challenge in the database.
 * Expires after 5 minutes.
 */
function storeChallenge(challenge: string, type: 'register' | 'authenticate', userId?: number) {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 min
  return db.insert(webauthnChallenges).values({
    challenge,
    type,
    userId: userId ?? null,
    expiresAt,
  }).returning().get()
}

/**
 * Clean up expired challenges.
 */
export function cleanupExpiredChallenges() {
  const now = Math.floor(Date.now() / 1000)
  const result = sqlite.prepare('DELETE FROM webauthn_challenges WHERE expires_at < ?').run(now)
  return result.changes
}

// ─── Registration ──────────────────────────────────

/**
 * Generate registration options for a user.
 * Returns the options object to send to the browser.
 */
export async function generatePasskeyRegistrationOptions(userId: number, username: string, event?: H3Event) {
  const { rpName, rpId } = getRpConfig(event)

  // Get existing credentials to exclude
  const existingPasskeys = db.select({
    credentialId: passkeys.credentialId,
    transports: passkeys.transports,
  }).from(passkeys).where(eq(passkeys.userId, userId)).all()

  const excludeCredentials = existingPasskeys.map(p => ({
    id: p.credentialId,
    transports: parseTransports(p.transports),
  }))

  const options = await generateRegistrationOptions({
    rpName,
    rpID: rpId,
    userName: username,
    userID: utf8ToUint8Array(String(userId)),
    attestationType: 'none',
    excludeCredentials,
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  } as GenerateRegistrationOptionsOpts)

  // Store challenge
  storeChallenge(options.challenge, 'register', userId)

  return options
}

/**
 * Verify a registration response and store the passkey.
 */
export async function verifyPasskeyRegistration(
  userId: number,
  credential: RegistrationResponseJSON,
  deviceName: string,
  event?: H3Event,
) {
  const { rpId, origin } = getRpConfig(event)

  // Verify with challenge lookup callback (single consumption — no pre-consume)
  let verification: VerifiedRegistrationResponse
  try {
    verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: (challenge: string) => {
        // Look up challenge in DB and consume it (one-time use)
        const row = sqlite.prepare(
          'SELECT * FROM webauthn_challenges WHERE challenge = ? AND type = ? AND user_id = ? AND expires_at > ?'
        ).get(challenge, 'register', userId, Math.floor(Date.now() / 1000)) as ChallengeRow | undefined
        if (row) {
          sqlite.prepare('DELETE FROM webauthn_challenges WHERE id = ?').run(row.id)
          return true
        }
        return false
      },
      expectedOrigin: origin,
      expectedRPID: rpId,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    throw createError({ statusCode: 400, message: `Passkey verification failed: ${msg}` })
  }

  if (!verification.verified || !verification.registrationInfo) {
    throw createError({ statusCode: 400, message: 'Passkey verification failed' })
  }

  const { credential: cred, credentialDeviceType, aaguid } = verification.registrationInfo

  // Store passkey in database
  const passkey = db.insert(passkeys).values({
    userId,
    credentialId: cred.id,
    publicKey: bufferToBase64url(cred.publicKey),
    counter: cred.counter,
    deviceName: deviceName || 'Passkey',
    transports: credential.response.transports
      ? JSON.stringify(credential.response.transports)
      : null,
    aaguid: aaguid || null,
  }).returning().get()

  return passkey
}

// ─── Authentication ────────────────────────────────

/**
 * Generate authentication options (for login).
 * Returns options to send to the browser.
 */
export async function generatePasskeyAuthenticationOptions(event?: H3Event) {
  const { rpId } = getRpConfig(event)

  // Get all passkeys for allowCredentials
  const allPasskeys = db.select({
    credentialId: passkeys.credentialId,
    transports: passkeys.transports,
  }).from(passkeys).all()

  const allowCredentials = allPasskeys.map(p => ({
    id: p.credentialId,
    transports: parseTransports(p.transports),
  }))

  const options = await generateAuthenticationOptions({
    rpID: rpId,
    allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
    userVerification: 'preferred',
  } as GenerateAuthenticationOptionsOpts)

  // Store challenge
  storeChallenge(options.challenge, 'authenticate')

  return options
}

/**
 * Verify an authentication response and resolve the user.
 * Returns { user, passkey, session } info for JWT creation.
 */
export async function verifyPasskeyAuthentication(credential: AuthenticationResponseJSON, event?: H3Event) {
  const { rpId, origin } = getRpConfig(event)

  // Find the passkey by credential ID
  const passkeyRow = db.select().from(passkeys)
    .where(eq(passkeys.credentialId, credential.id))
    .get()

  if (!passkeyRow) {
    throw createError({ statusCode: 401, message: 'Unknown passkey' })
  }

  // Verify the authentication response
  let verification: VerifiedAuthenticationResponse
  try {
    verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: (challenge: string) => {
        const row = sqlite.prepare(
          'SELECT * FROM webauthn_challenges WHERE challenge = ? AND type = ? AND expires_at > ?'
        ).get(challenge, 'authenticate', Math.floor(Date.now() / 1000)) as ChallengeRow | undefined
        if (row) {
          sqlite.prepare('DELETE FROM webauthn_challenges WHERE id = ?').run(row.id)
          return true
        }
        return false
      },
      expectedOrigin: origin,
      expectedRPID: rpId,
      credential: {
        id: passkeyRow.credentialId,
        publicKey: base64urlToBuffer(passkeyRow.publicKey),
        counter: passkeyRow.counter,
        transports: parseTransports(passkeyRow.transports),
      },
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    throw createError({ statusCode: 401, message: `Authentication failed: ${msg}` })
  }

  if (!verification.verified) {
    throw createError({ statusCode: 401, message: 'Passkey authentication failed' })
  }

  // Update counter + lastUsed
  const newCounter = verification.authenticationInfo.newCounter
  sqlite.prepare('UPDATE passkeys SET counter = ?, last_used = ? WHERE id = ?')
    .run(newCounter, Math.floor(Date.now() / 1000), passkeyRow.id)

  // Resolve user
  const user = db.select().from(users)
    .where(eq(users.id, passkeyRow.userId))
    .get()

  if (!user) {
    throw createError({ statusCode: 401, message: 'User not found' })
  }

  return { user, passkey: passkeyRow }
}

// ─── Passkey Management ────────────────────────────

/**
 * Get all passkeys for a user.
 */
export function getUserPasskeys(userId: number) {
  return db.select({
    id: passkeys.id,
    credentialId: passkeys.credentialId,
    deviceName: passkeys.deviceName,
    aaguid: passkeys.aaguid,
    createdAt: passkeys.createdAt,
    lastUsed: passkeys.lastUsed,
  }).from(passkeys).where(eq(passkeys.userId, userId)).all()
}

/**
 * Get passkey count for a user.
 */
export function getUserPasskeyCount(userId: number): number {
  const result = sqlite.prepare('SELECT COUNT(*) as count FROM passkeys WHERE user_id = ?').get(userId) as CountRow | undefined
  return result?.count || 0
}

/**
 * Rename a passkey.
 */
export function renamePasskey(id: number, userId: number, newName: string) {
  const row = db.select().from(passkeys)
    .where(and(eq(passkeys.id, id), eq(passkeys.userId, userId)))
    .get()

  if (!row) {
    throw createError({ statusCode: 404, message: 'Passkey not found' })
  }

  sqlite.prepare('UPDATE passkeys SET device_name = ? WHERE id = ?').run(newName, id)
  return { ...row, deviceName: newName }
}

/**
 * Delete a passkey.
 */
export function deletePasskey(id: number, userId: number) {
  const row = db.select().from(passkeys)
    .where(and(eq(passkeys.id, id), eq(passkeys.userId, userId)))
    .get()

  if (!row) {
    throw createError({ statusCode: 404, message: 'Passkey not found' })
  }

  sqlite.prepare('DELETE FROM passkeys WHERE id = ?').run(id)
  return row
}

/**
 * Check if any passkeys exist (for showing passkey button on login page).
 */
export function hasAnyPasskeys(): boolean {
  const result = sqlite.prepare('SELECT COUNT(*) as count FROM passkeys').get() as CountRow | undefined
  return (result?.count || 0) > 0
}
