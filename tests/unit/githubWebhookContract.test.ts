import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import test from 'node:test'
import {
  classifyCanonicalPushChanges,
  verifyGitHubWebhookSignature,
  workflowRunHistoryStatus,
} from '../../server/utils/githubWebhookContract'

test('verifies the exact GitHub HMAC without accepting missing or malformed signatures', () => {
  const payload = JSON.stringify({ ref: 'refs/heads/main', after: 'a'.repeat(40) })
  const secret = 'unit-test-webhook-secret'
  const signature = `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`

  assert.equal(verifyGitHubWebhookSignature(payload, signature, secret), true)
  assert.equal(verifyGitHubWebhookSignature(`${payload} `, signature, secret), false)
  assert.equal(verifyGitHubWebhookSignature(payload, null, secret), false)
  assert.equal(verifyGitHubWebhookSignature(payload, 'sha256=short', secret), false)
})

test('workflow runs only count real failures as sync errors', () => {
  assert.equal(workflowRunHistoryStatus('success'), 'success')
  for (const value of ['failure', 'timed_out', 'startup_failure', 'action_required']) {
    assert.equal(workflowRunHistoryStatus(value), 'error')
  }
  for (const value of ['queued', 'in_progress', 'pending', 'waiting', 'requested', 'skipped', 'neutral', 'cancelled', 'stale', 'unknown', null]) {
    assert.equal(workflowRunHistoryStatus(value), 'info')
  }
})

test('classifies canonical paths independently', () => {
  const classified = classifyCanonicalPushChanges(
    new Set(['MagguuUI_Data/AddOns/BigWigs.lua', 'CHANGELOG.md']),
    { forced: false, commitCount: 1 },
  )

  assert.deepEqual(classified, {
    requireFullRefresh: false,
    addonsTouched: true,
    classesTouched: false,
    tocTouched: false,
    changelogTouched: true,
  })
})

test('force pushes and missing commit lists conservatively refresh every canonical input', () => {
  for (const options of [
    { forced: true, commitCount: 2 },
    { forced: false, commitCount: 0 },
  ]) {
    const classified = classifyCanonicalPushChanges(new Set(), options)
    assert.equal(classified.requireFullRefresh, true)
    assert.equal(classified.addonsTouched, true)
    assert.equal(classified.classesTouched, true)
    assert.equal(classified.tocTouched, true)
    assert.equal(classified.changelogTouched, true)
  }
})
