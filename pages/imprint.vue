<!--
  Legal notice page (route /imprint)
-->

<template>
  <article class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20">
    <h1 class="text-4xl font-semibold tracking-tight" :class="isDark ? 'text-white' : 'text-gray-950'">{{ copy.header?.title }}</h1>

    <div class="mt-10 space-y-8">
      <section aria-labelledby="legal-operator" data-testid="legal-operator">
        <h2 id="legal-operator" class="font-mono text-[11px] uppercase tracking-[0.14em] mb-1.5" :class="isDark ? 'text-brand-300' : 'text-brand-700'">{{ copy.operator?.label }}</h2>
        <p class="text-base leading-relaxed" :class="isDark ? 'text-silver-300' : 'text-gray-700'">{{ copy.operator?.text }}</p>
      </section>

      <section aria-labelledby="legal-contact-label">
        <h2 id="legal-contact-label" class="font-mono text-[11px] uppercase tracking-[0.14em] mb-1.5" :class="isDark ? 'text-brand-300' : 'text-brand-700'">{{ copy.contact?.label }}</h2>
        <!--email_off-->
        <p class="text-base leading-relaxed" :class="isDark ? 'text-silver-300' : 'text-gray-700'">
          <ContactEmail
            :address="contactEmail"
            data-testid="legal-contact"
            class="legal-contact underline underline-offset-4 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2"
            :class="isDark ? 'text-brand-300 hover:text-brand-200 focus-visible:outline-brand-300' : 'text-brand-800 hover:text-brand-900 focus-visible:outline-brand-700'"
          />
        </p>
        <!--/email_off-->
      </section>

      <section aria-labelledby="legal-disclaimer" data-testid="legal-disclaimer">
        <h2 id="legal-disclaimer" class="font-mono text-[11px] uppercase tracking-[0.14em] mb-1.5" :class="isDark ? 'text-brand-300' : 'text-brand-700'">{{ copy.disclaimer?.label }}</h2>
        <p class="text-sm leading-relaxed" :class="isDark ? 'text-silver-300' : 'text-gray-700'">{{ copy.disclaimer?.text }}</p>
      </section>
    </div>
  </article>
</template>

<script setup lang="ts">
import { IMPRINT_DEFAULTS } from '~/utils/pageCopyDefaults'

const isDark = useIsDark()
const copy = usePageCopy('imprint', IMPRINT_DEFAULTS)
const siteSettings = usePublicPageSeo({
  title: 'Legal notice',
  description: 'Legal notice for MagguuUI.',
  path: '/imprint',
  robots: 'noindex, follow',
})

const contactEmail = computed(() => siteSettings.value.contact_email || 'contact@magguu.xyz')
</script>
