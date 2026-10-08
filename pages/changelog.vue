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

    <p class="font-mono text-[11px] uppercase tracking-[0.16em]" :class="isDark ? 'text-brand-300' : 'text-brand-700'">Release notes</p>

    <div v-if="releases.length">
      <article
        v-for="(release, index) in releases"
        :key="release.id"
        :id="publicAnchorId('release', release.version)"
        class="border-b pb-10"
        :class="[index === 0 ? 'mt-3' : 'mt-10', isDark ? 'border-white/10' : 'border-gray-200']"
      >
        <component
          :is="index === 0 ? 'h1' : 'h2'"
          class="font-mono font-semibold tracking-tight leading-none"
          :class="[
            index === 0 ? 'text-4xl sm:text-5xl' : 'text-2xl',
            isDark ? 'text-white' : 'text-gray-950',
          ]"
        >
          {{ release.version }}
        </component>
        <p class="mt-3 text-sm" :class="isDark ? 'text-silver-500' : 'text-gray-500'">
          {{ formatDate(release.publishedAt) }}
          <template v-if="index === 0">
            <span class="px-2" :class="isDark ? 'text-white/20' : 'text-gray-300'">·</span>
            Current release
          </template>
        </p>
        <div class="release-content relative mt-8"
          :class="{ 'release-content--collapsed': isLongRelease(release.content) && !isReleaseExpanded(release.id) }">
          <SafeHtml class="prose-custom text-sm" :html="renderMarkdown(release.content)" />
          <div v-if="isLongRelease(release.content) && !isReleaseExpanded(release.id)"
            aria-hidden="true"
            class="release-fade"
            :class="isDark ? 'release-fade--dark' : 'release-fade--light'" />
        </div>
        <div class="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <button v-if="isLongRelease(release.content)"
            class="font-medium underline underline-offset-4"
            :class="isDark ? 'text-white' : 'text-gray-950'"
            @click="toggleRelease(release.id)">
            {{ isReleaseExpanded(release.id) ? 'Show less' : 'Show more' }}
          </button>
          <a v-if="index === 0" :href="githubChangelogUrl" target="_blank" rel="noopener noreferrer"
            class="underline underline-offset-4"
            :class="isDark ? 'text-silver-400 hover:text-white' : 'text-gray-500 hover:text-gray-950'">
            Full changelog on GitHub
          </a>
        </div>
      </article>
    </div>

    <div v-else class="mt-8">
      <h1 class="text-4xl font-semibold tracking-tight" :class="isDark ? 'text-white' : 'text-gray-950'">Changelog</h1>
      <p class="mt-3 text-sm" :class="isDark ? 'text-silver-400' : 'text-gray-500'">No entries yet.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { publicAnchorId } from '~/utils/publicAnchor'
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
  description: 'MagguuUI release notes, newest first, with older versions on the same page.',
  path: '/changelog',
})

interface ChangelogPageEntry { id: number, version: string, content: string, contentEn?: string | null, publishedAt: string | number | null, [k: string]: unknown }
const { data: changelogData } = useFetch<{ data: ChangelogPageEntry[] }>('/api/v1/changelogs')
const releases = computed<ChangelogPageEntry[]>(() => changelogData.value?.data ?? [])

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
