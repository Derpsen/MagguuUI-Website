<!--
  Imprint Page - Legal notice
-->

<template>
  <article class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20">
    <p class="font-mono text-[11px] uppercase tracking-[0.16em] mb-3" :class="isDark ? 'text-brand-300' : 'text-brand-700'">Legal notice</p>
    <h1 class="text-4xl font-semibold tracking-tight" :class="isDark ? 'text-white' : 'text-gray-950'">Imprint</h1>

    <section class="mt-8">
      <h2 class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-950'">Information according to Section 5 TMG</h2>
      <div class="mt-3 space-y-1 text-sm leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
        <p class="font-medium" :class="isDark ? 'text-white' : 'text-gray-950'">{{ imprintName }}</p>
        <template v-if="hasImprintDetails">
          <p>{{ imprintStreet }}</p>
          <p>{{ imprintCity }}</p>
          <p>{{ imprintCountry }}</p>
        </template>
        <p v-else>
          MagguuUI is operated from Germany. For legal correspondence and operator inquiries, please use the contact email below.
        </p>
      </div>
    </section>

    <section class="mt-8 border-t pt-8" :class="isDark ? 'border-white/10' : 'border-gray-200'">
      <h2 class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-950'">Contact</h2>
      <!--email_off-->
      <p class="mt-3 text-sm leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
        Email:
        <a :href="`mailto:${contactEmail}`" class="underline underline-offset-4" :class="isDark ? 'text-white' : 'text-gray-950'">{{ contactEmail }}</a>
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
  title: 'Imprint',
  description: 'Legal notice and imprint for MagguuUI.',
  path: '/imprint',
  robots: 'noindex, follow',
})

const contactEmail = computed(() => siteSettings.value.contact_email || 'contact@magguu.xyz')

const imprintName = computed(() => siteSettings.value.imprint_name || siteSettings.value.site_name || 'MagguuUI')
const imprintStreet = computed(() => siteSettings.value.imprint_street || '')
const imprintCity = computed(() => siteSettings.value.imprint_city || '')
const imprintCountry = computed(() => siteSettings.value.imprint_country || 'Germany')
const hasImprintDetails = computed(() => Boolean(imprintStreet.value && imprintCity.value))
</script>
