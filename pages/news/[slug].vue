<!--
  Public news article. Markdown is rendered through SafeHtml (sanitized).
-->

<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20">
    <div v-if="isLoggedIn" class="flex justify-end mb-4">
      <NuxtLink
        to="/admin/content/news"
        class="text-xs font-medium underline underline-offset-4"
        :class="isDark ? 'text-silver-400 hover:text-white' : 'text-gray-500 hover:text-gray-950'"
      >
        Edit news
      </NuxtLink>
    </div>

    <p class="font-mono text-[11px] uppercase tracking-[0.16em] mb-3" :class="isDark ? 'text-brand-300' : 'text-brand-700'">
      <NuxtLink to="/news" class="underline underline-offset-4">News</NuxtLink>
    </p>

    <template v-if="article">
      <h1 class="mg-h1" :class="isDark ? 'text-white' : 'text-gray-950'">
        {{ article.title }}
      </h1>
      <p class="mt-3 text-sm" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
        <time :datetime="toIsoDate(article.publishedAt)">{{ formatNewsDate(article.publishedAt) }}</time>
        · {{ article.author }}
        <template v-if="article.sourceName && article.sourceUrl">
          ·
          <a :href="article.sourceUrl" rel="noopener noreferrer" class="underline underline-offset-4" :class="isDark ? 'text-white' : 'text-gray-950'">
            {{ article.sourceName }}
          </a>
        </template>
      </p>
      <p class="mt-4 max-w-xl text-sm leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
        {{ article.summary }}
      </p>
      <ul v-if="article.tags.length" class="mt-4 flex flex-wrap gap-2">
        <li
          v-for="tag in article.tags"
          :key="tag"
          class="font-mono text-[11px] uppercase tracking-[0.12em] px-2 py-1 rounded"
          :class="isDark ? 'bg-white/5 text-silver-400' : 'bg-gray-100 text-gray-600'"
        >
          {{ tag }}
        </li>
      </ul>

      <SafeHtml class="prose-custom text-sm mt-10 block" :html="article.body" />

      <NewsAlsoOnThisSite />
    </template>
  </div>
</template>

<script setup lang="ts">
import type { NewsArticle } from '~/utils/news'
import { formatNewsDate, toIsoDate } from '~/utils/newsDates'

const isDark = useIsDark()
const { isLoggedIn } = useAuth()
const route = useRoute()
const slug = computed(() => String(route.params.slug || ''))

const { data, error } = await useFetch<{ data: NewsArticle }>(() => `/api/v1/news/${slug.value}`)
if (error.value || !data.value?.data) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}

const article = computed(() => data.value?.data ?? null)

usePublicPageSeo({
  title: article.value?.title || 'News',
  description: article.value?.summary || 'Magguu notes on World of Warcraft patches, Forever, and the addon.',
  path: `/news/${slug.value}`,
})

useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: () => {
        const current = article.value
        if (!current) return '{}'
        return JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'NewsArticle',
          headline: current.title,
          description: current.summary,
          datePublished: new Date(current.publishedAt * 1000).toISOString(),
          author: { '@type': 'Organization', name: current.author },
          publisher: { '@type': 'Organization', name: 'MagguuUI', url: 'https://ui.magguu.xyz' },
          mainEntityOfPage: `https://ui.magguu.xyz/news/${current.slug}`,
          url: `https://ui.magguu.xyz/news/${current.slug}`,
          keywords: current.tags.join(', '),
        })
      },
    },
  ],
})
</script>
