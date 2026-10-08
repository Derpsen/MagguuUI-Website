<!--
  FAQ Page — Frequently asked questions about MagguuUI
  Grouped by category with accordion items, scroll-reveal, section dividers
-->

<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20">
    <div v-if="isLoggedIn" class="flex justify-end mb-4">
      <NuxtLink to="/admin/content/faq"
        class="text-xs font-medium underline underline-offset-4"
        :class="isDark ? 'text-silver-400 hover:text-white' : 'text-gray-500 hover:text-gray-950'">
        Edit FAQ
      </NuxtLink>
    </div>

    <p class="font-mono text-[11px] uppercase tracking-[0.16em] mb-3" :class="isDark ? 'text-brand-300' : 'text-brand-700'">Reference</p>
    <h1 class="text-4xl font-semibold tracking-tight" :class="isDark ? 'text-white' : 'text-gray-950'">FAQ</h1>
    <p class="mt-3 max-w-xl text-sm leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
      Setup, profiles, and the problems that show up after the first login.
    </p>

    <div v-if="hasFaqs" class="mt-12">
      <section
        v-for="section in sections"
        :key="section.key"
        class="mb-12"
      >
        <template v-if="faqData[section.key]?.length">
          <h2 class="font-mono text-[11px] uppercase tracking-[0.14em]" :class="isDark ? 'text-brand-300' : 'text-brand-700'">
            {{ section.label }}
          </h2>
          <p class="mt-2 mb-2 text-sm" :class="isDark ? 'text-silver-500' : 'text-gray-500'">
            {{ section.description }}
          </p>
          <div class="border-t" :class="isDark ? 'border-white/10' : 'border-gray-200'">
            <FaqItem
              v-for="faq in faqData[section.key]"
              :key="faq.id"
              :question="faq.question"
              :answer="faq.answer"
              :is-dark="isDark"
            />
          </div>
        </template>
      </section>
      <p class="text-sm border-t pt-6" :class="isDark ? 'border-white/10 text-silver-500' : 'border-gray-200 text-gray-500'">
        Still stuck? Read the
        <NuxtLink to="/guide" class="underline underline-offset-4" :class="isDark ? 'text-white' : 'text-gray-950'">Installation Guide</NuxtLink>
        or open a
        <a :href="githubIssuesUrl" target="_blank" rel="noopener noreferrer" class="underline underline-offset-4" :class="isDark ? 'text-white' : 'text-gray-950'">GitHub issue</a>.
      </p>
    </div>

    <p v-if="pending && !hasFaqs" class="mt-10 text-sm" role="status" aria-live="polite" :class="isDark ? 'text-silver-400' : 'text-gray-500'">Loading FAQ…</p>
    <p v-else-if="!pending && !hasFaqs" class="mt-10 text-sm" :class="isDark ? 'text-silver-400' : 'text-gray-500'">No FAQ entries yet.</p>
  </div>
</template>

<script setup lang="ts">
const isDark = useIsDark()
const { isLoggedIn } = useAuth()
const siteSettings = usePublicPageSeo({
  title: 'FAQ',
  description: 'MagguuUI answers for EllesmereUI setup, Apply Magguu profiles, optional companion profiles, and troubleshooting.',
  path: '/faq',
})

const sections = [
  {
    key: 'general',
    label: 'General',
    description: 'What MagguuUI is, how it works, and what you get.',
    icon: 'i-heroicons-information-circle',
  },
  {
    key: 'installation',
    label: 'Installation & Setup',
    description: 'Getting started — from download to first login.',
    icon: 'i-heroicons-wrench-screwdriver',
  },
  {
    key: 'addons',
    label: 'Addons & Profiles',
    description: 'Import strings, profile management, and addon compatibility.',
    icon: 'i-heroicons-puzzle-piece',
  },
  {
    key: 'troubleshooting',
    label: 'Troubleshooting',
    description: 'Common issues and how to fix them.',
    icon: 'i-heroicons-exclamation-triangle',
  },
]

interface FaqEntry { id: number, question: string, answer: string, [k: string]: unknown }
type FaqByCategory = Record<string, FaqEntry[]>
const { data: rawData, pending } = useFetch<{ data: FaqByCategory }>('/api/v1/faqs')
const faqData = computed<FaqByCategory>(() => rawData.value?.data || {})
const hasFaqs = computed(() => Object.values(faqData.value).some(arr => arr?.length > 0))

// FAQ JSON-LD structured data for rich snippets
useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: () => {
        const allFaqs = sections.flatMap(s =>
          (faqData.value[s.key] || []).map(faq => ({
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
