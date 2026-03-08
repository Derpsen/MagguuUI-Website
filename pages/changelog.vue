<!--
  Changelog Page — Version history with timeline design + pagination
-->

<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
    <!-- Admin Edit Button -->
    <div v-if="isLoggedIn" class="flex justify-end mb-4 fade-in">
      <NuxtLink to="/admin/content/changelog"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
        :class="isDark ? 'bg-white/5 text-silver-400 hover:text-white hover:bg-white/10 border border-brand-400/15' : 'bg-gray-100 text-gray-500 hover:text-gray-900 hover:bg-gray-200 border border-gray-200'">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
        Edit Changelog
      </NuxtLink>
    </div>

    <!-- Header -->
    <div class="text-center mb-14 fade-in heading-glow">
      <h1 class="text-4xl sm:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
        <svg class="w-8 h-8 text-brand-400 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="text-gradient">Changelog</span>
      </h1>
      <p :class="isDark ? 'text-silver-500' : 'text-gray-500'" class="text-lg">What's new in MagguuUI?</p>
    </div>

    <!-- Section Divider -->
    <div class="section-divider mb-10" />

    <!-- Timeline (grouped by date) -->
    <div v-if="visibleGroups?.length" class="relative">
      <!-- Vertical line -->
      <div class="absolute left-[18px] sm:left-[22px] top-2 bottom-2 w-px"
        :class="isDark ? 'bg-brand-400/10' : 'bg-blue-100'" />

      <div class="space-y-6">
        <div v-for="(group, groupIdx) in visibleGroups" :key="group.dateKey"
          :ref="el => observe(el as HTMLElement)"
          class="group relative pl-12 sm:pl-14">
          <!-- Timeline dot (per date group) — gray default, glow on hover -->
          <div class="absolute left-[12px] sm:left-[16px] top-7 w-3 h-3 rounded-full ring-4 transition-all"
            :class="isDark
              ? 'bg-silver-600 ring-brand-950 group-hover:bg-brand-400 group-hover:ring-brand-400/20 group-hover:shadow-[0_0_8px_rgba(59,139,255,0.3)]'
              : 'bg-gray-300 ring-white group-hover:bg-blue-500 group-hover:ring-blue-100 group-hover:shadow-[0_0_8px_rgba(37,99,235,0.3)]'" />

          <!-- Date Group Card -->
          <div class="glass-card rounded-2xl p-6 sm:p-7 transition-all"
            :class="isDark ? 'group-hover:border-brand-400/15 group-hover:shadow-lg group-hover:shadow-brand-400/5' : 'group-hover:border-blue-200 group-hover:shadow-lg group-hover:shadow-blue-100'">

            <!-- Date Header -->
            <div class="flex items-center gap-3 mb-5">
              <span class="text-sm font-medium"
                :class="isDark ? 'text-silver-400' : 'text-gray-500'">
                {{ group.dateFormatted }}
              </span>
              <span v-if="groupIdx === 0 && !hasLoadedMore"
                class="text-xs font-semibold px-2 py-0.5 rounded-full"
                :class="isDark ? 'bg-brand-400/15 text-brand-300' : 'bg-blue-50 text-blue-600'">
                Latest
              </span>
            </div>

            <!-- Entries within this date group -->
            <div>
              <div v-for="(entry, entryIdx) in group.entries" :key="entry.id">
                <!-- Separator between non-auto entries -->
                <div v-if="entryIdx > 0 && entry.version !== 'auto'" class="border-t my-4"
                  :class="isDark ? 'border-white/5' : 'border-gray-100'" />

                <!-- Version badge only for manual entries (not auto) -->
                <div v-if="entry.version !== 'auto'" class="mb-2">
                  <span class="version-badge">{{ entry.version }}</span>
                </div>

                <!-- Content (auto-entries render directly as bullet list) -->
                <div class="prose prose-sm max-w-none prose-custom"
                  :class="isDark ? 'prose-invert prose-blue' : ''"
                  v-html="renderMarkdown(entry.content)" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Load More Button -->
      <div v-if="hasMore" class="text-center mt-8">
        <button
          class="glass glass-hover px-6 py-3 rounded-xl text-sm font-medium transition-all inline-flex items-center gap-2"
          :class="isDark ? 'text-silver-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'"
          @click="loadMore">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
          Load older entries
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="glass-card rounded-2xl p-16 text-center">
      <svg class="w-12 h-12 mx-auto mb-4" :class="isDark ? 'text-silver-700/50' : 'text-gray-300'" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
      <p :class="isDark ? 'text-silver-600' : 'text-gray-400'">No entries yet.</p>
    </div>

    <!-- Bottom CTA -->
    <div class="text-center mt-12 pt-6 border-t fade-in"
      :class="isDark ? 'border-brand-400/10' : 'border-gray-200'">
      <p class="text-sm" :class="isDark ? 'text-silver-500' : 'text-gray-500'">
        Browse the latest configurations on the
        <NuxtLink to="/strings" class="text-brand-400 hover:underline">Import Strings</NuxtLink> page.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { marked } from 'marked'
const { isLoggedIn } = useAuth()
const isDark = useIsDark()
const { observe } = useScrollReveal()

useSeoMeta({
  title: 'Changelog — MagguuUI',
  description: 'All updates and changes to MagguuUI import strings. Version history and patch notes.',
  ogTitle: 'Changelog — MagguuUI',
})
const { data: changelogData } = await useFetch('/api/v1/changelogs')
const allEntries = computed(() => (changelogData.value as any)?.data || [])

let clientSanitize: ((html: string) => string) | null = null
if (import.meta.client) {
  const mod = await import('dompurify')
  clientSanitize = (html: string) => mod.default.sanitize(html)
}

function sanitizeHtmlSSR(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?>[\s\S]*?<\/embed>/gi, '')
    .replace(/<form[\s\S]*?>[\s\S]*?<\/form>/gi, '')
    .replace(/\son\w+=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, ' $1="#"')
}

function renderMarkdown(text: string): string {
  // Strip "### Changes YYYY-MM-DD" headers (date is already shown in card header)
  const cleaned = text.replace(/^###\s+Changes\s+\d{4}-\d{2}-\d{2}\s*/gm, '').trim()
  const html = marked.parse(cleaned, { async: false }) as string
  return clientSanitize ? clientSanitize(html) : sanitizeHtmlSSR(html)
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

// Group entries by date (day)
const groupedByDate = computed(() => {
  const entries = allEntries.value
  if (!entries.length) return []
  const groupMap = new Map<string, any[]>()
  for (const entry of entries) {
    const key = toDateKey(entry.publishedAt)
    if (!groupMap.has(key)) groupMap.set(key, [])
    groupMap.get(key)!.push(entry)
  }
  const groups: { dateKey: string; dateFormatted: string; entries: any[] }[] = []
  for (const [dateKey, groupEntries] of groupMap) {
    groups.push({ dateKey, dateFormatted: formatDate(groupEntries[0].publishedAt), entries: groupEntries })
  }
  return groups
})

const PAGE_SIZE = 10
const visibleCount = ref(PAGE_SIZE)
const hasLoadedMore = ref(false)
const visibleGroups = computed(() => groupedByDate.value.slice(0, visibleCount.value))
const hasMore = computed(() => groupedByDate.value.length > visibleCount.value)

function loadMore() {
  visibleCount.value += PAGE_SIZE
  hasLoadedMore.value = true
}
</script>
