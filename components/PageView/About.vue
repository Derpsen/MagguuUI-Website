<!--
  Public about markup. Shared by pages/about.vue and the admin live preview
  (Admin → Content → Pages) so the preview is the real public rendering.
-->

<template>
  <article class="mg-container pt-10 pb-20">
    <p class="mg-kicker mb-3">{{ copy.header?.eyebrow }}</p>
    <h1 class="mg-h1 mt-2 text-mg-fg">{{ copy.header?.title }}</h1>

    <section class="mt-10" data-testid="about-intro">
      <h2 class="text-base font-semibold text-mg-fg">{{ copy.intro?.title }}</h2>
      <SafeHtml class="page-copy mt-3 text-sm leading-relaxed text-mg-fg-muted" :html="copy.intro?.body || ''" />
    </section>

    <section class="mt-10 border-t border-mg-line pt-8" data-testid="about-features">
      <h2 class="text-base font-semibold text-mg-fg">{{ copy.features?.title }}</h2>
      <SafeHtml class="page-copy page-copy--dl mt-4 text-sm leading-relaxed text-mg-fg-muted" :html="copy.features?.body || ''" />
    </section>

    <section class="mt-10 border-t border-mg-line pt-8" data-testid="about-website">
      <h2 class="text-base font-semibold text-mg-fg">{{ copy.website?.title }}</h2>
      <SafeHtml class="page-copy mt-3 text-sm leading-relaxed text-mg-fg-muted" :html="copy.website?.body || ''" />
    </section>

    <section id="contact" class="mt-10 border-t border-mg-line pt-8">
      <h2 class="text-base font-semibold text-mg-fg">{{ copy.contact?.title }}</h2>
      <!--email_off-->
      <p class="mt-3 text-sm leading-relaxed text-mg-fg-muted">
        {{ copy.contact?.lead }}
        <ContactEmail :address="contactEmail || 'contact@magguu.xyz'" class="underline underline-offset-4 text-mg-fg" />.
      </p>
      <!--/email_off-->
    </section>

    <section class="mt-10 border-t border-mg-line pt-8" data-testid="about-legal">
      <h2 class="text-base font-semibold text-mg-fg">{{ copy.legal?.title }}</h2>
      <SafeHtml class="page-copy mt-3 text-sm leading-relaxed text-mg-fg-muted" :html="copy.legal?.body || ''" />
    </section>
  </article>
</template>

<script setup lang="ts">
import type { PageCopyDefaults } from '~/utils/pageCopyDefaults'

defineProps<{
  copy: PageCopyDefaults
  contactEmail?: string
}>()

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
.page-copy--privacy :deep(ul) { margin-top: 0.5rem; list-style: disc; padding-left: 1.25rem; }
.page-copy--privacy :deep(li + li) { margin-top: 0.25rem; }
</style>
