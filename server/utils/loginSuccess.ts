import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { db, sqlite } from '~/server/database'
import { users } from '~/server/database/schema'
import { createToken, setAuthCookie } from '~/server/utils/auth'
import { createSession, hashToken, logLoginAttempt } from '~/server/utils/session'
import { getSessionTimeoutHours } from '~/server/utils/settings'

interface LoginUser {
  id: number
  username: string
  role: string
}

interface CompleteLoginOptions {
  event: H3Event
  user: LoginUser
  ip: string
  userAgent: string
}

export function completeSuccessfulLogin({
  event,
  user,
  ip,
  userAgent,
}: CompleteLoginOptions) {
  db.update(users)
    .set({ lastLogin: new Date(), isLocked: false, lockedUntil: null })
    .where(eq(users.id, user.id))
    .run()

  const timeoutHours = getSessionTimeoutHours()
  const expiresAt = new Date(Date.now() + timeoutHours * 60 * 60 * 1000)
  const maxAgeSeconds = timeoutHours * 60 * 60

  // Create a temporary token to bootstrap the session, then replace it
  // with the final token that includes the sessionId.
  const bootstrapToken = createToken({
    userId: user.id,
    username: user.username,
    role: user.role,
  })

  const session = createSession({
    userId: user.id,
    token: bootstrapToken,
    ip,
    userAgent,
    expiresAt,
  })

  // Final token includes sessionId for session validation on subsequent requests
  const token = createToken({
    userId: user.id,
    username: user.username,
    role: user.role,
    sessionId: session.id,
  })
  setAuthCookie(event, token, maxAgeSeconds)

  sqlite.prepare('UPDATE sessions SET token_hash = ? WHERE id = ?')
    .run(hashToken(token), session.id)

  logLoginAttempt({
    username: user.username,
    ip,
    userAgent,
    success: true,
  })

  return {
    success: true,
    data: {
      sessionId: session.id,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    },
  }
}
