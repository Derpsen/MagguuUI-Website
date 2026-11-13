<!--
  Public news index: published Magguu notes, newest first.
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

    <p class="mg-kicker mb-3">Notes</p>
    <h1 class="mg-h1">News</h1>
    <p class="mg-lead mt-3 max-w-xl">
      Short notes on World of Warcraft patches, Forever, and MagguuUI.
    </p>
    <p class="mt-3 text-sm">
      <a href="/news/feed.xml" class="text-mg-fg underline underline-offset-4">RSS feed</a>
    </p>

    <ul v-if="articles.length" class="mt-12 divide-y divide-mg-line border-t border-mg-line">
      <li v-for="article in articles" :key="article.slug" class="py-6">
        <NuxtLink :to="`/news/${article.slug}`" class="group block">
          <time class="mg-kicker text-mg-fg-muted" :datetime="toIsoDate(article.publishedAt)">
            {{ formatDate(article.publishedAt) }}
          </time>
          <h2 class="mt-2 text-xl font-semibold tracking-tight text-mg-fg underline-offset-4 group-hover:underline">
            {{ article.title }}
          </h2>
          <p class="mt-2 text-sm leading-relaxed text-mg-fg-muted">
            {{ article.summary }}
          </p>
        </NuxtLink>
      </li>
    </ul>

    <p v-else-if="pending" class="mt-10 text-sm text-mg-fg-muted" role="status" aria-live="polite">Loading news…</p>
    <p v-else class="mt-10 text-sm text-mg-fg-muted">No published news yet.</p>

    <NewsAlsoOnThisSite />
  </div>
</template>

<script setup lang="ts">
import type { NewsArticleListItem } from '~/utils/news'
import { formatNewsDate, toIsoDate } from '~/utils/newsDates'

const { isLoggedIn } = useAuth()

usePublicPageSeo({
  title: 'News',
  description: 'Magguu notes on World of Warcraft patches, Forever, and the addon.',
  path: '/news',
})

useHead({
  link: [
    { rel: 'alternate', type: 'application/rss+xml', title: 'MagguuUI news (RSS)', href: 'https://ui.magguu.xyz/news/feed.xml' },
  ],
})

const { data, pending } = await useFetch<{ data: NewsArticleListItem[] }>('/api/v1/news')
const articles = computed(() => data.value?.data ?? [])

function formatDate(value: number) {
  return formatNewsDate(value)
}
</script>
