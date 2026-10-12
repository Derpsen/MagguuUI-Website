<!--
  Legal notice page (route /imprint)
-->

<template>
  <article class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20">
    <h1 class="text-4xl font-semibold tracking-tight" :class="isDark ? 'text-white' : 'text-gray-950'">Legal notice</h1>

    <div class="mt-10 space-y-8">
      <section aria-labelledby="legal-operator" data-testid="legal-operator">
        <h2 id="legal-operator" class="font-mono text-[11px] uppercase tracking-[0.14em] mb-1.5" :class="isDark ? 'text-brand-300' : 'text-brand-700'">Operator</h2>
        <p class="text-base leading-relaxed" :class="isDark ? 'text-silver-300' : 'text-gray-700'">MagguuUI is a free, non-commercial project operated from Switzerland.</p>
      </section>

      <section aria-labelledby="legal-contact-label">
        <h2 id="legal-contact-label" class="font-mono text-[11px] uppercase tracking-[0.14em] mb-1.5" :class="isDark ? 'text-brand-300' : 'text-brand-700'">Contact</h2>
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
        <h2 id="legal-disclaimer" class="font-mono text-[11px] uppercase tracking-[0.14em] mb-1.5" :class="isDark ? 'text-brand-300' : 'text-brand-700'">Disclaimer</h2>
        <p class="text-sm leading-relaxed" :class="isDark ? 'text-silver-300' : 'text-gray-700'">
          World of Warcraft and all related trademarks are registered trademarks of
          Blizzard Entertainment, Inc. MagguuUI is not officially affiliated
          with Blizzard Entertainment.
        </p>
      </section>
    </div>
  </article>
</template>

<script setup lang="ts">
const isDark = useIsDark()
const siteSettings = usePublicPageSeo({
  title: 'Legal notice',
  description: 'Legal notice for MagguuUI.',
  path: '/imprint',
  robots: 'noindex, follow',
})

const contactEmail = computed(() => siteSettings.value.contact_email || 'contact@magguu.xyz')
</script>
