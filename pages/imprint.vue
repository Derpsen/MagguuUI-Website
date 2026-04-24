<!--
  Imprint Page - Legal notice
-->

<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
    <div class="text-center mb-12 fade-in heading-glow">
      <h1 class="text-4xl sm:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
        <svg aria-hidden="true" class="w-8 h-8 text-brand-400 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.75c-1.104 0-2 .896-2 2v.75H9a2.25 2.25 0 00-2.25 2.25v5.25A2.25 2.25 0 009 19.5h6a2.25 2.25 0 002.25-2.25v-5.25A2.25 2.25 0 0015 9.5h-1v-.75c0-1.104-.896-2-2-2z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 12.75v1.5" />
        </svg>
        <span class="text-gradient">Imprint</span>
      </h1>
      <p class="text-lg" :class="isDark ? 'text-silver-500' : 'text-gray-500'">
        Legal notice and contact details
      </p>
    </div>

    <div class="space-y-4">
      <div :ref="el => observe(el as HTMLElement)" class="glass-card rounded-2xl p-6 sm:p-8">
        <h2 class="text-lg font-semibold mb-3 flex items-center gap-2.5">
          <svg aria-hidden="true" class="w-5 h-5 text-brand-400 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17.25 6.75v10.5m-10.5-10.5v10.5M3.75 6.75h16.5M4.5 6.75h15a.75.75 0 01.75.75v9a.75.75 0 01-.75.75h-15a.75.75 0 01-.75-.75v-9a.75.75 0 01.75-.75z" />
          </svg>
          <span class="text-gradient-subtle">Information according to Section 5 TMG</span>
        </h2>

        <div class="space-y-2 text-sm leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
          <p class="font-medium" :class="isDark ? 'text-white' : 'text-gray-900'">{{ imprintName }}</p>
          <template v-if="hasImprintDetails">
            <p>{{ imprintStreet }}</p>
            <p>{{ imprintCity }}</p>
            <p>{{ imprintCountry }}</p>
          </template>
          <p v-else>
            For legal inquiries, please use the contact email below until full imprint details are configured.
          </p>
        </div>
      </div>

      <div :ref="el => observe(el as HTMLElement)" class="glass-card rounded-2xl p-6 sm:p-8">
        <h2 class="text-lg font-semibold mb-3 flex items-center gap-2.5">
          <svg aria-hidden="true" class="w-5 h-5 text-brand-400 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
          <span class="text-gradient-subtle">Contact</span>
        </h2>
        <p class="text-sm leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
          Email:
          <a :href="`mailto:${contactEmail}`" class="text-brand-400 hover:underline">{{ contactEmail }}</a>
        </p>
      </div>

      <div :ref="el => observe(el as HTMLElement)" class="glass-card rounded-2xl p-6 sm:p-8">
        <h2 class="text-lg font-semibold mb-3 flex items-center gap-2.5">
          <svg aria-hidden="true" class="w-5 h-5 text-brand-400 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 3.75c-4.97 0-9 2.518-9 5.625S7.03 15 12 15s9-2.518 9-5.625-4.03-5.625-9-5.625z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 9.375V15c0 3.107 4.03 5.625 9 5.625S21 18.107 21 15V9.375" />
          </svg>
          <span class="text-gradient-subtle">Disclaimer</span>
        </h2>
        <p class="text-sm leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
          World of Warcraft and all related trademarks are registered trademarks of
          Blizzard Entertainment, Inc. MagguuUI is not officially affiliated
          with Blizzard Entertainment.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const isDark = useIsDark()
const { observe } = useScrollReveal()
const siteSettings = usePublicPageSeo({
  title: 'Imprint',
  description: 'Legal notice and imprint for MagguuUI.',
  path: '/imprint',
  robots: 'noindex, follow',
})

const contactEmail = computed(() => siteSettings.value.contact_email || 'contact@magguui.com')
const imprintName = computed(() => siteSettings.value.imprint_name || siteSettings.value.site_name || 'MagguuUI')
const imprintStreet = computed(() => siteSettings.value.imprint_street || '')
const imprintCity = computed(() => siteSettings.value.imprint_city || '')
const imprintCountry = computed(() => siteSettings.value.imprint_country || 'Germany')
const hasImprintDetails = computed(() => Boolean(imprintStreet.value && imprintCity.value))
</script>
