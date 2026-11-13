<!--
  Public news article. Markdown is rendered through SafeHtml (sanitized).
-->

<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20">
    <div v-if="isLoggedIn" class="mb-4 flex justify-end">
      <NuxtLink
        to="/admin/content/news"
        class="text-xs font-semibold text-mg-fg-muted underline underline-offset-4 hover:text-mg-fg"
      >
        Edit news
      </NuxtLink>
    </div>

    <p class="mg-kicker mb-3">
      <NuxtLink to="/news" class="underline underline-offset-4">News</NuxtLink>
    </p>

    <template v-if="article">
      <h1 class="mg-h1">
        {{ article.title }}
      </h1>
      <p class="mt-3 text-sm text-mg-fg-muted">
        <time :datetime="toIsoDate(article.publishedAt)">{{ formatNewsDate(article.publishedAt) }}</time>
        · {{ article.author }}
        <template v-if="article.sourceName && article.sourceUrl">
          ·
          <a :href="article.sourceUrl" rel="noopener noreferrer" class="text-mg-fg underline underline-offset-4">
            {{ article.sourceName }}
          </a>
        </template>
      </p>
      <p class="mg-lead mt-4 max-w-xl">
        {{ article.summary }}
      </p>
      <ul v-if="article.tags.length" class="mt-4 flex flex-wrap gap-x-4 gap-y-1">
        <li v-for="tag in article.tags" :key="tag" class="mg-kicker text-mg-fg-muted">
          {{ tag }}
        </li>
      </ul>

      <SafeHtml class="news-body mt-10 block" :html="article.body" />

      <NewsAlsoOnThisSite />
    </template>
  </div>
</template>

<script setup lang="ts">
import type { NewsArticle } from '~/utils/news'
import { formatNewsDate, toIsoDate } from '~/utils/newsDates'
import '~/assets/css/news.css'

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
