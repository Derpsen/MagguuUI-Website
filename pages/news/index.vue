<!--
  Public news index: published Magguu notes, newest first.
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

    <p class="font-mono text-[11px] uppercase tracking-[0.16em] mb-3" :class="isDark ? 'text-brand-300' : 'text-brand-700'">Notes</p>
    <h1 class="text-4xl font-semibold tracking-tight" :class="isDark ? 'text-white' : 'text-gray-950'">News</h1>
    <p class="mt-3 max-w-xl text-sm leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
      Short notes on World of Warcraft patches, Forever, and MagguuUI.
    </p>
    <p class="mt-3 text-sm">
      <a
        href="/news/feed.xml"
        class="underline underline-offset-4"
        :class="isDark ? 'text-white' : 'text-gray-950'"
      >RSS feed</a>
    </p>

    <ul v-if="articles.length" class="mt-12 border-t divide-y" :class="isDark ? 'border-white/10 divide-white/10' : 'border-gray-200 divide-gray-200'">
      <li v-for="article in articles" :key="article.slug" class="py-6">
        <NuxtLink :to="`/news/${article.slug}`" class="block group">
          <time class="font-mono text-[11px] uppercase tracking-[0.14em]" :class="isDark ? 'text-silver-500' : 'text-gray-500'" :datetime="toIsoDate(article.publishedAt)">
            {{ formatDate(article.publishedAt) }}
          </time>
          <h2 class="mt-2 text-xl font-semibold tracking-tight group-hover:underline underline-offset-4" :class="isDark ? 'text-white' : 'text-gray-950'">
            {{ article.title }}
          </h2>
          <p class="mt-2 text-sm leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
            {{ article.summary }}
          </p>
        </NuxtLink>
      </li>
    </ul>

    <p v-else-if="pending" class="mt-10 text-sm" role="status" aria-live="polite" :class="isDark ? 'text-silver-400' : 'text-gray-500'">Loading news…</p>
    <p v-else class="mt-10 text-sm" :class="isDark ? 'text-silver-400' : 'text-gray-600'">No published news yet.</p>

    <NewsAlsoOnThisSite />
  </div>
</template>

<script setup lang="ts">
import type { NewsArticleListItem } from '~/utils/news'
import { formatNewsDate, toIsoDate } from '~/utils/newsDates'

const isDark = useIsDark()
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
