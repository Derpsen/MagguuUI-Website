/**
 * Signed GitHub webhook integration for the configured AddOn repository.
 * Push imports are bound to refs/heads/main and every file is fetched from
 * the immutable `after` commit so concurrent pushes cannot mix snapshots.
 */

import { db, sqlite } from '~/server/database'
import { syncHistory } from '~/server/database/schema'
import { ADDON_DATA_ROOT } from '~/server/utils/addonProfileLua'
import { CLASS_DATA_ROOT } from '~/server/utils/classLayoutSync'
import {
  applyAddonLuaSnapshot,
  applyClassLuaSnapshot,
  fetchAddonLuaSnapshot,
  fetchClassLuaSnapshot,
  type GithubDataSyncResult,
} from '~/server/utils/githubDataSnapshot'
import {
  fetchGitHubTextFile,
  githubRepoMatches,
  isGitHubCommitSha,
  parseGitHubRepo,
} from '~/server/utils/github'
import { checkRateLimit, getClientIp } from '~/server/utils/rateLimit'
import {
  classifyCanonicalPushChanges,
  verifyGitHubWebhookSignature,
} from '~/server/utils/githubWebhookContract'
import { syncAddonChangelog } from '~/server/utils/syncAddonChangelog'
import { syncAddonsFromToc } from '~/server/utils/syncAddons'
import { createSyncChangelog } from '~/server/utils/syncChangelog'
import { upsertSetting } from '~/server/utils/settings'

const MAIN_REF = 'refs/heads/main'
const MAX_WEBHOOK_BODY_BYTES = 2 * 1024 * 1024
const MAX_TOC_BYTES = 256 * 1024
const MAX_CHANGELOG_BYTES = 4 * 1024 * 1024
const MAX_CHANGED_PATHS = 4096

type SyncResult = GithubDataSyncResult | {
  file: string
  addon: string
  status: `error: ${string}`
}

interface PushCommit {
  added?: unknown
  modified?: unknown
  removed?: unknown
}

interface WebhookBody {
  zen?: string
  action?: string
  after?: string
  forced?: boolean
  ref?: string
  repository?: { full_name?: string }
  release?: {
    tag_name?: string
    name?: string
  }
  commits?: PushCommit[]
  pusher?: { name?: string }
  workflow_run?: {
    name?: string
    status?: string
    conclusion?: string
  }
}

function collectChangedPaths(commits: PushCommit[]) {
  const paths = new Set<string>()
  for (const commit of commits) {
    for (const field of [commit.added, commit.modified, commit.removed]) {
      if (!Array.isArray(field)) continue
      for (const value of field) {
        if (typeof value !== 'string') continue
        paths.add(value)
        if (paths.size > MAX_CHANGED_PATHS) {
          throw createError({ statusCode: 413, message: 'Push contains too many changed paths' })
        }
      }
    }
  }
  return paths
}

function countResults(results: SyncResult[]) {
  const created = results.filter(result => result.status === 'created').length
  const updated = results.filter(result => result.status === 'updated').length
  const unchanged = results.filter(result => result.status === 'unchanged').length
  const errors = results.filter(result => result.status.startsWith('error:')).length
  return { created, updated, unchanged, errors, imported: created + updated }
}

async function syncAddonSnapshot(options: {
  owner: string
  repo: string
  ref: string
  token?: string
}) {
  const results: SyncResult[] = []
  try {
    const sources = await fetchAddonLuaSnapshot({ ...options, maxEntries: 128 })
    const transactionResults: GithubDataSyncResult[] = []
    sqlite.transaction(() => {
      applyAddonLuaSnapshot(sources, transactionResults)
    })()
    results.push(...transactionResults)
  } catch (error: unknown) {
    results.push({
      file: ADDON_DATA_ROOT,
      addon: 'AddOn profiles',
      status: `error: ${error instanceof Error ? error.message : 'unknown'}`,
    })
  }
  return results
}

async function syncClassSnapshot(options: {
  owner: string
  repo: string
  ref: string
  token?: string
}) {
  const results: SyncResult[] = []
  try {
    const sources = await fetchClassLuaSnapshot(options)
    const transactionResults: GithubDataSyncResult[] = []
    sqlite.transaction(() => {
      applyClassLuaSnapshot(sources, transactionResults)
    })()
    results.push(...transactionResults)
  } catch (error: unknown) {
    results.push({
      file: CLASS_DATA_ROOT,
      addon: 'Class layouts',
      status: `error: ${error instanceof Error ? error.message : 'unknown'}`,
    })
  }
  return results
}

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'private, no-store, no-cache, must-revalidate')
  setResponseHeader(event, 'Pragma', 'no-cache')
  setResponseHeader(event, 'X-Robots-Tag', 'noindex, nofollow, noarchive')

  const config = useRuntimeConfig()
  const webhookSecret = config.githubWebhookSecret || ''
  const eventType = getHeader(event, 'x-github-event') || ''
  const signature = getHeader(event, 'x-hub-signature-256') || null
  if (!webhookSecret) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const ip = getClientIp(event)
  const rateLimit = checkRateLimit(`webhook:${ip}`, 60, 60 * 1000, 5 * 60 * 1000)
  if (!rateLimit.allowed) {
    setResponseHeader(event, 'Retry-After', rateLimit.retryAfter)
    throw createError({ statusCode: 429, message: 'Too many webhook requests' })
  }

  const contentLength = Number(getHeader(event, 'content-length') || 0)
  if (contentLength && contentLength > MAX_WEBHOOK_BODY_BYTES) {
    throw createError({ statusCode: 413, message: 'Webhook payload too large' })
  }

  const rawBody = await readRawBody(event, 'utf8') || ''
  if (Buffer.byteLength(rawBody) > MAX_WEBHOOK_BODY_BYTES) {
    throw createError({ statusCode: 413, message: 'Webhook payload too large' })
  }
  if (!verifyGitHubWebhookSignature(rawBody, signature, webhookSecret)) {
    db.insert(syncHistory).values({
      triggerSource: `webhook-${eventType || 'unknown'}`,
      status: 'error',
      details: 'Invalid webhook signature',
    }).run()
    throw createError({ statusCode: 401, message: 'Invalid signature' })
  }

  let body: WebhookBody
  try {
    body = JSON.parse(rawBody) as WebhookBody
  } catch {
    throw createError({ statusCode: 400, message: 'Invalid JSON payload' })
  }

  const repoRef = parseGitHubRepo(config.githubRepo || '')
  if (!repoRef) throw createError({ statusCode: 503, message: 'GitHub repository is not configured' })
  const configuredRepo = `${repoRef.owner}/${repoRef.repo}`
  if (!githubRepoMatches(configuredRepo, body.repository?.full_name)) {
    throw createError({ statusCode: 403, message: 'Webhook repository does not match configured repository' })
  }

  if (eventType === 'ping') {
    db.insert(syncHistory).values({
      triggerSource: 'webhook-ping',
      status: 'success',
      details: `Webhook connected: ${body.zen || 'OK'}`,
    }).run()
    return apiSuccess({ message: 'pong', repository: configuredRepo })
  }

  const token = config.githubToken || undefined
  const github = { owner: repoRef.owner, repo: repoRef.repo, token }

  if (eventType === 'release' && (body.action === 'published' || body.action === 'released')) {
    const release = body.release
    const tag = release?.tag_name || ''
    if (!release || !/^[0-9A-Za-z][0-9A-Za-z._/-]{0,127}$/.test(tag) || tag.includes('..') || tag.includes('//')) {
      throw createError({ statusCode: 400, message: 'Missing or unsafe release tag' })
    }

    const version = tag.replace(/^v/, '')
    upsertSetting('github_latest_version', version)
    upsertSetting('github_last_check', new Date().toISOString())

    let changelog: ReturnType<typeof syncAddonChangelog> | null = null
    try {
      const markdown = await fetchGitHubTextFile({
        ...github,
        path: 'CHANGELOG.md',
        ref: tag,
        maxBytes: MAX_CHANGELOG_BYTES,
      })
      changelog = syncAddonChangelog(markdown)
    } catch (error: unknown) {
      db.insert(syncHistory).values({
        triggerSource: 'webhook-release-changelog',
        status: 'error',
        details: error instanceof Error ? error.message : String(error),
      }).run()
    }

    db.insert(syncHistory).values({
      triggerSource: 'webhook-release',
      status: 'success',
      details: `Release ${tag}: ${release.name || 'Unnamed'}${changelog ? `; changelog ${JSON.stringify(changelog)}` : ''}`,
    }).run()
    return apiSuccess({ event: 'release', version, name: release.name, changelog })
  }

  if (eventType === 'push') {
    const ref = body.ref || ''
    const pusher = body.pusher?.name || 'unknown'
    const commits = Array.isArray(body.commits) ? body.commits : []
    if (ref !== MAIN_REF) {
      db.insert(syncHistory).values({
        triggerSource: 'webhook-push',
        status: 'info',
        details: `Ignored push to ${ref || '(missing ref)'} by ${pusher}`,
      }).run()
      return apiSuccess({ event: 'push', ref, handled: [], ignored: 'non-main branch' })
    }

    const snapshotSha = body.after || ''
    if (!isGitHubCommitSha(snapshotSha) || /^0+$/.test(snapshotSha)) {
      throw createError({ statusCode: 400, message: 'Push payload has an invalid after SHA' })
    }

    const changedPaths = collectChangedPaths(commits)
    // GitHub may omit the per-commit list for force pushes or very unusual
    // ref updates. Conservatively refresh every canonical input in that case.
    const {
      addonsTouched,
      classesTouched,
      tocTouched,
      changelogTouched,
    } = classifyCanonicalPushChanges(changedPaths, {
      forced: body.forced === true,
      commitCount: commits.length,
    })
    const handled: string[] = []
    const syncResults: SyncResult[] = []

    if (addonsTouched) {
      syncResults.push(...await syncAddonSnapshot({ ...github, ref: snapshotSha }))
      handled.push('addon-profiles')
    }
    if (classesTouched) {
      syncResults.push(...await syncClassSnapshot({ ...github, ref: snapshotSha }))
      handled.push('class-layouts')
    }

    let dataResult: ReturnType<typeof countResults> & { snapshotSha: string } | null = null
    if (addonsTouched || classesTouched) {
      createSyncChangelog(syncResults, 'webhook')
      dataResult = { snapshotSha, ...countResults(syncResults) }
      db.insert(syncHistory).values({
        triggerSource: 'webhook-push-autopull',
        status: dataResult.errors ? 'error' : 'success',
        details: `Push ${snapshotSha.slice(0, 12)} by ${pusher}: ${dataResult.created} created, ${dataResult.updated} updated, ${dataResult.unchanged} unchanged, ${dataResult.errors} errors`,
      }).run()
    }

    let tocResult: ReturnType<typeof syncAddonsFromToc> | null = null
    if (tocTouched) {
      try {
        const toc = await fetchGitHubTextFile({
          ...github,
          path: 'MagguuUI.toc',
          ref: snapshotSha,
          maxBytes: MAX_TOC_BYTES,
        })
        tocResult = syncAddonsFromToc(toc)
        db.insert(syncHistory).values({
          triggerSource: 'github-toc',
          status: 'success',
          details: `Snapshot ${snapshotSha.slice(0, 12)}: ${JSON.stringify(tocResult)}`,
        }).run()
        handled.push('toc')
      } catch (error: unknown) {
        db.insert(syncHistory).values({
          triggerSource: 'github-toc',
          status: 'error',
          details: error instanceof Error ? error.message : String(error),
        }).run()
      }
    }

    let changelogResult: ReturnType<typeof syncAddonChangelog> | null = null
    if (changelogTouched) {
      try {
        const markdown = await fetchGitHubTextFile({
          ...github,
          path: 'CHANGELOG.md',
          ref: snapshotSha,
          maxBytes: MAX_CHANGELOG_BYTES,
        })
        changelogResult = syncAddonChangelog(markdown)
        db.insert(syncHistory).values({
          triggerSource: 'github-changelog',
          status: 'success',
          details: `Snapshot ${snapshotSha.slice(0, 12)}: ${JSON.stringify(changelogResult)}`,
        }).run()
        handled.push('changelog')
      } catch (error: unknown) {
        db.insert(syncHistory).values({
          triggerSource: 'github-changelog',
          status: 'error',
          details: error instanceof Error ? error.message : String(error),
        }).run()
      }
    }

    if (!addonsTouched && !classesTouched && !tocTouched && !changelogTouched) {
      db.insert(syncHistory).values({
        triggerSource: 'webhook-push',
        status: 'success',
        details: `Push ${snapshotSha.slice(0, 12)} to main by ${pusher} (${commits.length} commit${commits.length === 1 ? '' : 's'})`,
      }).run()
    }

    return apiSuccess({
      event: 'push',
      ref,
      snapshotSha,
      commits: commits.length,
      handled,
      data: dataResult,
      results: syncResults,
      toc: tocResult,
      changelog: changelogResult,
    })
  }

  if (eventType === 'workflow_run') {
    const run = body.workflow_run
    const status = run?.conclusion || run?.status || 'unknown'
    const name = run?.name || 'Unknown workflow'
    db.insert(syncHistory).values({
      triggerSource: 'webhook-workflow',
      status: status === 'success' ? 'success' : 'error',
      details: `${name}: ${status}`,
    }).run()
    return apiSuccess({ event: 'workflow_run', name, status })
  }

  db.insert(syncHistory).values({
    triggerSource: `webhook-${eventType || 'unknown'}`,
    status: 'info',
    details: `Unhandled event type: ${eventType}`,
  }).run()
  return apiSuccess({ event: eventType, handled: false })
})