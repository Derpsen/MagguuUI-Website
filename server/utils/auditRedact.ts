/**
 * Central redaction for the admin audit log. Everything that reaches
 * `audit_changes` goes through `redactAuditValue`, so secrets are never stored:
 * passwords and hashes, session/API/passkey material, tokens and webhook URLs.
 *
 * Two layers: (1) object keys that look sensitive lose their value entirely,
 * (2) string values are scrubbed for known secret shapes. Over-redacting is the
 * safe direction; an entry whose before-state contains a marker cannot be undone.
 */

export const REDACTED = '[redacted]'
export const TRUNCATED_SUFFIX = '…[truncated]'
export const MAX_STRING = 20_000
export const MAX_JSON = 200_000

const SENSITIVE_KEY = new RegExp([
  'pass(word|wd|phrase|code)?', 'hash', 'token', 'secret', 'api[-_]?key', 'apikey', 'private', 'credential',
  'passkey', 'webauthn', 'public[-_]?key', 'session', 'cookie', 'authorization', 'auth[-_]?header', 'bearer',
  'signature', 'salt', 'otp', 'totp', 'webhook', 'jwt', 'csrf', 'cert', 'pem', 'dsn', 'connection[-_]?string',
  '(^|[-_.])keys?$', '[-_]key$', 'key[-_]?(hash|prefix)',
].join('|'), 'i')

const VALUE_PATTERNS: RegExp[] = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g,
  /https?:\/\/[^\s"'<>]*(?:webhooks?|hooks\.slack\.com|discord(?:app)?\.com\/api)[^\s"'<>]*/gi,
  /\b[Bb]earer\s+[A-Za-z0-9._~+/=-]{8,}/g,
  /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}/g,
  /\$2[aby]\$\d{2}\$[./A-Za-z0-9]{50,}/g,
  /\$argon2[a-z]*\$[^\s"']+/g,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}/g,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}/g,
  /\bsk-[A-Za-z0-9_-]{20,}/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /(:\/\/)[^\s/:@"']+:[^\s/@"']+@/g,
  /([?&](?:token|key|secret|sig|signature|password|pass|auth|apikey|api_key|access_token)=)[^&\s"'<>]+/gi,
  /\b[a-f0-9]{48,}\b/gi,
]

export function scrubString(input: string): string {
  let out = input
  for (const re of VALUE_PATTERNS) {
    out = out.replace(re, (match, g1) => {
      if (typeof g1 === 'string' && g1 && match.startsWith(g1)) return `${g1}${REDACTED}`
      if (typeof g1 === 'string' && g1 === '://') return `://${REDACTED}@`
      return REDACTED
    })
  }
  if (out.length > MAX_STRING) out = out.slice(0, MAX_STRING) + TRUNCATED_SUFFIX
  return out
}

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY.test(key)
}

/** Deep copy with secrets removed. Dates become ISO strings, unknown types are dropped. */
export function redactAuditValue(value: unknown, redactKeys = true, depth = 0): unknown {
  if (value === null || value === undefined) return null
  if (depth > 8) return REDACTED
  if (typeof value === 'string') return scrubString(value)
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.slice(0, 500).map(v => redactAuditValue(v, redactKeys, depth + 1))
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = redactKeys && isSensitiveKey(k) && v !== null && v !== undefined && v !== '' ? REDACTED : redactAuditValue(v, redactKeys, depth + 1)
    }
    return out
  }
  return null
}

/** Redact and serialize; oversized snapshots collapse to a marker. */
export function redactToJson(value: unknown, redactKeys = true): string | null {
  if (value === null || value === undefined) return null
  const json = JSON.stringify(redactAuditValue(value, redactKeys))
  if (json.length > MAX_JSON) return JSON.stringify({ _truncated: true })
  return json
}

/** True when a stored snapshot lost data (redaction or truncation): it cannot be restored. */
export function containsRedaction(value: unknown): boolean {
  if (typeof value === 'string') return value.includes(REDACTED) || value.endsWith(TRUNCATED_SUFFIX)
  if (Array.isArray(value)) return value.some(containsRedaction)
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (obj._truncated === true) return true
    return Object.values(obj).some(containsRedaction)
  }
  return false
}
