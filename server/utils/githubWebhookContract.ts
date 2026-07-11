import { createHmac, timingSafeEqual } from 'node:crypto'
import { ADDON_DATA_ROOT } from '~/server/utils/addonProfileLua'

const CLASS_DATA_ROOT = 'MagguuUI_Data/Classes'

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

export function classifyCanonicalPushChanges(
  changedPaths: ReadonlySet<string>,
  options: { forced: boolean, commitCount: number },
) {
  const requireFullRefresh = options.forced || options.commitCount === 0
  return {
    requireFullRefresh,
    addonsTouched: requireFullRefresh || [...changedPaths].some(path => path.startsWith(`${ADDON_DATA_ROOT}/`)),
    classesTouched: requireFullRefresh || [...changedPaths].some(path => path.startsWith(`${CLASS_DATA_ROOT}/`)),
    tocTouched: requireFullRefresh || changedPaths.has('MagguuUI.toc'),
    changelogTouched: requireFullRefresh || changedPaths.has('CHANGELOG.md'),
  }
}
