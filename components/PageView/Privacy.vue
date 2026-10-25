<!--
  Public privacy markup. Shared by pages/privacy.vue and the admin live preview
  (Admin → Content → Pages) so the preview is the real public rendering.
-->

<template>
  <article class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20">
    <p class="font-mono text-[11px] uppercase tracking-[0.16em] mb-3" :class="isDark ? 'text-brand-300' : 'text-brand-700'">{{ copy.header?.eyebrow }}</p>
    <h1 class="text-4xl font-semibold tracking-tight" :class="isDark ? 'text-white' : 'text-gray-950'">{{ copy.header?.title }}</h1>
    <div class="mt-8 space-y-8 text-sm leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
      <section
        v-for="(id, index) in sectionIds"
        :key="id"
        :data-testid="`privacy-${id}`"
        :class="index > 0 ? ['border-t pt-8', isDark ? 'border-white/10' : 'border-gray-200'] : []"
      >
        <h2 class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-950'">{{ copy[id]?.title }}</h2>
        <SafeHtml class="page-copy page-copy--privacy" :class="isDark ? 'page-copy--dark' : ''" :html="copy[id]?.body || ''" />
      </section>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { PageCopyDefaults } from '~/utils/pageCopyDefaults'

defineProps<{
  copy: PageCopyDefaults
}>()

const isDark = useIsDark()
const sectionIds = ['s1', 's2', 's3', 's4', 's5', 's6', 's7'] as const
</script>

<style scoped>
.page-copy :deep(p + p) { margin-top: 0.75rem; }
.page-copy :deep(strong),
.page-copy :deep(dt),
.page-copy :deep(a) { color: #030712; }
.page-copy--dark :deep(strong),
.page-copy--dark :deep(dt),
.page-copy--dark :deep(a) { color: #fff; }
.page-copy :deep(strong),
.page-copy :deep(dt) { font-weight: 600; }
.page-copy :deep(a) { text-decoration: underline; text-underline-offset: 4px; }
.page-copy--dl :deep(dt:not(:first-child)) { margin-top: 1rem; }
.page-copy--dl :deep(dd) { margin-top: 0.25rem; }
.page-copy--privacy :deep(h3) { margin-top: 0.75rem; font-weight: 500; color: #1f2937; }
.page-copy--privacy.page-copy--dark :deep(h3) { color: var(--color-silver-200); }
.page-copy--privacy :deep(h3 + p) { margin-top: 0.25rem; }
.page-copy--privacy > :deep(p:first-child) { margin-top: 0.75rem; }
.page-copy--privacy :deep(ul) { margin-top: 0.5rem; list-style: disc; padding-left: 1.25rem; }
.page-copy--privacy :deep(li + li) { margin-top: 0.25rem; }
</style>
