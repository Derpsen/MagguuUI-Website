<!--
  Changelog Page — newest release first, older published versions below.
-->

<template>
  <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20">
    <div v-if="isLoggedIn" class="flex justify-end mb-4">
      <NuxtLink to="/admin/content/changelog"
        class="text-xs font-medium underline underline-offset-4"
        :class="isDark ? 'text-silver-400 hover:text-white' : 'text-gray-500 hover:text-gray-950'">
        Edit Changelog
      </NuxtLink>
    </div>

    <div class="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
      <component :is="filtering ? 'h1' : 'p'" class="font-mono text-[11px] uppercase tracking-[0.16em]" :class="isDark ? 'text-brand-300' : 'text-brand-700'">Release notes</component>
      <p class="text-xs" :class="isDark ? 'text-silver-500' : 'text-gray-500'">
        Subscribe:
        <a href="/changelog/feed.xml" type="application/rss+xml" class="underline underline-offset-4" :class="isDark ? 'text-silver-300 hover:text-white' : 'text-gray-700 hover:text-gray-950'">RSS</a>
        <span aria-hidden="true"> · </span>
        <a href="/changelog/atom.xml" type="application/atom+xml" class="underline underline-offset-4" :class="isDark ? 'text-silver-300 hover:text-white' : 'text-gray-700 hover:text-gray-950'">Atom</a>
      </p>
    </div>

    <form method="get" action="/changelog" class="mt-6 border-b pb-6" :class="isDark ? 'border-white/10' : 'border-gray-200'" data-testid="changelog-filter">
      <p class="text-sm" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
        Enter the MagguuUI version you have installed to see what changed since, or narrow the list down.
      </p>
      <div class="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <div class="col-span-2 sm:col-span-4">
          <label for="cl-since" class="block text-xs font-medium" :class="isDark ? 'text-silver-300' : 'text-gray-700'">My installed version</label>
          <input id="cl-since" name="since" type="text" inputmode="text" autocomplete="off" spellcheck="false" maxlength="40"
            placeholder="12.1.6 or 12.1.6-Dev-16" :value="queryText('since')" aria-describedby="cl-since-hint"
            class="mt-1 w-full max-w-xs rounded border px-2.5 py-1.5 text-sm font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            :class="inputClass">
          <p id="cl-since-hint" class="mt-1 text-xs" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Shows every release newer than this one. Dev builds count as older than their release.</p>
        </div>
        <div>
          <label for="cl-from" class="block text-xs font-medium" :class="isDark ? 'text-silver-300' : 'text-gray-700'">From version</label>
          <input id="cl-from" name="from" type="text" autocomplete="off" spellcheck="false" maxlength="40" placeholder="12.0.20" :value="queryText('from')"
            class="mt-1 w-full rounded border px-2.5 py-1.5 text-sm font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500" :class="inputClass">
        </div>
        <div>
          <label for="cl-to" class="block text-xs font-medium" :class="isDark ? 'text-silver-300' : 'text-gray-700'">To version</label>
          <input id="cl-to" name="to" type="text" autocomplete="off" spellcheck="false" maxlength="40" placeholder="12.1.5" :value="queryText('to')"
            class="mt-1 w-full rounded border px-2.5 py-1.5 text-sm font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500" :class="inputClass">
        </div>
        <div class="col-span-2">
          <label for="cl-q" class="block text-xs font-medium" :class="isDark ? 'text-silver-300' : 'text-gray-700'">Mentions (addon or keyword)</label>
          <input id="cl-q" name="q" type="text" autocomplete="off" maxlength="80" placeholder="BigWigs" :value="queryText('q')"
            class="mt-1 w-full rounded border px-2.5 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500" :class="inputClass">
        </div>
      </div>
      <div class="mt-4 flex items-center gap-x-5 text-sm">
        <button type="submit" class="rounded border px-3 py-1.5 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          :class="isDark ? 'border-white/25 text-white hover:bg-white/5' : 'border-gray-300 text-gray-950 hover:bg-gray-50'">Show</button>
        <NuxtLink v-if="filtering || filterErrors.length" to="/changelog" class="underline underline-offset-4" :class="isDark ? 'text-silver-300 hover:text-white' : 'text-gray-700 hover:text-gray-950'">Reset</NuxtLink>
      </div>
      <p v-for="err in filterErrors" :key="err" role="alert" class="mt-3 text-sm" :class="isDark ? 'text-amber-300' : 'text-amber-800'">{{ err }}</p>
    </form>

    <p v-if="statusText" role="status" aria-live="polite" class="mt-6 text-sm" :class="isDark ? 'text-silver-300' : 'text-gray-700'" data-testid="changelog-status">{{ statusText }}</p>

    <article v-if="unreleased && !filtering" id="unreleased" class="mt-6 border-b pb-10" :class="isDark ? 'border-white/10' : 'border-gray-200'">
      <h2 class="font-mono text-2xl font-semibold tracking-tight leading-none" :class="isDark ? 'text-white' : 'text-gray-950'">
        Unreleased
      </h2>
      <p class="mt-3 text-sm" :class="isDark ? 'text-silver-500' : 'text-gray-500'">
        In the next release. Not in the current download yet.
      </p>
      <SafeHtml class="prose-custom text-sm mt-8 block" :html="renderMarkdown(unreleased.content)" />
    </article>

    <div v-if="shown.length">
      <article
        v-for="(release, index) in shown"
        :key="release.id"
        :id="publicAnchorId('release', release.version)"
        class="border-b pb-10"
        :class="[index === 0 && (!unreleased || filtering) ? 'mt-6' : 'mt-10', isDark ? 'border-white/10' : 'border-gray-200']"
      >
        <component
          :is="isCurrent(release) && !filtering ? 'h1' : 'h2'"
          class="font-mono font-semibold tracking-tight leading-none"
          :class="[
            isCurrent(release) && !filtering ? 'text-4xl sm:text-5xl' : 'text-2xl',
            isDark ? 'text-white' : 'text-gray-950',
          ]"
        >
          {{ release.version }}
        </component>
        <p class="mt-3 text-sm" :class="isDark ? 'text-silver-500' : 'text-gray-500'">
          {{ formatDate(release.publishedAt) }}
          <template v-if="isCurrent(release)">
            <span class="px-2" :class="isDark ? 'text-white/20' : 'text-gray-300'">·</span>
            Current release
          </template>
        </p>
        <div class="release-content relative mt-8"
          :class="{ 'release-content--collapsed': !filtering && isLongRelease(release.content) && !isReleaseExpanded(release.id) }">
          <SafeHtml class="prose-custom text-sm" :html="renderMarkdown(release.content)" />
          <div v-if="!filtering && isLongRelease(release.content) && !isReleaseExpanded(release.id)"
            aria-hidden="true"
            class="release-fade"
            :class="isDark ? 'release-fade--dark' : 'release-fade--light'" />
        </div>
        <div class="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <button v-if="!filtering && isLongRelease(release.content)"
            class="font-medium underline underline-offset-4"
            :class="isDark ? 'text-white' : 'text-gray-950'"
            @click="toggleRelease(release.id)">
            {{ isReleaseExpanded(release.id) ? 'Show less' : 'Show more' }}
          </button>
        </div>
      </article>
    </div>

    <div v-else-if="!releases.length" class="mt-8">
      <h1 class="text-4xl font-semibold tracking-tight" :class="isDark ? 'text-white' : 'text-gray-950'">Changelog</h1>
      <p class="mt-3 text-sm" :class="isDark ? 'text-silver-400' : 'text-gray-500'">No entries yet.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { publicAnchorId } from '~/utils/publicAnchor'
import { renderMarkdownToSafeHtml } from '~/utils/richText'
import { filterChangelog } from '~/utils/changelogVersion'
const { isLoggedIn } = useAuth()
const isDark = useIsDark()
usePublicPageSeo({
  title: 'Changelog',
  description: 'MagguuUI release notes, newest first, with older versions on the same page.',
  path: '/changelog',
})
useHead({
  link: [
    { rel: 'alternate', type: 'application/rss+xml', title: 'MagguuUI release notes (RSS)', href: 'https://ui.magguu.xyz/changelog/feed.xml' },
    { rel: 'alternate', type: 'application/atom+xml', title: 'MagguuUI release notes (Atom)', href: 'https://ui.magguu.xyz/changelog/atom.xml' },
  ],
})

interface ChangelogPageEntry { id: number, version: string, content: string, contentEn?: string | null, publishedAt: string | number | null, [k: string]: unknown }
const { data: changelogData } = useFetch<{ data: ChangelogPageEntry[], meta?: { unreleased?: { id: number, version: string, content: string } | null } }>('/api/v1/changelogs')
const releases = computed<ChangelogPageEntry[]>(() => changelogData.value?.data ?? [])
// Notes for the next release; never counted as the current release.
const unreleased = computed(() => changelogData.value?.meta?.unreleased ?? null)

// Filters live in the query string (?since=12.1.6&from=&to=&q=) and are
// applied during SSR, so the plain GET form works without JavaScript and every
// result is shareable.
const route = useRoute()
function queryText(key: string): string {
  const raw = route.query[key]
  const value = Array.isArray(raw) ? raw[0] : raw
  return typeof value === 'string' ? value.slice(0, 80) : ''
}
const filterResult = computed(() => filterChangelog(releases.value, {
  since: queryText('since'),
  from: queryText('from'),
  to: queryText('to'),
  q: queryText('q'),
}))
const filtering = computed(() => filterResult.value.active)
// Filtered views are shareable but are not separate pages: keep them out of the
// index (canonical already points at /changelog). Sets meta and X-Robots-Tag.
useRobotsRule(computed(() => filtering.value ? 'noindex, follow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'))
const filterErrors = computed(() => filterResult.value.errors)
const shown = computed(() => filterResult.value.items)
const latestId = computed(() => releases.value[0]?.id)
function isCurrent(release: ChangelogPageEntry): boolean {
  return release.id === latestId.value
}
const statusText = computed(() => {
  if (!filtering.value) return ''
  const n = shown.value.length
  const since = queryText('since').trim()
  const noun = n === 1 ? 'release' : 'releases'
  if (n === 0) {
    if (since && !filterErrors.value.length && !queryText('from') && !queryText('to') && !queryText('q')) {
      return `You are up to date: ${since} is the latest release or newer.`
    }
    return 'No releases match these filters.'
  }
  return since ? `${n} ${noun} newer than ${since}, newest first.` : `${n} ${noun} match, newest first.`
})
const inputClass = computed(() => isDark.value
  ? 'border-white/20 bg-transparent text-white placeholder:text-silver-600'
  : 'border-gray-300 bg-white text-gray-950 placeholder:text-gray-400')

function renderMarkdown(text: string): string {
  return renderMarkdownToSafeHtml(text, { stripChangelogDateHeaders: true })
}
function formatDate(date: string | Date | null): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })
}

const RELEASE_COLLAPSE_CHARS = 500
const expandedReleases = ref<Set<number>>(new Set())
function isLongRelease(content: string): boolean {
  return (content?.length || 0) > RELEASE_COLLAPSE_CHARS
}
function isReleaseExpanded(id: number): boolean {
  return expandedReleases.value.has(id)
}
function toggleRelease(id: number) {
  const next = new Set(expandedReleases.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedReleases.value = next
}
</script>

<style scoped>
.release-content--collapsed {
  max-height: 280px;
  overflow: hidden;
}
.release-fade {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 64px;
  pointer-events: none;
}
.release-fade--dark {
  background: linear-gradient(to bottom, rgba(10, 20, 40, 0), rgba(10, 20, 40, 0.55) 70%, rgba(10, 20, 40, 0.78) 100%);
}
.release-fade--light {
  background: linear-gradient(to bottom, rgba(248, 250, 252, 0), rgba(241, 245, 249, 0.45) 55%, rgba(236, 242, 247, 0.72) 100%);
}
</style>
