<!--
  Legal notice page (route /imprint)
-->

<template>
  <article class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20">
    <h1 class="text-4xl font-semibold tracking-tight" :class="isDark ? 'text-white' : 'text-gray-950'">Legal notice</h1>

    <section class="mt-8">
      <p class="text-sm leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">MagguuUI is a free, non-commercial project operated from Switzerland.</p>
      <!--email_off-->
      <p class="mt-3 text-sm leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
        Email:
        <ContactEmail :address="contactEmail" class="underline underline-offset-4" :class="isDark ? 'text-white' : 'text-gray-950'" />
      </p>
      <!--/email_off-->
    </section>

    <section class="mt-8 border-t pt-8" :class="isDark ? 'border-white/10' : 'border-gray-200'">
      <h2 class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-950'">Disclaimer</h2>
      <p class="mt-3 text-sm leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
        World of Warcraft and all related trademarks are registered trademarks of
        Blizzard Entertainment, Inc. MagguuUI is not officially affiliated
        with Blizzard Entertainment.
      </p>
    </section>
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
