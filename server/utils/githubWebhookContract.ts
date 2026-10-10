import { createHmac, timingSafeEqual } from 'node:crypto'
import { ADDON_DATA_ROOT } from '~/server/utils/addonProfileLua'
import { CLASS_DATA_ROOT } from '~/server/utils/classLayoutSync'

export function verifyGitHubWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string,
) {
  const expected = `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`
  if (!signature || Buffer.byteLength(signature) !== Buffer.byteLength(expected)) return false
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

const WORKFLOW_RUN_ERRORS = new Set(['failure', 'timed_out', 'startup_failure', 'action_required'])

/** Sync-history status for a GitHub workflow_run conclusion or, while it is running, its status. */
export function workflowRunHistoryStatus(value: string | null | undefined): 'success' | 'error' | 'info' {
  if (value === 'success') return 'success'
  if (value && WORKFLOW_RUN_ERRORS.has(value)) return 'error'
  return 'info'
}

export function classifyCanonicalPushChanges(
  changedPaths: ReadonlySet<string>,
  options: { forced: boolean, commitCount: number },
) {
  const requireFullRefresh = options.forced || options.commitCount === 0 || options.commitCount >= 20
  return {
    requireFullRefresh,
    addonsTouched: requireFullRefresh || [...changedPaths].some(path => path.startsWith(`${ADDON_DATA_ROOT}/`)),
    classesTouched: requireFullRefresh || [...changedPaths].some(path => path.startsWith(`${CLASS_DATA_ROOT}/`)),
    tocTouched: requireFullRefresh || changedPaths.has('MagguuUI.toc'),
    changelogTouched: requireFullRefresh || changedPaths.has('CHANGELOG.md'),
  }
}
