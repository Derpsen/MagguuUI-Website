<!--
  Changelog Page — Release timeline with aggregated auto-syncs + month headers
-->

<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
    <!-- Admin Edit Button -->
    <div v-if="isLoggedIn" class="flex justify-end mb-4 fade-in">
      <NuxtLink to="/admin/content/changelog"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
        :class="isDark ? 'bg-white/5 text-silver-400 hover:text-white hover:bg-white/10 border border-brand-400/15' : 'bg-gray-100 text-gray-500 hover:text-gray-900 hover:bg-gray-200 border border-gray-200'">
        <UIcon name="i-heroicons-pencil-square" class="w-3.5 h-3.5" />
        Edit Changelog
      </NuxtLink>
    </div>

    <!-- Header -->
    <div class="text-center mb-10 fade-in heading-glow">
      <h1 class="text-4xl sm:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
        <UIcon name="i-heroicons-clock" class="w-8 h-8 text-brand-400 flex-shrink-0" />
        <span class="text-gradient">Changelog</span>
      </h1>
      <p class="text-lg max-w-xl mx-auto" :class="isDark ? 'text-silver-500' : 'text-gray-500'">
        Every update, improvement, and fix — tracked so you always know what changed.
      </p>
    </div>

    <!-- Stats strip -->
    <div v-if="allEntries.length" class="flex items-center justify-center gap-6 sm:gap-10 mb-8 fade-in fade-in-delay-1">
      <div class="text-center">
        <div class="text-2xl sm:text-3xl font-extrabold text-gradient leading-none">{{ releaseCount }}</div>
        <div class="mt-1 text-xs uppercase tracking-wider font-medium" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Releases</div>
      </div>
      <div class="h-8 w-px" :class="isDark ? 'bg-white/8' : 'bg-gray-200'" />
      <div class="text-center">
        <div class="text-2xl sm:text-3xl font-extrabold text-gradient leading-none">{{ syncCount }}</div>
        <div class="mt-1 text-xs uppercase tracking-wider font-medium" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Syncs</div>
      </div>
      <div class="h-8 w-px" :class="isDark ? 'bg-white/8' : 'bg-gray-200'" />
      <div class="text-center">
        <div class="text-2xl sm:text-3xl font-extrabold text-gradient leading-none">{{ lastUpdatedRelative }}</div>
        <div class="mt-1 text-xs uppercase tracking-wider font-medium" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Last update</div>
      </div>
    </div>

    <!-- Filter pills -->
    <div v-if="allEntries.length" class="flex items-center justify-center gap-1.5 mb-10 fade-in fade-in-delay-2">
      <button
        v-for="f in filters" :key="f.value"
        class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border"
        :class="activeFilter === f.value
          ? (isDark ? 'bg-brand-400/15 border-brand-400/30 text-brand-300 shadow-[0_0_12px_rgba(59,139,255,0.12)]' : 'bg-blue-50 border-blue-300 text-blue-700')
          : (isDark ? 'bg-white/[0.03] border-white/8 text-silver-400 hover:text-white hover:border-white/15' : 'bg-white border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300')"
        @click="setFilter(f.value)">
        <UIcon :name="f.icon" class="w-3.5 h-3.5" />
        {{ f.label }}
        <span class="ml-0.5 opacity-60">{{ f.count }}</span>
      </button>
    </div>

    <!-- Hero: Latest Release -->
    <div v-if="latestRelease && activeFilter !== 'syncs'" class="mb-12 fade-in fade-in-delay-2">
      <div class="relative overflow-hidden rounded-2xl border p-7 sm:p-8"
        :class="isDark
          ? 'bg-gradient-to-br from-brand-400/8 via-brand-400/4 to-transparent border-brand-400/20'
          : 'bg-gradient-to-br from-blue-50 via-blue-50/40 to-white border-blue-200'">
        <!-- ambient glow -->
        <div aria-hidden="true" class="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl opacity-40"
          :class="isDark ? 'bg-brand-400/20' : 'bg-blue-300/25'" />

        <div class="relative flex flex-col sm:flex-row sm:items-start gap-5 sm:gap-7">
          <div class="flex-shrink-0">
            <div class="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] font-semibold mb-2"
              :class="isDark ? 'text-brand-300' : 'text-blue-600'">
              <span class="relative flex w-2 h-2">
                <span class="absolute inline-flex w-full h-full rounded-full animate-ping opacity-60"
                  :class="isDark ? 'bg-brand-400' : 'bg-blue-500'" />
                <span class="relative inline-flex w-2 h-2 rounded-full"
                  :class="isDark ? 'bg-brand-400' : 'bg-blue-500'" />
              </span>
              Latest Release
            </div>
            <div class="font-mono text-3xl sm:text-4xl font-bold leading-none"
              :class="isDark ? 'text-white' : 'text-gray-900'">
              {{ latestRelease.version }}
            </div>
            <div class="mt-2 text-xs font-medium" :class="isDark ? 'text-silver-500' : 'text-gray-500'">
              {{ formatDate(latestRelease.publishedAt) }}
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <div class="release-content relative"
              :class="{ 'release-content--collapsed': isLongRelease(latestRelease.content) && !isReleaseExpanded(latestRelease.id) }">
              <div class="prose prose-sm max-w-none prose-custom"
                :class="isDark ? 'prose-invert prose-blue' : ''"
                v-html="renderMarkdown(latestRelease.content)" />
              <div v-if="isLongRelease(latestRelease.content) && !isReleaseExpanded(latestRelease.id)"
                aria-hidden="true"
                class="release-fade"
                :class="isDark ? 'release-fade--dark' : 'release-fade--light'" />
            </div>
            <div class="mt-4 flex flex-wrap items-center gap-3">
              <button v-if="isLongRelease(latestRelease.content)"
                class="inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
                :class="isDark ? 'text-brand-300 hover:text-white' : 'text-blue-600 hover:text-blue-800'"
                @click="toggleRelease(latestRelease.id)">
                <UIcon :name="isReleaseExpanded(latestRelease.id) ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'" class="w-3.5 h-3.5" />
                {{ isReleaseExpanded(latestRelease.id) ? 'Show less' : 'Show more' }}
              </button>
              <span v-if="isLongRelease(latestRelease.content)" class="text-xs" :class="isDark ? 'text-silver-600' : 'text-gray-300'">·</span>
              <a :href="githubChangelogUrl" target="_blank" rel="noopener noreferrer"
                class="inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
                :class="isDark ? 'text-silver-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'">
                <UIcon name="i-simple-icons-github" class="w-3.5 h-3.5" />
                View full changelog on GitHub
                <UIcon name="i-heroicons-arrow-top-right-on-square" class="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Timeline (grouped by month > day) -->
    <div v-if="visibleMonths.length" class="relative">
      <!-- Vertical line -->
      <div aria-hidden="true" class="absolute left-[18px] sm:left-[22px] top-12 bottom-4 w-px"
        :class="isDark ? 'bg-brand-400/10' : 'bg-blue-100'" />

      <div class="space-y-12">
        <section v-for="(month, monthIdx) in visibleMonths" :key="month.monthKey"
          :ref="el => observe(el as HTMLElement)"
          class="relative scroll-reveal">
          <!-- Month header -->
          <div class="pl-12 sm:pl-14 mb-6">
            <div class="flex items-center gap-3">
              <h2 class="text-xl sm:text-2xl font-bold tracking-tight"
                :class="isDark ? 'text-white' : 'text-gray-900'">
                {{ month.monthLabel }}
              </h2>
              <div class="flex-1 h-px"
                :class="isDark ? 'bg-gradient-to-r from-brand-400/15 via-brand-400/8 to-transparent' : 'bg-gradient-to-r from-blue-200 via-blue-100 to-transparent'" />
              <span class="text-xs font-medium whitespace-nowrap" :class="isDark ? 'text-silver-500' : 'text-gray-400'">
                {{ month.entryCount }} {{ month.entryCount === 1 ? 'entry' : 'entries' }}
              </span>
            </div>
          </div>

          <!-- Day groups -->
          <div class="space-y-5">
            <div v-for="(group, groupIdx) in month.groups" :key="group.dateKey"
              class="group relative pl-12 sm:pl-14">

              <!-- Timeline dot: differentiated by entry type -->
              <div class="absolute left-[12px] sm:left-[16px] top-5 w-3 h-3 rounded-full ring-4 transition-all"
                :class="dotClasses(group)" />

              <!-- Release card (one per version) -->
              <template v-if="group.kind === 'release'">
                <article v-for="entry in group.entries" :key="entry.id"
                  class="glass-card rounded-2xl p-6 sm:p-7 transition-all group-hover:-translate-y-0.5"
                  :class="isDark
                    ? 'group-hover:border-brand-400/25 group-hover:shadow-lg group-hover:shadow-brand-400/10'
                    : 'group-hover:border-blue-300 group-hover:shadow-lg group-hover:shadow-blue-100'">
                  <header class="flex flex-wrap items-center gap-3 mb-4">
                    <span class="version-badge">{{ entry.version }}</span>
                    <span v-if="monthIdx === 0 && groupIdx === 0 && !hasLoadedMore"
                      class="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full"
                      :class="isDark ? 'bg-emerald-400/15 text-emerald-300 border border-emerald-400/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'">
                      <span class="w-1.5 h-1.5 rounded-full bg-current" />
                      Latest
                    </span>
                    <span class="ml-auto text-xs font-medium" :class="isDark ? 'text-silver-500' : 'text-gray-500'">
                      {{ group.dateFormatted }}
                    </span>
                  </header>
                  <div class="release-content relative"
                    :class="{ 'release-content--collapsed': isLongRelease(entry.content) && !isReleaseExpanded(entry.id) }">
                    <div class="prose prose-sm max-w-none prose-custom"
                      :class="isDark ? 'prose-invert prose-blue' : ''"
                      v-html="renderMarkdown(entry.content)" />
                    <div v-if="isLongRelease(entry.content) && !isReleaseExpanded(entry.id)"
                      aria-hidden="true"
                      class="release-fade"
                      :class="isDark ? 'release-fade--dark' : 'release-fade--light'" />
                  </div>
                  <div class="mt-4 flex flex-wrap items-center gap-3">
                    <button v-if="isLongRelease(entry.content)"
                      class="inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
                      :class="isDark ? 'text-brand-300 hover:text-white' : 'text-blue-600 hover:text-blue-800'"
                      @click="toggleRelease(entry.id)">
                      <UIcon :name="isReleaseExpanded(entry.id) ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'" class="w-3.5 h-3.5" />
                      {{ isReleaseExpanded(entry.id) ? 'Show less' : 'Show more' }}
                    </button>
                    <span v-if="isLongRelease(entry.content)" class="text-xs" :class="isDark ? 'text-silver-600' : 'text-gray-300'">·</span>
                    <a :href="githubChangelogUrl" target="_blank" rel="noopener noreferrer"
                      class="inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
                      :class="isDark ? 'text-silver-500 hover:text-silver-300' : 'text-gray-400 hover:text-gray-700'">
                      <UIcon name="i-simple-icons-github" class="w-3.5 h-3.5" />
                      View on GitHub
                      <UIcon name="i-heroicons-arrow-top-right-on-square" class="w-3 h-3" />
                    </a>
                  </div>
                </article>
              </template>

              <!-- Sync card (aggregated per day) -->
              <article v-else
                class="rounded-xl p-5 sm:p-6 border transition-all"
                :class="isDark
                  ? 'bg-white/[0.02] border-white/5 group-hover:border-white/10 group-hover:bg-white/[0.03]'
                  : 'bg-gray-50/60 border-gray-200/70 group-hover:border-gray-300 group-hover:bg-white'">
                <header class="flex items-center gap-2.5 mb-3">
                  <span class="inline-flex items-center justify-center w-6 h-6 rounded-lg"
                    :class="isDark ? 'bg-brand-400/10 text-brand-300' : 'bg-blue-50 text-blue-600'">
                    <UIcon name="i-heroicons-arrow-path" class="w-3.5 h-3.5" />
                  </span>
                  <span class="text-sm font-semibold" :class="isDark ? 'text-silver-200' : 'text-gray-700'">
                    Addon sync
                  </span>
                  <span class="text-xs" :class="isDark ? 'text-silver-500' : 'text-gray-400'">·</span>
                  <span class="text-xs font-medium" :class="isDark ? 'text-silver-500' : 'text-gray-500'">
                    {{ group.dateFormatted }}
                  </span>
                  <span class="ml-auto text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full"
                    :class="isDark ? 'bg-white/5 text-silver-400' : 'bg-gray-100 text-gray-500'">
                    {{ group.entries.length }} {{ group.entries.length === 1 ? 'update' : 'updates' }}
                  </span>
                </header>
                <div class="prose prose-sm max-w-none prose-custom sync-prose"
                  :class="isDark ? 'prose-invert prose-blue' : ''"
                  v-html="renderMarkdown(aggregateSyncContent(group.entries))" />
              </article>
            </div>
          </div>
        </section>
      </div>

      <!-- Load More -->
      <div v-if="hasMore" class="text-center mt-12">
        <button
          class="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-all border"
          :class="isDark
            ? 'bg-white/[0.03] border-white/8 text-silver-300 hover:text-white hover:bg-white/[0.06] hover:border-white/15'
            : 'bg-white border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 hover:border-gray-300 shadow-sm'"
          @click="loadMore">
          <UIcon name="i-heroicons-arrow-down" class="w-4 h-4" />
          Load older entries
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!allEntries.length" class="glass-card rounded-2xl p-16 text-center">
      <UIcon name="i-heroicons-document-text" class="w-12 h-12 mx-auto mb-4" :class="isDark ? 'text-silver-700/50' : 'text-gray-300'" />
      <p :class="isDark ? 'text-silver-400' : 'text-gray-500'">No entries yet.</p>
    </div>

    <!-- Filter produced empty result -->
    <div v-else class="text-center py-16">
      <UIcon name="i-heroicons-funnel" class="w-10 h-10 mx-auto mb-3" :class="isDark ? 'text-silver-700/50' : 'text-gray-300'" />
      <p class="text-sm mb-4" :class="isDark ? 'text-silver-400' : 'text-gray-500'">No entries match this filter.</p>
      <button
        class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border"
        :class="isDark ? 'bg-white/[0.03] border-white/8 text-silver-300 hover:text-white' : 'bg-white border-gray-200 text-gray-600 hover:text-gray-900'"
        @click="setFilter('all')">
        Show all entries
      </button>
    </div>

    <!-- Bottom CTA -->
    <div class="text-center mt-14 pt-6 border-t fade-in"
      :class="isDark ? 'border-brand-400/10' : 'border-gray-200'">
      <p class="text-sm" :class="isDark ? 'text-silver-500' : 'text-gray-500'">
        Ready to try the latest version? Head over to the
        <NuxtLink to="/strings" class="text-brand-400 hover:underline">Import Strings</NuxtLink>
        page and grab the newest profiles.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { renderMarkdownToSafeHtml } from '~/utils/richText'
const { isLoggedIn } = useAuth()
const isDark = useIsDark()
const { observe } = useScrollReveal()
const siteSettings = usePublicSiteSettings()
const githubChangelogUrl = computed(() => {
  const base = (siteSettings.value?.github_url || 'https://github.com/Derpsen/MagguuUI').replace(/\/$/, '')
  return `${base}/blob/main/CHANGELOG.md`
})
await usePublicPageSeo({
  title: 'Changelog',
  description: 'All updates and changes to MagguuUI import strings, packages, and setup guidance.',
  path: '/changelog',
})

interface ChangelogPageEntry { id: number, version: string, content: string, contentEn?: string | null, publishedAt: string | number | null, [k: string]: unknown }
const { data: changelogData } = await useFetch<{ data: ChangelogPageEntry[] }>('/api/v1/changelogs')
const allEntries = computed<ChangelogPageEntry[]>(() => changelogData.value?.data || [])

function renderMarkdown(text: string): string {
  return renderMarkdownToSafeHtml(text, { stripChangelogDateHeaders: true })
}
function formatDate(date: string | Date | null): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })
}
function toDateKey(date: string | Date | null): string {
  if (!date) return '1970-01-01'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function toMonthKey(date: string | Date | null): string {
  if (!date) return '1970-01'
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function formatMonth(date: string | Date | null): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// An entry is a "release" iff its version looks like a real semver (v1.2.3 or 1.2.3).
// Anything else (auto, "Sync 2026-04-22", etc.) is treated as a sync.
function isReleaseVersion(v: string | null | undefined): boolean {
  if (!v) return false
  return /^v?\d+\.\d+/.test(v.trim())
}

// Release notes can balloon (multiple Added/Changed/Fixed sections).
// Collapse by default above this threshold; show a "Show more" toggle.
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

// Strip **Addon Profile:** / **WowUp String:** / similar prefixes so aggregated
// sync cards read as a clean list instead of repeating the type every line.
function aggregateSyncContent(entries: ChangelogPageEntry[]): string {
  const seen = new Set<string>()
  const lines: string[] = []
  for (const e of entries) {
    const raw = (e.content || '').split('\n')
    for (const line of raw) {
      const trimmed = line.trim()
      if (!trimmed) continue
      if (seen.has(trimmed)) continue
      seen.add(trimmed)
      lines.push(trimmed)
    }
  }
  return lines.join('\n')
}

// Relative time label — short, for the stats strip.
function relativeTime(date: string | Date | null): string {
  if (!date) return '—'
  const ts = new Date(date).getTime()
  const diff = Date.now() - ts
  const day = 86400000
  if (diff < day) return 'today'
  if (diff < day * 2) return '1d ago'
  const days = Math.floor(diff / day)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return months === 1 ? '1mo ago' : `${months}mo ago`
}

// Filter state
type FilterKey = 'all' | 'releases' | 'syncs'
const activeFilter = ref<FilterKey>('all')
function setFilter(f: FilterKey) {
  activeFilter.value = f
  visibleMonthCount.value = MONTH_PAGE_SIZE
  hasLoadedMore.value = false
}

const releaseCount = computed(() => allEntries.value.filter(e => isReleaseVersion(e.version)).length)
const syncCount = computed(() => allEntries.value.filter(e => !isReleaseVersion(e.version)).length)
const lastUpdatedRelative = computed(() => {
  const first = allEntries.value[0]
  return first ? relativeTime(first.publishedAt) : '—'
})

const filters = computed<{ value: FilterKey, label: string, icon: string, count: number }[]>(() => [
  { value: 'all', label: 'All', icon: 'i-heroicons-squares-2x2', count: allEntries.value.length },
  { value: 'releases', label: 'Releases', icon: 'i-heroicons-sparkles', count: releaseCount.value },
  { value: 'syncs', label: 'Syncs', icon: 'i-heroicons-arrow-path', count: syncCount.value },
])

const filteredEntries = computed(() => {
  if (activeFilter.value === 'releases') return allEntries.value.filter(e => isReleaseVersion(e.version))
  if (activeFilter.value === 'syncs') return allEntries.value.filter(e => !isReleaseVersion(e.version))
  return allEntries.value
})

// Latest release for hero card (always pulled from full dataset, not from filtered view)
const latestRelease = computed(() => allEntries.value.find(e => isReleaseVersion(e.version)) || null)

// Day groups — split releases and syncs into separate groups so releases keep
// their own card per version, while syncs merge into a single card per day.
interface DayGroup {
  dateKey: string
  dateFormatted: string
  kind: 'release' | 'sync'
  entries: ChangelogPageEntry[]
}
interface MonthGroup {
  monthKey: string
  monthLabel: string
  entryCount: number
  groups: DayGroup[]
}

const monthGroups = computed<MonthGroup[]>(() => {
  const entries = filteredEntries.value
  if (!entries.length) return []

  // dayKey → { release: [entries], sync: [entries] }
  const byDay = new Map<string, { release: ChangelogPageEntry[], sync: ChangelogPageEntry[], date: string | number | null }>()
  const dayOrder: string[] = []
  for (const e of entries) {
    const key = toDateKey(e.publishedAt)
    if (!byDay.has(key)) {
      byDay.set(key, { release: [], sync: [], date: e.publishedAt })
      dayOrder.push(key)
    }
    const bucket = byDay.get(key)!
    if (isReleaseVersion(e.version)) bucket.release.push(e)
    else bucket.sync.push(e)
  }

  // Build per-day groups — releases first, then aggregated sync
  const dayGroups: DayGroup[] = []
  for (const key of dayOrder) {
    const b = byDay.get(key)!
    const dateFormatted = formatDate(b.date)
    if (b.release.length) dayGroups.push({ dateKey: key, dateFormatted, kind: 'release', entries: b.release })
    if (b.sync.length) dayGroups.push({ dateKey: key, dateFormatted, kind: 'sync', entries: b.sync })
  }

  // Exclude the latest release from the timeline — it's shown in the hero card
  const heroId = latestRelease.value?.id
  let timelineGroups = dayGroups
  if (heroId != null && activeFilter.value !== 'syncs') {
    timelineGroups = dayGroups
      .map(g => g.kind === 'release' ? { ...g, entries: g.entries.filter(e => e.id !== heroId) } : g)
      .filter(g => g.entries.length > 0)
  }

  // Group days by month
  const months = new Map<string, MonthGroup>()
  const monthOrder: string[] = []
  for (const g of timelineGroups) {
    const firstEntry = g.entries[0]!
    const mKey = toMonthKey(firstEntry.publishedAt as string | Date | null)
    if (!months.has(mKey)) {
      months.set(mKey, {
        monthKey: mKey,
        monthLabel: formatMonth(firstEntry.publishedAt as string | Date | null),
        entryCount: 0,
        groups: [],
      })
      monthOrder.push(mKey)
    }
    const m = months.get(mKey)!
    m.groups.push(g)
    m.entryCount += g.entries.length
  }

  return monthOrder.map(k => months.get(k)!)
})

// Pagination by month
const MONTH_PAGE_SIZE = 3
const visibleMonthCount = ref(MONTH_PAGE_SIZE)
const hasLoadedMore = ref(false)
const visibleMonths = computed(() => monthGroups.value.slice(0, visibleMonthCount.value))
const hasMore = computed(() => monthGroups.value.length > visibleMonthCount.value)
function loadMore() {
  visibleMonthCount.value += MONTH_PAGE_SIZE
  hasLoadedMore.value = true
}

function dotClasses(group: DayGroup): string {
  if (group.kind === 'release') {
    return isDark.value
      ? 'bg-brand-400 ring-brand-950 shadow-[0_0_10px_rgba(59,139,255,0.45)]'
      : 'bg-blue-500 ring-white shadow-[0_0_10px_rgba(37,99,235,0.35)]'
  }
  return isDark.value
    ? 'bg-silver-600 ring-brand-950 group-hover:bg-brand-400/70 group-hover:ring-brand-400/15'
    : 'bg-gray-300 ring-white group-hover:bg-blue-400 group-hover:ring-blue-50'
}
</script>

<style scoped>
/* Tighten bullet lists inside aggregated sync cards */
.sync-prose :deep(ul) { margin: 0; padding-left: 1.1em; }
.sync-prose :deep(li) { margin-bottom: 0.15em; }
.sync-prose :deep(p) { margin: 0; }

/* Collapsible long release notes */
.release-content--collapsed {
  max-height: 280px;
  overflow: hidden;
}
.release-fade {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 90px;
  pointer-events: none;
}
.release-fade--dark {
  background: linear-gradient(to bottom, rgba(10, 20, 40, 0), rgba(10, 20, 40, 0.95) 85%);
}
.release-fade--light {
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.98) 85%);
}
</style>
