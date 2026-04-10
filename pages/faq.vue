<!--
  FAQ Page - Frequently asked questions about MagguuUI
  Fetches FAQ entries from API, grouped by category
-->

<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
    <div v-if="isLoggedIn" class="flex justify-end mb-4">
      <NuxtLink to="/admin/content/faq"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
        :class="isDark ? 'bg-white/5 text-silver-400 hover:text-white hover:bg-white/10 border border-brand-400/15 backdrop-blur' : 'bg-white/80 text-gray-500 hover:text-gray-900 hover:bg-white border border-gray-200 backdrop-blur'">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
        Edit FAQ
      </NuxtLink>
    </div>

    <div class="text-center mb-12 fade-in heading-glow">
      <h1 class="text-4xl sm:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
        <svg class="w-8 h-8 text-brand-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
        </svg>
        <span class="text-gradient">FAQ</span>
      </h1>
      <p class="text-lg" :class="isDark ? 'text-silver-500' : 'text-gray-500'">
        Frequently asked questions about MagguuUI
      </p>
    </div>

    <div class="space-y-6">
      <div v-for="(section, idx) in sections" :key="section.key" class="fade-in" :class="idx > 0 ? `fade-in-delay-${idx}` : ''">
        <h2 v-if="faqData[section.key]?.length" class="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider mb-3 px-1"
          :class="isDark ? 'text-brand-400' : 'text-blue-600'">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" :d="section.icon" />
          </svg>
          {{ section.label }}
        </h2>
        <div v-if="faqData[section.key]?.length" class="space-y-2">
          <FaqItem v-for="faq in faqData[section.key]" :key="faq.id"
            :question="faq.question" :answer="faq.answer" :is-dark="isDark" />
        </div>
      </div>
    </div>

    <div v-if="!hasFaqs && !pending" class="text-center py-12">
      <p :class="isDark ? 'text-silver-500' : 'text-gray-500'">No FAQ entries yet.</p>
    </div>

    <div v-if="hasFaqs" class="text-center mt-12 pt-6 border-t fade-in"
      :class="isDark ? 'border-brand-400/10' : 'border-gray-200'">
      <p class="text-sm" :class="isDark ? 'text-silver-500' : 'text-gray-500'">
        Still have questions? Open an issue on
        <a :href="githubIssuesUrl" target="_blank" rel="noopener noreferrer" class="text-brand-400 hover:underline">GitHub</a>
        or check the <NuxtLink to="/guide" class="text-brand-400 hover:underline">Installation Guide</NuxtLink>.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
const isDark = useIsDark()
const { isLoggedIn } = useAuth()
const siteSettings = await usePublicPageSeo({
  title: 'FAQ',
  description: 'Frequently asked questions about MagguuUI - setup, addons, profiles, and troubleshooting.',
  path: '/faq',
})

const sections = [
  { key: 'general', label: 'General', icon: 'M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z' },
  { key: 'installation', label: 'Installation & Setup', icon: 'M11.42 15.17l-5.684 5.684a1.875 1.875 0 01-2.652-2.652l5.684-5.684m0 0l1.414-1.414a2.625 2.625 0 013.712 0l2.12 2.12a2.625 2.625 0 010 3.712l-1.414 1.414m0 0L18 20.25M2.25 12l8.954-8.955c.44-.439 1.168-.439 1.607 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25' },
  { key: 'addons', label: 'Addons & Profiles', icon: 'M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.491 48.491 0 01-4.163-.3c.186 1.613.79 3.08 1.742 4.295a48.224 48.224 0 013.127.297.643.643 0 01.657.643v0c0 .355-.186.676-.401.959a2.002 2.002 0 00-.349 1.003c0 1.035 1.007 1.875 2.25 1.875s2.25-.84 2.25-1.875c0-.369-.128-.713-.349-1.003a1.733 1.733 0 01-.401-.959v0c0-.374.312-.67.657-.643a48.497 48.497 0 014.163.3c-.186-1.613-.79-3.08-1.742-4.295a48.211 48.211 0 01-3.127-.297.643.643 0 01-.657-.643v0z' },
  { key: 'troubleshooting', label: 'Troubleshooting', icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z' },
]

const { data: rawData, pending } = await useFetch('/api/v1/faqs')
const faqData = computed(() => (rawData.value as any)?.data || {})
const hasFaqs = computed(() => Object.values(faqData.value).some((arr: any) => arr?.length > 0))

// FAQ JSON-LD structured data for rich snippets
useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: () => {
        const allFaqs = sections.flatMap(s =>
          (faqData.value[s.key] || []).map((faq: any) => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: { '@type': 'Answer', text: faq.answer },
          })),
        )
        if (!allFaqs.length) return '{}'
        return JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: allFaqs,
        })
      },
    },
  ],
})
const githubUrl = computed(() => siteSettings.value.github_url || 'https://github.com/Derpsen/MagguuUI')
const githubIssuesUrl = computed(() => githubUrl.value.endsWith('/issues') ? githubUrl.value : `${githubUrl.value.replace(/\/$/, '')}/issues`)
</script>
