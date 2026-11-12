import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { describe, it } from 'node:test'
import type { ChildProcess } from 'node:child_process'
import {
  META_SYNC_CLI_DEFAULT_HEAP_MB,
  META_SYNC_CLI_HEAP_MARKER,
  attachForwardedChild,
  childExitStatus,
  metaSyncCliHeapAlreadyApplied,
  metaSyncCliReexecArgs,
  parseMetaSyncCliHeapMb,
  resolveMetaSyncCliNodeOptions,
  signalExitCode,
  stripMaxOldSpaceSize,
} from '../../server/utils/metaSyncCliHeap'
import { defaultMetaHeapLimitBytes, readMaxOldSpaceSizeMb } from '../../server/utils/blizzardMetaHeap'

describe('meta sync CLI heap options', () => {
  it('strips inherited --max-old-space-size and the underscore spelling', () => {
    assert.equal(stripMaxOldSpaceSize('--enable-source-maps --max-old-space-size=640'), '--enable-source-maps')
    assert.equal(stripMaxOldSpaceSize('--max_old_space_size=640 --enable-source-maps'), '--enable-source-maps')
    const resolved = resolveMetaSyncCliNodeOptions({
      NODE_OPTIONS: '--enable-source-maps --max-old-space-size=640',
    })
    assert.match(resolved, /--enable-source-maps/)
    assert.doesNotMatch(resolved, /max[-_]old[-_]space[-_]size/)
  })

  it('clamps NUXT_META_CLI_HEAP_MB to 64–512 instead of falling back to the default', () => {
    assert.equal(parseMetaSyncCliHeapMb({}), META_SYNC_CLI_DEFAULT_HEAP_MB)
    assert.equal(parseMetaSyncCliHeapMb({ NUXT_META_CLI_HEAP_MB: 'nope' }), META_SYNC_CLI_DEFAULT_HEAP_MB)
    assert.equal(parseMetaSyncCliHeapMb({ NUXT_META_CLI_HEAP_MB: '32' }), 64)
    assert.equal(parseMetaSyncCliHeapMb({ NUXT_META_CLI_HEAP_MB: '10' }), 64)
    assert.equal(parseMetaSyncCliHeapMb({ NUXT_META_CLI_HEAP_MB: '192' }), 192)
    assert.equal(parseMetaSyncCliHeapMb({ NUXT_META_CLI_HEAP_MB: '513' }), 512)
    assert.equal(parseMetaSyncCliHeapMb({ NUXT_META_CLI_HEAP_MB: '5120' }), 512)
  })

  it('ignores an inherited META_SYNC_CLI_HEAP_APPLIED env and requires a re-exec marker plus execArgv cap', () => {
    assert.equal(metaSyncCliHeapAlreadyApplied(['node', 'cli.mjs'], []), false)
    assert.equal(metaSyncCliHeapAlreadyApplied(['node', 'cli.mjs', META_SYNC_CLI_HEAP_MARKER], []), false)
    assert.equal(metaSyncCliHeapAlreadyApplied(['node', 'cli.mjs', META_SYNC_CLI_HEAP_MARKER], ['--max-old-space-size=192']), true)
    const args = metaSyncCliReexecArgs('/app/meta-sync-cli.mjs', ['node', '/app/meta-sync-cli.mjs', 'extra'])
    assert.equal(args[0], `--max-old-space-size=${META_SYNC_CLI_DEFAULT_HEAP_MB}`)
    assert.equal(args[1], '/app/meta-sync-cli.mjs')
    assert.equal(args[2], META_SYNC_CLI_HEAP_MARKER)
    assert.deepEqual(args.slice(3), ['extra'])
  })

  it('maps child signals to 128+n and forwards SIGTERM to the child', () => {
    assert.equal(signalExitCode('SIGTERM'), 128 + 15)
    assert.equal(signalExitCode('SIGKILL'), 128 + 9)
    assert.equal(signalExitCode('SIGABRT'), 128 + 6)
    assert.equal(childExitStatus(0, null), 0)
    assert.equal(childExitStatus(1, null), 1)
    assert.equal(childExitStatus(null, 'SIGTERM'), 143)
    assert.equal(childExitStatus(null, 'SIGKILL'), 137)
    assert.equal(childExitStatus(null, 'SIGABRT'), 134)

    const child = new EventEmitter() as EventEmitter & { kill: (s: string) => boolean, killed: boolean }
    const killed: string[] = []
    child.killed = false
    child.kill = (signal: string) => {
      killed.push(signal)
      return true
    }
    const listeners: { SIGTERM: Array<() => void>, SIGINT: Array<() => void> } = { SIGTERM: [], SIGINT: [] }
    let exitCode: number | null = null
    attachForwardedChild(child as unknown as ChildProcess, {
      on: (event, listener) => { listeners[event].push(listener) },
      off: (event, listener) => { listeners[event] = listeners[event].filter(fn => fn !== listener) },
      exit: (code) => { exitCode = code },
    })
    const term = listeners.SIGTERM[0]
    assert.ok(term)
    term()
    assert.deepEqual(killed, ['SIGTERM'])
    child.emit('exit', null, 'SIGTERM')
    assert.equal(exitCode, 143)
    child.emit('error', new Error('spawn failed'))
  })
})

describe('meta heap limit prefers the old-space cap', () => {
  it('reads hyphen and underscore flags from execArgv then NODE_OPTIONS', () => {
    assert.equal(readMaxOldSpaceSizeMb(['--max-old-space-size=192'], '--max-old-space-size=640'), 192)
    assert.equal(readMaxOldSpaceSizeMb([], '--enable-source-maps --max_old_space_size=256'), 256)
    assert.equal(readMaxOldSpaceSizeMb([], ''), null)
  })

  it('caps the guard ceiling at --max-old-space-size when that is smaller than V8 heap_size_limit', () => {
    const bytes = defaultMetaHeapLimitBytes({ NODE_OPTIONS: '--max-old-space-size=192' }, [])
    assert.equal(bytes, 192 * 1024 * 1024)
  })
})
