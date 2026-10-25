<!--
  Public about markup. Shared by pages/about.vue and the admin live preview
  (Admin → Content → Pages) so the preview is the real public rendering.
-->

<template>
  <article class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20">
    <p class="font-mono text-[11px] uppercase tracking-[0.16em] mb-3" :class="isDark ? 'text-brand-300' : 'text-brand-700'">{{ copy.header?.eyebrow }}</p>
    <h1 class="text-4xl font-semibold tracking-tight" :class="isDark ? 'text-white' : 'text-gray-950'">{{ copy.header?.title }}</h1>

    <section class="mt-8" data-testid="about-intro">
      <h2 class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-950'">{{ copy.intro?.title }}</h2>
      <SafeHtml class="page-copy mt-3 text-sm leading-relaxed" :class="isDark ? 'page-copy--dark text-silver-400' : 'text-gray-600'" :html="copy.intro?.body || ''" />
    </section>

    <section class="mt-10 border-t pt-8" :class="isDark ? 'border-white/10' : 'border-gray-200'" data-testid="about-features">
      <h2 class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-950'">{{ copy.features?.title }}</h2>
      <SafeHtml class="page-copy page-copy--dl mt-4 text-sm leading-relaxed" :class="isDark ? 'page-copy--dark text-silver-400' : 'text-gray-600'" :html="copy.features?.body || ''" />
    </section>

    <section class="mt-10 border-t pt-8" :class="isDark ? 'border-white/10' : 'border-gray-200'" data-testid="about-website">
      <h2 class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-950'">{{ copy.website?.title }}</h2>
      <SafeHtml class="page-copy mt-3 text-sm leading-relaxed" :class="isDark ? 'page-copy--dark text-silver-400' : 'text-gray-600'" :html="copy.website?.body || ''" />
    </section>

    <section id="contact" class="mt-10 border-t pt-8" :class="isDark ? 'border-white/10' : 'border-gray-200'">
      <h2 class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-950'">{{ copy.contact?.title }}</h2>
      <!--email_off-->
      <p class="mt-3 text-sm leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
        {{ copy.contact?.lead }}
        <ContactEmail :address="contactEmail || 'contact@magguu.xyz'" class="underline underline-offset-4" :class="isDark ? 'text-white' : 'text-gray-950'" />.
      </p>
      <!--/email_off-->
    </section>

    <section class="mt-10 border-t pt-8" :class="isDark ? 'border-white/10' : 'border-gray-200'" data-testid="about-legal">
      <h2 class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-950'">{{ copy.legal?.title }}</h2>
      <SafeHtml class="page-copy mt-3 text-sm leading-relaxed" :class="isDark ? 'page-copy--dark text-silver-400' : 'text-gray-600'" :html="copy.legal?.body || ''" />
    </section>
  </article>
</template>

<script setup lang="ts">
import type { PageCopyDefaults } from '~/utils/pageCopyDefaults'

defineProps<{
  copy: PageCopyDefaults
  contactEmail?: string
}>()

const isDark = useIsDark()
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
