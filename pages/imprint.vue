<!--
  Legal notice page (route /imprint)
-->

<template>
  <article class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20">
    <h1 class="text-4xl font-semibold tracking-tight" :class="isDark ? 'text-white' : 'text-gray-950'">Legal notice</h1>

    <section aria-label="Legal notice" class="legal-card mt-8">
      <p class="text-base leading-relaxed" :class="isDark ? 'text-silver-300' : 'text-gray-700'">MagguuUI is a free, non-commercial project operated from Switzerland.</p>
      <!--email_off-->
      <div class="mt-5">
        <ContactEmail
          :address="contactEmail"
          data-testid="legal-contact"
          class="legal-contact inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
          :class="isDark ? 'border-white/15 bg-white/5 text-white hover:bg-white/10 focus-visible:outline-brand-300' : 'border-gray-300 bg-white text-gray-900 hover:bg-gray-100 focus-visible:outline-brand-700'"
        />
      </div>
      <!--/email_off-->
    </section>

    <aside
      aria-labelledby="legal-disclaimer"
      data-testid="legal-disclaimer"
      class="mt-10 pt-8 border-t"
      :class="isDark ? 'border-white/10' : 'border-gray-200'"
    >
      <h2 id="legal-disclaimer" class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-950'">Disclaimer</h2>
      <p class="mt-2 text-sm leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
        World of Warcraft and all related trademarks are registered trademarks of
        Blizzard Entertainment, Inc. MagguuUI is not officially affiliated
        with Blizzard Entertainment.
      </p>
    </aside>
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
