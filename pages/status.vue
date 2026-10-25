<template>
  <article class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20" data-testid="status-page">
    <p class="font-mono text-[11px] uppercase tracking-[0.16em] mb-3" :class="isDark ? 'text-brand-300' : 'text-brand-700'">Status</p>
    <h1 class="text-4xl font-semibold tracking-tight" :class="strong">Website status</h1>
    <p class="mt-3 text-sm leading-relaxed" :class="muted">
      A coarse view of this website, measured by the site itself. It does not cover any other service.
    </p>

    <template v-if="status">
      <section v-if="status.notices.length" class="mt-8" aria-labelledby="status-notices" data-testid="status-notices">
        <h2 id="status-notices" class="font-mono text-[11px] uppercase tracking-[0.16em] mb-3" :class="isDark ? 'text-brand-300' : 'text-brand-700'">Notices</h2>
        <ul class="divide-y" :class="divider">
          <li v-for="n in status.notices" :id="`notice-${n.id}`" :key="n.id" class="py-4 text-sm" :data-testid="`status-notice-${n.id}`" :data-status="n.status">
            <p class="font-medium" :class="strong">{{ n.title }}</p>
            <p class="mt-0.5 text-xs" :class="faint">{{ noticeMeta(n) }}</p>
            <p class="mt-0.5 text-xs" :class="faint">{{ noticeWindow(n) }}</p>
            <SafeHtml v-if="n.bodyHtml" :html="n.bodyHtml" class="status-notice-html mt-2 leading-relaxed" :class="muted" />
            <ol v-if="n.updates.length" class="mt-3 space-y-2 border-l pl-3" :class="isDark ? 'border-white/10' : 'border-gray-200'" :data-testid="`status-notice-${n.id}-timeline`">
              <li v-for="(u, i) in [...n.updates].reverse()" :key="i" class="text-xs">
                <p :class="faint"><time :datetime="u.at">{{ formatStatusTime(u.at) }}</time> · {{ NOTICE_STATUS_LABEL[u.status] }}</p>
                <SafeHtml v-if="u.bodyHtml" :html="u.bodyHtml" class="status-notice-html mt-0.5 text-sm" :class="muted" />
              </li>
            </ol>
          </li>
        </ul>
      </section>

      <p class="mt-8 flex items-center gap-2 text-lg font-semibold" :class="strong" role="status" data-testid="status-overall">
        <span class="inline-block h-2.5 w-2.5 rounded-full" :class="dot(status.status)" aria-hidden="true" />
        <span>{{ overallText }}</span>
      </p>
      <p class="mt-1 text-xs" :class="faint" data-testid="status-checked">
        Last checked <time :datetime="status.checkedAt">{{ formatStatusTime(status.checkedAt) }}</time>
      </p>

      <section class="mt-10" aria-labelledby="status-components" data-testid="status-components">
        <h2 id="status-components" class="font-mono text-[11px] uppercase tracking-[0.16em] mb-3" :class="isDark ? 'text-brand-300' : 'text-brand-700'">Components</h2>
        <ul class="divide-y" :class="divider">
          <li v-for="c in status.components" :key="c.id" class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 text-sm" :data-testid="`status-component-${c.id}`">
            <span>
              <span :class="strong">{{ c.name }}</span>
              <span v-if="c.note" class="block text-xs" :class="faint">{{ c.note }}</span>
            </span>
            <span class="flex items-center gap-2 font-medium" :class="stateText(c.state)" :data-state="c.state">
              <span class="inline-block h-2 w-2 rounded-full" :class="dot(c.state)" aria-hidden="true" />
              {{ STATUS_LABEL[c.state] }}
            </span>
          </li>
        </ul>
      </section>

      <section class="mt-10" aria-labelledby="status-uptime" data-testid="status-uptime">
        <h2 id="status-uptime" class="font-mono text-[11px] uppercase tracking-[0.16em] mb-3" :class="isDark ? 'text-brand-300' : 'text-brand-700'">Availability</h2>
        <ul v-if="status.uptime.ready" class="divide-y" :class="divider">
          <li v-for="w in status.uptime.windows" :key="w.days" class="flex items-baseline justify-between gap-4 py-3 text-sm" :data-testid="`status-uptime-${w.days}`">
            <span :class="strong">{{ windowLabel(w.days) }}</span>
            <span class="font-medium tabular-nums" :class="strong">{{ formatPercent(w.percent) }}</span>
          </li>
        </ul>
        <p v-else class="text-sm" :class="muted" data-testid="status-collecting">
          Collecting data. Availability figures appear once the site has been checked for 24 hours.
        </p>
        <p class="mt-3 text-xs leading-relaxed" :class="faint">{{ status.uptime.note }}</p>
      </section>

      <section class="mt-10" aria-labelledby="status-history" data-testid="status-history">
        <h2 id="status-history" class="font-mono text-[11px] uppercase tracking-[0.16em] mb-3" :class="isDark ? 'text-brand-300' : 'text-brand-700'">History</h2>
        <ul v-if="status.history.length" class="divide-y" :class="divider">
          <li v-for="n in status.history" :id="`notice-${n.id}`" :key="n.id" class="py-3 text-sm" :data-testid="`status-history-${n.id}`">
            <details>
              <summary class="cursor-pointer" :class="strong">
                <span class="font-medium">{{ n.title }}</span>
                <span class="ml-2 text-xs" :class="faint">{{ historyMeta(n) }}</span>
              </summary>
              <SafeHtml v-if="n.bodyHtml" :html="n.bodyHtml" class="status-notice-html mt-2 leading-relaxed" :class="muted" />
              <ol v-if="n.updates.length" class="mt-3 space-y-2 border-l pl-3" :class="isDark ? 'border-white/10' : 'border-gray-200'" :data-testid="`status-history-${n.id}-timeline`">
                <li v-for="(u, i) in [...n.updates].reverse()" :key="i" class="text-xs">
                  <p :class="faint"><time :datetime="u.at">{{ formatStatusTime(u.at) }}</time> · {{ NOTICE_STATUS_LABEL[u.status] }}</p>
                  <SafeHtml v-if="u.bodyHtml" :html="u.bodyHtml" class="status-notice-html mt-0.5 text-sm" :class="muted" />
                </li>
              </ol>
            </details>
          </li>
        </ul>
        <p v-else class="text-sm" :class="muted" data-testid="status-history-empty">No resolved notices in the last 90 days.</p>
      </section>
    </template>

    <p v-else class="mt-8 text-sm" :class="muted" data-testid="status-unavailable">
      The status could not be loaded. Please try again in a moment.
    </p>
  </article>
</template>

<script setup lang="ts">
import {
  NOTICE_COMPONENT_LABEL, NOTICE_KIND_LABEL, NOTICE_STATUS_LABEL, STATUS_LABEL, formatPercent, formatStatusTime,
  type PublicStatus, type StatusNotice, type StatusState,
} from '~/utils/publicStatus'

const isDark = useIsDark()

usePublicPageSeo({
  title: 'Website status',
  description: 'Current state of the MagguuUI website: website, database and data freshness, with availability measured by the site itself.',
  path: '/status',
  // A status snapshot ("Down" at 03:12) has no lasting search value: reachable and linked, not indexed, not in the sitemap.
  robots: 'noindex, follow',
})

const muted = computed(() => isDark.value ? 'text-silver-400' : 'text-gray-600')
const faint = computed(() => isDark.value ? 'text-silver-500' : 'text-gray-500')
const strong = computed(() => isDark.value ? 'text-white' : 'text-gray-950')
const divider = computed(() => isDark.value ? 'divide-white/10 border-y border-white/10' : 'divide-gray-200 border-y border-gray-200')

const { data: raw, refresh } = await useFetch<{ data: PublicStatus }>('/api/v1/status', { key: 'public-status' })
const status = computed(() => raw.value?.data ?? null)

const overallText = computed(() => {
  switch (status.value?.status) {
    case 'degraded': return 'Some systems are degraded'
    case 'down': return 'The website is down'
    default: return 'All systems operational'
  }
})

const dot = (state: StatusState) => ({
  operational: isDark.value ? 'bg-brand-300' : 'bg-brand-600',
  degraded: isDark.value ? 'bg-amber-300' : 'bg-amber-600',
  down: isDark.value ? 'bg-red-400' : 'bg-red-600',
})[state]
const stateText = (state: StatusState) => ({
  operational: isDark.value ? 'text-brand-300' : 'text-brand-700',
  degraded: isDark.value ? 'text-amber-300' : 'text-amber-700',
  down: isDark.value ? 'text-red-300' : 'text-red-700',
})[state]

const noticeMeta = (n: StatusNotice) =>
  [NOTICE_KIND_LABEL[n.kind], NOTICE_STATUS_LABEL[n.status], n.component ? NOTICE_COMPONENT_LABEL[n.component] : null].filter(Boolean).join(' · ')
const noticeWindow = (n: StatusNotice) => {
  const from = formatStatusTime(n.startsAt)
  if (n.status === 'scheduled') return n.endsAt ? `Planned ${from} to ${formatStatusTime(n.endsAt)}` : `Planned from ${from}`
  return n.endsAt ? `Started ${from}, expected until ${formatStatusTime(n.endsAt)}` : `Started ${from}`
}
const historyMeta = (n: StatusNotice) =>
  [NOTICE_KIND_LABEL[n.kind], n.component ? NOTICE_COMPONENT_LABEL[n.component] : null, n.resolvedAt ? `resolved ${formatStatusTime(n.resolvedAt)}` : null].filter(Boolean).join(' · ')

const windowLabel = (days: number) => days === 1 ? 'Last 24 hours' : `Last ${days} days`

// Light refresh: once a minute while the tab is visible (the API itself is cached for 45 s).
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  timer = setInterval(() => { if (document.visibilityState === 'visible') refresh() }, 60_000)
})
onBeforeUnmount(() => clearInterval(timer))
</script>

<style>
.status-notice-html p + p,
.status-notice-html ul,
.status-notice-html ol,
.status-notice-html pre,
.status-notice-html blockquote { margin-top: 0.5rem; }
.status-notice-html ul { list-style: disc; padding-left: 1.25rem; }
.status-notice-html ol { list-style: decimal; padding-left: 1.25rem; }
.status-notice-html a { text-decoration: underline; text-underline-offset: 2px; }
.status-notice-html blockquote { border-left: 2px solid currentColor; padding-left: 0.75rem; opacity: 0.85; }
.status-notice-html code { font-family: ui-monospace, monospace; font-size: 0.9em; }
.status-notice-html pre { overflow-x: auto; white-space: pre-wrap; }
</style>
