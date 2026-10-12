<!--
  Legal notice page (route /imprint)
-->

<template>
  <article class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20">
    <h1 class="text-4xl font-semibold tracking-tight" :class="isDark ? 'text-white' : 'text-gray-950'">Legal notice</h1>

    <section
      aria-label="Legal notice"
      class="legal-card mt-8 rounded-2xl border p-6 sm:p-8"
      :class="isDark ? 'border-white/10 bg-white/[0.03]' : 'border-gray-200 bg-white shadow-sm'"
    >
      <div class="flex items-start gap-4">
        <span
          class="inline-flex size-11 shrink-0 items-center justify-center rounded-xl"
          :class="isDark ? 'bg-brand-400/15 text-brand-300' : 'bg-brand-100 text-brand-800'"
        >
          <UIcon name="i-heroicons-building-library" class="size-6" aria-hidden="true" />
        </span>
        <div class="min-w-0">
          <p class="pt-2.5 text-base leading-relaxed" :class="isDark ? 'text-silver-300' : 'text-gray-700'">MagguuUI is a free, non-commercial project operated from Switzerland.</p>
        </div>
      </div>
      <!--email_off-->
      <div class="mt-6 flex flex-wrap items-center gap-3">
        <ContactEmail
          :address="contactEmail"
          data-testid="legal-contact"
          class="legal-contact inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
          :class="isDark ? 'bg-white text-gray-950 hover:bg-silver-200 focus-visible:outline-white' : 'bg-gray-950 text-white hover:bg-gray-800 focus-visible:outline-gray-950'"
        />
        <span class="inline-flex items-center gap-1.5 text-xs" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
          <UIcon name="i-heroicons-envelope" class="size-4" aria-hidden="true" />
          Email
        </span>
      </div>
      <!--/email_off-->
    </section>

    <aside
      aria-labelledby="legal-disclaimer"
      data-testid="legal-disclaimer"
      class="mt-6 rounded-2xl border border-l-4 p-6"
      :class="isDark ? 'border-white/10 border-l-amber-400/70 bg-amber-400/[0.04]' : 'border-gray-200 border-l-amber-500 bg-amber-50/60'"
    >
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-information-circle" class="size-5" :class="isDark ? 'text-amber-300' : 'text-amber-800'" aria-hidden="true" />
        <h2 id="legal-disclaimer" class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-950'">Disclaimer</h2>
      </div>
      <p class="mt-3 text-sm leading-relaxed" :class="isDark ? 'text-silver-300' : 'text-gray-700'">
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
