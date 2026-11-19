<!--
  Public privacy markup. Shared by pages/privacy.vue and the admin live preview
  (Admin → Content → Pages) so the preview is the real public rendering.
-->

<template>
  <article class="mg-container pt-10 pb-20">
    <p class="mg-kicker mb-3">{{ copy.header?.eyebrow }}</p>
    <h1 class="mg-h1 mt-2 text-mg-fg">{{ copy.header?.title }}</h1>
    <div class="mt-8 space-y-8 text-sm leading-relaxed text-mg-fg-muted">
      <section
        v-for="(id, index) in sectionIds"
        :key="id"
        :data-testid="`privacy-${id}`"
        :class="index > 0 ? 'border-t border-mg-line pt-8' : ''"
      >
        <h2 class="text-base font-semibold text-mg-fg">{{ copy[id]?.title }}</h2>
        <SafeHtml class="page-copy page-copy--privacy" :html="fill(copy[id]?.body || '')" />
      </section>
    </div>
  </article>
</template>

<script setup lang="ts">
import { fillCopyTokens } from '~/utils/pageCopyDefaults'
import type { PageCopyDefaults } from '~/utils/pageCopyDefaults'

defineProps<{
  copy: PageCopyDefaults
}>()

// {{retention_days}} is the real data_retention_days setting (it also drives the deletion of page load measurements).
const siteSettings = usePublicSiteSettings()
const fill = (html: string) => fillCopyTokens(html, { retention_days: siteSettings.value.data_retention_days })

const sectionIds = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10', 's11', 's12', 's13'] as const
</script>

<style scoped>
.page-copy :deep(p + p) { margin-top: 0.75rem; }
.page-copy :deep(strong),
.page-copy :deep(dt),
.page-copy :deep(a) { color: var(--mg-fg); }
.page-copy :deep(strong),
.page-copy :deep(dt) { font-weight: 600; }
.page-copy :deep(a) { text-decoration: underline; text-underline-offset: 4px; }
.page-copy--dl :deep(dt:not(:first-child)) { margin-top: 1rem; }
.page-copy--dl :deep(dd) { margin-top: 0.25rem; }
.page-copy--privacy :deep(h3) { margin-top: 0.75rem; font-weight: 500; color: var(--mg-fg); }
.page-copy--privacy :deep(h3 + p) { margin-top: 0.25rem; }
.page-copy--privacy > :deep(p:first-child) { margin-top: 0.75rem; }
.page-copy--privacy :deep(ul) { margin-top: 0.5rem; margin-bottom: 0.85rem; list-style: disc; padding-left: 1.25rem; }
.page-copy--privacy :deep(ol) { margin-top: 0.5rem; margin-bottom: 0.85rem; list-style: decimal; padding-left: 1.25rem; }
.page-copy--privacy :deep(li + li) { margin-top: 0.25rem; }
.page-copy--privacy :deep(:is(ul, ol) + p) { margin-top: 0.85rem; }
</style>
