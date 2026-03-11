<template>
  <div class="space-y-5">
    <div class="admin-inline-note justify-between">
      <div class="flex flex-wrap items-center gap-2">
        <span class="admin-pill">{{ nextRefresh }}s to refresh</span>
        <span
          v-if="versionData"
          class="admin-pill"
          :class="versionData.isUpToDate ? 'admin-pill--success' : 'admin-pill--warning'"
        >
          {{ versionData.isUpToDate ? 'Up to date' : 'Update available' }}
        </span>
        <span v-if="notifItems.length" class="admin-pill">{{ notifItems.length }} notifications</span>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <UButton
          v-for="action in quickActions"
          :key="action.to"
          :to="action.to"
          size="sm"
          color="neutral"
          variant="subtle"
          :icon="action.icon"
        >
          {{ action.label }}
        </UButton>

        <UButton size="sm" icon="i-heroicons-arrow-path" color="neutral" variant="subtle" :loading="refreshing" @click="refreshAll">
          Refresh
        </UButton>
      </div>
    </div>

    <div v-if="!stats" class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div v-for="i in 4" :key="i" class="admin-metric-card">
        <div class="space-y-3">
          <div class="h-3 w-24 rounded skeleton bg-slate-200/70 dark:bg-slate-800/70" />
          <div class="h-7 w-16 rounded skeleton bg-slate-200/70 dark:bg-slate-800/70" />
          <div class="h-3 w-40 rounded skeleton bg-slate-200/70 dark:bg-slate-800/70" />
        </div>
      </div>
    </div>

    <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <AdminMetricCard
        v-for="stat in statCards"
        :key="stat.label"
        :label="stat.label"
        :value="stat.value"
        :icon="stat.icon"
        :hint="stat.footer"
        :trend="stat.trend"
        :tone="stat.tone"
        :to="stat.to"
      />
    </div>

    <div class="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)]">
      <div class="space-y-5">
        <AdminPanel title="Copy Trend" description="Seven day import activity compared to the previous week." icon="i-heroicons-chart-bar">
          <div class="flex items-end justify-between gap-4">
            <div>
              <p class="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{{ stats?.copiesLast7Days || 0 }}</p>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">last 7 days</p>
            </div>

            <div
              v-if="trendPercent !== null"
              class="admin-metric-card__trend"
              :class="trendPercent >= 0 ? 'admin-metric-card__trend--up' : 'admin-metric-card__trend--down'"
            >
              <UIcon :name="trendPercent >= 0 ? 'i-heroicons-arrow-trending-up' : 'i-heroicons-arrow-trending-down'" class="h-3.5 w-3.5" />
              <span>{{ Math.abs(trendPercent) }}%</span>
            </div>
          </div>

          <div v-if="last7Copies.length" class="mt-5">
            <div class="relative h-32">
              <div class="absolute inset-0 flex flex-col justify-between">
                <div class="border-b border-dashed border-slate-200 dark:border-white/8" />
                <div class="border-b border-dashed border-slate-200 dark:border-white/8" />
                <div class="border-b border-dashed border-slate-200 dark:border-white/8" />
                <div />
              </div>

              <div class="relative flex h-full items-end gap-2">
                <div v-for="(day, idx) in last7Copies" :key="idx" class="flex flex-1 flex-col items-center gap-2">
                  <span class="text-[11px] font-medium text-slate-500 dark:text-slate-400">{{ day.count }}</span>
                  <div
                    class="w-full rounded-t-xl bg-blue-500/80 transition hover:bg-blue-500"
                    :style="{ height: `${barHeight(day.count, maxLast7)}%`, minHeight: day.count > 0 ? '10px' : '4px' }"
                  />
                </div>
              </div>
            </div>

            <div class="mt-2 grid grid-cols-7 gap-2">
              <span
                v-for="(day, idx) in last7Copies"
                :key="`label-${idx}`"
                class="text-center text-[11px] text-slate-500 dark:text-slate-400"
              >
                {{ shortDay(day.day) }}
              </span>
            </div>
          </div>

          <AdminEmptyState
            v-else
            icon="i-heroicons-chart-bar"
            title="No trend data"
            description="Traffic and copy charts will appear once events have been recorded."
          />
        </AdminPanel>

        <AdminPanel title="Recent Activity" description="The latest content, string and configuration changes." icon="i-heroicons-clock">
          <div v-if="stats?.recentActivity?.length" class="space-y-2">
            <div
              v-for="item in stats.recentActivity.slice(0, 6)"
              :key="item.id"
              class="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 dark:border-white/8 dark:bg-white/[0.03]"
            >
              <div class="admin-command__item-icon" :class="activityTone(item.action)">
                <UIcon :name="actionIcon(item.action)" class="h-4 w-4" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold text-slate-950 dark:text-white">{{ item.entityName }}</p>
                <p class="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{{ typeLabel(item.entityType) }}</p>
              </div>
              <span class="text-xs text-slate-500 dark:text-slate-400">{{ timeAgo(item.createdAt) }}</span>
              <UBadge :color="item.action === 'created' ? 'success' : item.action === 'updated' ? 'info' : 'error'" variant="subtle">
                {{ item.action }}
              </UBadge>
            </div>
          </div>

          <AdminEmptyState
            v-else
            icon="i-heroicons-clock"
            title="No activity yet"
            description="Administrative actions will appear here as soon as content or settings change."
          />
        </AdminPanel>
      </div>

      <div class="space-y-5">
        <AdminPanel title="Version Status" description="Stored GitHub release information compared to your local version." icon="i-simple-icons-github">
          <template #actions>
            <UButton size="sm" variant="subtle" color="neutral" icon="i-heroicons-arrow-path" :loading="versionChecking" @click="checkVersion">
              Check
            </UButton>
          </template>

          <div v-if="versionData" class="space-y-4">
            <div class="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              <div class="h-2.5 w-2.5 rounded-full" :class="versionData.isUpToDate ? 'bg-emerald-500' : 'bg-amber-500'" />
              <span>{{ versionData.isUpToDate ? 'Release state is in sync.' : 'A newer GitHub release is available.' }}</span>
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/90 px-4 py-3 dark:border-white/8 dark:bg-white/[0.03]">
                <span class="text-xs uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Local</span>
                <strong class="text-sm text-slate-950 dark:text-white">
                  {{ versionData.localVersion ? `v${versionData.localVersion}` : 'Not configured' }}
                </strong>
              </div>

              <div class="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/90 px-4 py-3 dark:border-white/8 dark:bg-white/[0.03]">
                <span class="text-xs uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">GitHub</span>
                <strong :class="versionData.isUpToDate ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'">
                  v{{ versionData.latestVersion }}
                </strong>
              </div>
            </div>

            <NuxtLink
              v-if="!versionData.isUpToDate"
              to="/admin/system/github"
              class="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
            >
              <UIcon name="i-heroicons-arrow-up-right" class="h-4 w-4" />
              Open GitHub Sync
            </NuxtLink>
          </div>

          <AdminEmptyState
            v-else
            icon="i-simple-icons-github"
            title="No version check yet"
            description="Run a fresh release check to compare local and remote versions."
          />
        </AdminPanel>

        <AdminPanel title="Notifications" description="Latest warnings and operational notices." icon="i-heroicons-bell">
          <div v-if="notifItems.length" class="space-y-2">
            <NuxtLink
              v-for="item in notifItems.slice(0, 4)"
              :key="item.id"
              :to="item.link || '#'"
              class="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 transition hover:bg-white dark:border-white/8 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]"
            >
              <div class="mt-1 h-2.5 w-2.5 rounded-full" :class="item.type === 'error' ? 'bg-red-500' : item.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'" />
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-slate-950 dark:text-white">{{ item.title }}</p>
                <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ item.message }}</p>
              </div>
            </NuxtLink>
          </div>

          <AdminEmptyState
            v-else
            icon="i-heroicons-check-badge"
            title="All clear"
            description="No active issues are waiting for attention."
          />
        </AdminPanel>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const { apiFetch } = useApi()
const { notifications: notifItems, refresh: notifRefresh } = useAdminNotifications()

const quickActions = [
  { label: 'New profile', icon: 'i-heroicons-plus-circle', to: '/admin/strings/profiles?action=create' },
  { label: 'Changelog', icon: 'i-heroicons-document-plus', to: '/admin/content/changelog?action=create' },
  { label: 'Analytics', icon: 'i-heroicons-chart-bar', to: '/admin/system/stats' },
]

interface Stats {
  profiles: number
  wowupStrings: number
  layouts: number
  changelogs: number
  copiesLast7Days: number
  uniqueVisitors: number
  recentActivity: any[]
  dailyCopies: Array<{ day: string; count: number }>
  dailyPageViews?: Array<{ day: string; count: number }>
  totalPageViews?: number
  pageViewsLast7Days?: number
  pageViewTrend?: number
  copyTrend?: number
  users?: number
}

const stats = ref<Stats | null>(null)
const refreshing = ref(false)

const statCards = computed(() => {
  const data = stats.value
  if (!data) return []

  return [
    {
      label: 'Inventory',
      value: data.profiles + data.wowupStrings + data.layouts,
      icon: 'i-heroicons-cube',
      tone: 'brand' as const,
      to: '/admin/strings/profiles',
      trend: null,
      footer: `${data.profiles} profiles · ${data.wowupStrings} WowUp · ${data.layouts} layouts`,
    },
    {
      label: 'Published updates',
      value: data.changelogs,
      icon: 'i-heroicons-document-text',
      tone: 'warning' as const,
      to: '/admin/content/changelog',
      trend: null,
      footer: `${data.users || 0} users · ${data.uniqueVisitors || 0} visitors`,
    },
    {
      label: 'Copies 7d',
      value: data.copiesLast7Days,
      icon: 'i-heroicons-bolt',
      tone: 'success' as const,
      to: '/admin/system/stats',
      trend: data.copyTrend ?? null,
      footer: 'Traffic and copy analytics',
    },
    {
      label: 'Page views 7d',
      value: data.pageViewsLast7Days || 0,
      icon: 'i-heroicons-chart-bar',
      tone: 'violet' as const,
      to: '/admin/system/stats',
      trend: data.pageViewTrend ?? null,
      footer: `${data.totalPageViews || 0} total page views`,
    },
  ]
})

const last7Copies = computed(() => (stats.value?.dailyCopies || []).slice(-7))
const prev7Copies = computed(() => (stats.value?.dailyCopies || []).slice(-14, -7))
const maxLast7 = computed(() => Math.max(1, ...last7Copies.value.map(day => day.count)))
const trendPercent = computed(() => {
  const current = last7Copies.value.reduce((sum, day) => sum + day.count, 0)
  const previous = prev7Copies.value.reduce((sum, day) => sum + day.count, 0)
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 100)
})

function barHeight(value: number, max: number) {
  if (!value || !max) return 2
  return Math.max(10, (value / max) * 100)
}

function shortDay(dateStr: string) {
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en', { weekday: 'short' }).slice(0, 2)
  } catch {
    return dateStr?.slice(8, 10) || ''
  }
}

const REFRESH_INTERVAL = 60
const nextRefresh = ref(REFRESH_INTERVAL)
let refreshTimer: ReturnType<typeof setInterval>

async function loadStats() {
  refreshing.value = true
  try {
    stats.value = await apiFetch('/api/v1/admin/stats')
  } finally {
    refreshing.value = false
  }
}

async function refreshAll() {
  nextRefresh.value = REFRESH_INTERVAL
  await loadStats()
  await loadStoredVersion()
  notifRefresh(true)
}

const versionData = ref<{ latestVersion: string; localVersion: string | null; isUpToDate: boolean } | null>(null)
const versionChecking = ref(false)

async function loadStoredVersion() {
  try {
    const result = await apiFetch<any>('/api/v1/admin/github/status')
    if (result?.latestVersion) {
      versionData.value = {
        latestVersion: result.latestVersion,
        localVersion: result.localVersion || null,
        isUpToDate: !!(result.localVersion && result.latestVersion && result.localVersion === result.latestVersion),
      }
    }
  } catch {
    versionData.value = null
  }
}

async function checkVersion() {
  versionChecking.value = true
  try {
    const result = await apiFetch<any>('/api/v1/admin/version-check', { method: 'POST' })
    if (result) versionData.value = result
  } finally {
    versionChecking.value = false
  }
}

function activityTone(action: string) {
  if (action === 'created') return 'admin-tone-success'
  if (action === 'deleted') return 'admin-tone-danger'
  return 'admin-tone-brand'
}

function actionIcon(action: string) {
  if (action === 'created') return 'i-heroicons-plus-circle'
  if (action === 'updated') return 'i-heroicons-pencil-square'
  if (action === 'deleted') return 'i-heroicons-trash'
  return 'i-heroicons-information-circle'
}

function typeLabel(type: string) {
  const labels: Record<string, string> = {
    profile: 'Addon Profile',
    wowup: 'WowUp String',
    layout: 'Character Layout',
    changelog: 'Changelog',
    content: 'Content',
  }
  return labels[type] || type
}

function timeAgo(value: string | number | null) {
  if (!value) return ''
  const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value)
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString('en', { day: '2-digit', month: 'short' })
}

onMounted(async () => {
  await loadStats()
  await loadStoredVersion()
  notifRefresh(true)

  refreshTimer = setInterval(async () => {
    nextRefresh.value--
    if (nextRefresh.value <= 0) {
      nextRefresh.value = REFRESH_INTERVAL
      await loadStats()
      notifRefresh(false)
    }
  }, 1000)
})

onUnmounted(() => {
  clearInterval(refreshTimer)
})
</script>
