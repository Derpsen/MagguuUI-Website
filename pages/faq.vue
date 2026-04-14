<!--
  FAQ Page — Frequently asked questions about MagguuUI
  Grouped by category with accordion items, scroll-reveal, section dividers
-->

<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
    <!-- Admin Edit Button -->
    <div v-if="isLoggedIn" class="flex justify-end mb-4">
      <NuxtLink to="/admin/content/faq"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
        :class="isDark ? 'bg-white/5 text-silver-400 hover:text-white hover:bg-white/10 border border-brand-400/15 backdrop-blur' : 'bg-white/80 text-gray-500 hover:text-gray-900 hover:bg-white border border-gray-200 backdrop-blur'">
        <UIcon name="i-heroicons-pencil-square" class="w-3.5 h-3.5" />
        Edit FAQ
      </NuxtLink>
    </div>

    <!-- Header -->
    <div class="text-center mb-14 fade-in heading-glow">
      <h1 class="text-4xl sm:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
        <UIcon name="i-heroicons-question-mark-circle" class="w-8 h-8 text-brand-400 flex-shrink-0" />
        <span class="text-gradient">FAQ</span>
      </h1>
      <p class="text-lg max-w-xl mx-auto" :class="isDark ? 'text-silver-500' : 'text-gray-500'">
        Everything you need to know about setting up and using MagguuUI — from first install to fine-tuning.
      </p>
    </div>

    <!-- Section Divider -->
    <div class="section-divider mb-10" />

    <!-- FAQ Sections -->
    <div v-if="hasFaqs" class="space-y-10">
      <section
        v-for="section in sections"
        :key="section.key"
        :ref="el => observe(el as HTMLElement)"
      >
        <template v-if="faqData[section.key]?.length">
          <!-- Section Header -->
          <div class="flex items-start gap-3 mb-4 px-1">
            <span class="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              :class="isDark ? 'bg-brand-400/10 text-brand-400' : 'bg-blue-50 text-blue-600'">
              <UIcon :name="section.icon" class="w-4 h-4" />
            </span>
            <div>
              <h2 class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">
                {{ section.label }}
              </h2>
              <p class="text-sm mt-0.5" :class="isDark ? 'text-silver-500' : 'text-gray-500'">
                {{ section.description }}
              </p>
            </div>
          </div>

          <!-- Items -->
          <div class="space-y-2">
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
    </div>

    <!-- Empty State -->
    <div v-else-if="!pending" class="glass-card rounded-2xl p-16 text-center">
      <UIcon name="i-heroicons-chat-bubble-bottom-center-text" class="w-12 h-12 mx-auto mb-4" :class="isDark ? 'text-silver-700/50' : 'text-gray-300'" />
      <p class="text-sm" :class="isDark ? 'text-silver-600' : 'text-gray-400'">No FAQ entries yet.</p>
    </div>

    <!-- Bottom CTA -->
    <div v-if="hasFaqs" class="text-center mt-14 pt-6 border-t fade-in"
      :class="isDark ? 'border-brand-400/10' : 'border-gray-200'">
      <p class="text-sm" :class="isDark ? 'text-silver-500' : 'text-gray-500'">
        Can't find what you're looking for? Check the
        <NuxtLink to="/guide" class="text-brand-400 hover:underline">Installation Guide</NuxtLink>
        or open an issue on
        <a :href="githubIssuesUrl" target="_blank" rel="noopener noreferrer" class="text-brand-400 hover:underline">GitHub</a>.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
const isDark = useIsDark()
const { isLoggedIn } = useAuth()
const { observe } = useScrollReveal()
const siteSettings = await usePublicPageSeo({
  title: 'FAQ',
  description: 'Frequently asked questions about MagguuUI - setup, addons, profiles, and troubleshooting.',
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
