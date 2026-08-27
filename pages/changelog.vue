<!--
  Changelog Page — latest MagguuUI version only.
  Full history lives on GitHub CHANGELOG.md; admin can still manage older rows.
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
        The current MagguuUI release. Older versions are on GitHub.
      </p>
    </div>

    <!-- Latest Release -->
    <div v-if="latestRelease" class="mb-12 fade-in fade-in-delay-2">
      <div class="relative overflow-hidden rounded-2xl border p-7 sm:p-8"
        :class="isDark
          ? 'bg-gradient-to-br from-brand-400/8 via-brand-400/4 to-transparent border-brand-400/20'
          : 'bg-gradient-to-br from-brand-50 via-brand-50/40 to-white border-brand-200'">
        <div aria-hidden="true" class="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl opacity-40"
          :class="isDark ? 'bg-brand-400/20' : 'bg-brand-300/25'" />

        <div class="relative flex flex-col sm:flex-row sm:items-start gap-5 sm:gap-7">
          <div class="flex-shrink-0">
            <div class="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] font-semibold mb-2"
              :class="isDark ? 'text-brand-300' : 'text-brand-600'">
              <span class="relative flex w-2 h-2">
                <span class="absolute inline-flex w-full h-full rounded-full animate-ping opacity-60"
                  :class="isDark ? 'bg-brand-400' : 'bg-brand-500'" />
                <span class="relative inline-flex w-2 h-2 rounded-full"
                  :class="isDark ? 'bg-brand-400' : 'bg-brand-500'" />
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
              <SafeHtml class="prose-custom text-sm" :html="renderMarkdown(latestRelease.content)" />
              <div v-if="isLongRelease(latestRelease.content) && !isReleaseExpanded(latestRelease.id)"
                aria-hidden="true"
                class="release-fade"
                :class="isDark ? 'release-fade--dark' : 'release-fade--light'" />
            </div>
            <div class="mt-4 flex flex-wrap items-center gap-3">
              <button v-if="isLongRelease(latestRelease.content)"
                class="inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
                :class="isDark ? 'text-brand-300 hover:text-white' : 'text-brand-600 hover:text-brand-800'"
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

    <!-- Empty State -->
    <div v-else class="glass-card rounded-2xl p-16 text-center">
      <UIcon name="i-heroicons-document-text" class="w-12 h-12 mx-auto mb-4" :class="isDark ? 'text-silver-700/50' : 'text-gray-300'" />
      <p :class="isDark ? 'text-silver-400' : 'text-gray-500'">No entries yet.</p>
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
const siteSettings = usePublicSiteSettings()
const githubChangelogUrl = computed(() => {
  const base = (siteSettings.value?.github_url || 'https://github.com/Derpsen/MagguuUI').replace(/\/$/, '')
  return `${base}/blob/main/CHANGELOG.md`
})
usePublicPageSeo({
  title: 'Changelog',
  description: 'Latest MagguuUI release notes for import strings, packages, and setup. Older versions are on GitHub.',
  path: '/changelog',
})

interface ChangelogPageEntry { id: number, version: string, content: string, contentEn?: string | null, publishedAt: string | number | null, [k: string]: unknown }
const { data: changelogData } = useFetch<{ data: ChangelogPageEntry[] }>('/api/v1/changelogs')
const latestRelease = computed<ChangelogPageEntry | null>(() => changelogData.value?.data?.[0] || null)

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
