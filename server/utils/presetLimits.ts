/**
 * The limiter set of the preset submission form (pure, unit tested). The numbers are chosen against
 * the database caps: DAILY_CAP (40 per UTC day, all visitors) and PENDING_CAP (200 waiting items).
 * One /64 may add 5 per day and one /48 (or IPv4 /24) 10 per day, so at least four different
 * networks are needed to use up a day, and a single source cannot fill the review queue quickly.
 */
import { createWindowLimiter } from './communityPresets'

export const HOUR_MS = 3600_000
export const DAY_MS = 24 * HOUR_MS

export function presetSubmissionLimits(scale = 1) {
  return {
    /** Every POST (valid or not). */
    attempts: createWindowLimiter(15 * scale, HOUR_MS),
    attemptsGroup: createWindowLimiter(60 * scale, HOUR_MS),
    accepted: createWindowLimiter(3 * scale, HOUR_MS),
    acceptedDay: createWindowLimiter(5 * scale, DAY_MS),
    acceptedGroup: createWindowLimiter(10 * scale, DAY_MS),
  }
}
