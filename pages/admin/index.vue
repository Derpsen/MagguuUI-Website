<template>
  <div class="space-y-6">
    <AdminPageHeader
      icon="i-heroicons-squares-2x2"
      eyebrow="Overview"
      title="Dashboard"
      description="One primary action, the current signals and the latest activity."
    >
      <template #meta>
        <span v-if="stats" class="admin-pill">Auto refresh {{ nextRefresh }}s</span>
      </template>

      <template #actions>
        <UButton size="sm" color="neutral" variant="ghost" icon="i-heroicons-arrow-path" :loading="refreshing" @click="refreshAll">
          Refresh
        </UButton>
      </template>
    </AdminPageHeader>

    <div v-if="!stats" class="space-y-5">
      <AdminPanel title="Focus" icon="i-heroicons-bolt">
        <div class="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
          <div class="space-y-4">
            <div class="h-9 w-72 rounded skeleton bg-slate-200/70 dark:bg-slate-800/70" />
            <div class="h-4 w-full max-w-2xl rounded skeleton bg-slate-200/70 dark:bg-slate-800/70" />
            <div class="h-4 w-3/4 rounded skeleton bg-slate-200/70 dark:bg-slate-800/70" />
            <div class="flex gap-2 pt-2">
              <div class="h-10 w-32 rounded-xl skeleton bg-slate-200/70 dark:bg-slate-800/70" />
              <div class="h-10 w-28 rounded-xl skeleton bg-slate-200/70 dark:bg-slate-800/70" />
            </div>
          </div>

          <div class="space-y-3">
            <div v-for="i in 3" :key="`tile-${i}`" class="admin-kpi-tile">
              <div class="space-y-2">
                <div class="h-3 w-20 rounded skeleton bg-slate-200/70 dark:bg-slate-800/70" />
                <div class="h-7 w-16 rounded skeleton bg-slate-200/70 dark:bg-slate-800/70" />
                <div class="h-3 w-36 rounded skeleton bg-slate-200/70 dark:bg-slate-800/70" />
              </div>
            </div>
          </div>
        </div>
      </AdminPanel>

      <div class="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <AdminPanel title="Recent activity" description="Loading the latest changes." icon="i-heroicons-clock">
          <div class="space-y-2">
            <div v-for="i in 4" :key="`activity-${i}`" class="admin-activity-row">
              <div class="h-9 w-9 rounded-xl skeleton bg-slate-200/70 dark:bg-slate-800/70" />
              <div class="flex-1 space-y-2">
                <div class="h-3 w-40 rounded skeleton bg-slate-200/70 dark:bg-slate-800/70" />
                <div class="h-3 w-24 rounded skeleton bg-slate-200/70 dark:bg-slate-800/70" />
              </div>
            </div>
          </div>
        </AdminPanel>

        <AdminPanel title="Usage trend" description="Loading copy activity." icon="i-heroicons-chart-bar">
          <div class="h-48 rounded-2xl skeleton bg-slate-200/70 dark:bg-slate-800/70" />
        </AdminPanel>
      </div>
    </div>

    <template v-else>
      <AdminPanel title="Focus" icon="i-heroicons-bolt">
        <div class="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
          <div>
            <p class="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-[2.25rem]">
              Keep the next release moving.
            </p>
            <p class="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-400">
              This dashboard stays intentionally reduced: one primary action, a short signal stack and the latest changes.
            </p>

            <div class="mt-6 flex flex-wrap items-center gap-3">
              <UButton to="/admin/strings/profiles?action=create" icon="i-heroicons-plus-circle">
                New profile
              </UButton>
            </div>

            <div class="admin-status-list mt-6">
              <div
                v-for="signal in statusSignals"
                :key="signal.label"
                class="admin-status-row"
                :class="signal.tone === 'warning' ? 'admin-status-row--attention' : ''"
              >
                <span class="admin-status-row__label">{{ signal.label }}</span>
                <span class="admin-status-row__value">{{ signal.value }}</span>
              </div>
            </div>
          </div>

          <div class="space-y-3">
            <NuxtLink
              v-for="tile in summaryTiles"
              :key="tile.label"
              :to="tile.to"
              class="admin-kpi-tile"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="admin-kpi-tile__label">{{ tile.label }}</p>
                  <p class="admin-kpi-tile__value">{{ tile.value }}</p>
                </div>

                <div class="admin-kpi-tile__icon" :class="tile.tone">
                  <UIcon :name="tile.icon" class="h-4 w-4" />
                </div>
              </div>

              <p class="admin-kpi-tile__note">{{ tile.note }}</p>
            </NuxtLink>
          </div>
        </div>
      </AdminPanel>

      <div class="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <AdminPanel title="Recent activity" description="Latest changes across content and data." icon="i-heroicons-clock">
          <div v-if="stats.recentActivity?.length" class="space-y-2">
            <div
              v-for="item in stats.recentActivity.slice(0, 5)"
              :key="item.id"
              class="admin-activity-row"
            >
              <div class="admin-command__item-icon" :class="activityTone(item.action)">
                <UIcon :name="actionIcon(item.action)" class="h-4 w-4" />
              </div>

              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="truncate text-sm font-medium text-slate-950 dark:text-white">{{ item.entityName || typeLabel(item.entityType) }}</p>
                  <UBadge :color="item.action === 'created' ? 'success' : item.action === 'updated' ? 'info' : 'error'" variant="subtle">
                    {{ item.action }}
                  </UBadge>
                </div>
                <p class="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{{ typeLabel(item.entityType) }}</p>
              </div>

              <span class="text-xs text-slate-500 dark:text-slate-400">{{ timeAgo(item.createdAt) }}</span>
            </div>
          </div>

          <AdminEmptyState
            v-else
            icon="i-heroicons-clock"
            title="No activity yet"
            description="Changes will appear here once content or settings are updated."
          />
        </AdminPanel>

        <AdminPanel title="Usage trend" description="Copy activity over the last seven days." icon="i-heroicons-chart-bar">
          <div class="flex items-end justify-between gap-4">
            <div>
              <p class="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{{ stats.copiesLast7Days || 0 }}</p>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">copies in the last 7 days</p>
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
            <div class="relative h-36">
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

          <template #footer>
            <div class="flex w-full flex-wrap items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400">
              <span><strong class="text-slate-950 dark:text-white">{{ stats.pageViewsLast7Days || 0 }}</strong> page views</span>
              <span><strong class="text-slate-950 dark:text-white">{{ stats.uniqueVisitors || 0 }}</strong> visitors</span>
            </div>
          </template>
        </AdminPanel>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const { apiFetch } = useApi()
const { notifications: notifItems, refresh: notifRefresh } = useAdminNotifications()

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

const summaryTiles = computed(() => {
  const data = stats.value
  if (!data) return []

  return [
    {
      label: 'Inventory',
      value: data.profiles + data.wowupStrings + data.layouts,
      icon: 'i-heroicons-cube',
      tone: 'admin-tone-brand',
      to: '/admin/strings/profiles',
      note: `${data.profiles} profiles · ${data.wowupStrings} WowUp · ${data.layouts} layouts`,
    },
    {
      label: 'Published',
      value: data.changelogs,
      icon: 'i-heroicons-document-text',
      tone: 'admin-tone-warning',
      to: '/admin/content/changelog',
      note: `${data.changelogs} public updates`,
    },
    {
      label: 'Copies 7d',
      value: data.copiesLast7Days,
      icon: 'i-heroicons-bolt',
      tone: 'admin-tone-success',
      to: '/admin/system/stats',
      note: `${data.pageViewsLast7Days || 0} page views`,
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
const versionData = ref<{ latestVersion: string; localVersion: string | null; isUpToDate: boolean } | null>(null)

const statusSignals = computed(() => [
  {
    label: 'Version',
    value: !versionData.value
      ? 'Unavailable'
      : versionData.value.isUpToDate
        ? 'Up to date'
        : `Update v${versionData.value.latestVersion}`,
    tone: versionData.value && !versionData.value.isUpToDate ? 'warning' : 'neutral',
  },
  {
    label: 'Alerts',
    value: notifItems.value.length ? `${notifItems.value.length} open` : 'Clear',
    tone: notifItems.value.length ? 'warning' : 'neutral',
  },
  {
    label: 'Refresh',
    value: `${nextRefresh.value}s`,
    tone: 'neutral',
  },
])

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
    changelog: 'Update',
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
