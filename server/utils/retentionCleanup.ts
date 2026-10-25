/**
 * Periodic retention steps for analytics-style tables. Every step runs on its own, so one failing step
 * never stops the others, and a failure is logged (never swallowed) and returned to the caller.
 * Pure relative imports so it runs under the tsx unit tests.
 */
import type Database from 'better-sqlite3'
import { runAnalyticsMaintenance } from './analytics'
import { scrubLoginAttemptIdentifiers } from './loginAttempts'
import { pruneVisitorRecords } from './visitorLog'
import { checkpointWal } from './walCheckpoint'

type Sqlite = Database.Database

export interface RetentionStep { name: string, run: () => unknown }

export function retentionSteps(sqlite: Sqlite, cutoff: number): RetentionStep[] {
  return [
    // Anonymous counting: roll up finished days, scrub legacy identifiers, prune detail rows and old aggregates.
    { name: 'analytics maintenance', run: () => runAnalyticsMaintenance(sqlite) },
    // Consent-only visitor log: kept in full for 13 months, then deleted (runs while the flag is off, too).
    { name: 'visitor log retention', run: () => pruneVisitorRecords(sqlite) },
    // Sign-in protection: address and user agent of attempts go after 23 hours (Privacy s9 says up to 24 hours).
    { name: 'login attempt identifiers', run: () => scrubLoginAttemptIdentifiers(sqlite) },
    { name: 'web vitals retention', run: () => sqlite.prepare('DELETE FROM web_vitals WHERE created_at < ?').run(cutoff) },
    // Keep the newest 50 revisions per content cell; older ones go.
    {
      name: 'content revisions',
      run: () => sqlite.prepare(`DELETE FROM content_revisions WHERE id IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (PARTITION BY page, section, key, locale ORDER BY id DESC) AS rn
          FROM content_revisions
        ) WHERE rn > 50
      )`).run(),
    },
  ]
}

/** Last step of every run: truncate the WAL so deleted personal data is not left in the log file. */
export function walCheckpointStep(sqlite: Sqlite, log?: (message: string, error: unknown) => void): RetentionStep {
  return { name: 'wal checkpoint', run: () => checkpointWal(sqlite, log) }
}

/** Runs every step; returns the names of the steps that failed (each failure is logged). */
export function runRetentionCleanup(
  sqlite: Sqlite,
  cutoff: number,
  log: (message: string, error: unknown) => void = (m, e) => console.error(m, e),
  steps: RetentionStep[] = [...retentionSteps(sqlite, cutoff), walCheckpointStep(sqlite, log)],
): string[] {
  const failed: string[] = []
  for (const step of steps) {
    try {
      step.run()
    } catch (e) {
      failed.push(step.name)
      log(`[Cleanup] Retention step "${step.name}" failed:`, e)
    }
  }
  return failed
}
