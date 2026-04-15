<template>
  <div class="space-y-6">
    <!-- Skeleton loading state -->
    <div v-if="!stats" class="space-y-5">
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div v-for="item in 4" :key="`metric-${item}`" class="admin-metric-card">
          <div class="h-24 rounded-2xl skeleton bg-slate-200/70 dark:bg-slate-800/70" />
        </div>
      </div>

      <div class="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div class="h-64 rounded-xl skeleton bg-slate-200/70 dark:bg-slate-800/70" />
        <div class="h-64 rounded-xl skeleton bg-slate-200/70 dark:bg-slate-800/70" />
      </div>
    </div>

    <template v-else>
      <!-- 1. Welcome Banner -->
      <div
        class="rounded-xl border p-6"
        :class="isDark ? 'bg-[hsl(222.34,10.43%,12.27%)] border-[hsl(240,3.7%,22%)]' : 'bg-white border-slate-200'"
      >
        <div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div class="space-y-1">
            <h1
              class="text-xl font-semibold tracking-tight"
              :class="isDark ? 'text-white' : 'text-slate-900'"
            >
              {{ greeting }}
            </h1>
            <p
              class="text-sm"
              :class="isDark ? 'text-white/60' : 'text-slate-500'"
            >
              Here is what is happening with your project today.
              <span class="ml-1 text-xs opacity-70">Auto refresh {{ nextRefresh }}s</span>
            </p>
          </div>

          <div class="flex items-center gap-6">
            <div v-for="card in trafficCards" :key="card.label" class="text-center">
              <p
                class="text-lg font-semibold tabular-nums"
                :class="isDark ? 'text-white' : 'text-slate-900'"
              >
                {{ card.value }}
              </p>
              <p
                class="text-xs"
                :class="isDark ? 'text-white/50' : 'text-slate-400'"
              >
                {{ card.label }}
              </p>
            </div>

            <UButton
              size="sm"
              color="neutral"
              variant="ghost"
              icon="i-heroicons-arrow-path"
              :loading="refreshing"
              @click="refreshAll"
            />
          </div>
        </div>
      </div>

      <!-- 2. KPI Metric Cards -->
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          v-for="metric in overviewCards"
          :key="metric.label"
          :label="metric.label"
          :value="metric.value"
          :icon="metric.icon"
          :hint="metric.hint"
          :trend="metric.trend"
          :tone="metric.tone"
          :to="metric.to"
        />
      </div>

      <!-- 3. Quick Actions Row -->
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <NuxtLink
          v-for="action in quickActions"
          :key="action.label"
          :to="action.to"
          class="group rounded-xl border p-4 transition-all duration-200"
          :class="[
            isDark
              ? 'bg-[hsl(222.34,10.43%,12.27%)] border-[hsl(240,3.7%,22%)] hover:border-primary/40'
              : 'bg-white border-slate-200 hover:border-primary/50',
            'hover:shadow-lg hover:shadow-primary/5',
          ]"
        >
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              :class="isDark ? 'bg-white/5' : 'bg-slate-100'"
            >
              <UIcon
                :name="action.icon"
                class="h-5 w-5"
                :class="isDark ? 'text-white/70' : 'text-slate-500'"
              />
            </div>
            <div class="min-w-0">
              <p
                class="text-sm font-medium truncate"
                :class="isDark ? 'text-white' : 'text-slate-900'"
              >
                {{ action.label }}
              </p>
              <p
                class="text-xs truncate"
                :class="isDark ? 'text-white/40' : 'text-slate-400'"
              >
                {{ action.subtitle }}
              </p>
            </div>
          </div>
        </NuxtLink>
      </div>

      <!-- 4. Two-column layout -->
      <div class="grid gap-5 xl:grid-cols-[1fr_380px]">
        <!-- Left column -->
        <div class="space-y-5">
          <!-- Traffic chart -->
          <div
            class="rounded-xl border p-5"
            :class="isDark ? 'bg-[hsl(222.34,10.43%,12.27%)] border-[hsl(240,3.7%,22%)]' : 'bg-white border-slate-200'"
          >
            <div class="mb-4 flex items-center justify-between">
              <div>
                <h3
                  class="text-sm font-semibold"
                  :class="isDark ? 'text-white' : 'text-slate-900'"
                >
                  Traffic overview
                </h3>
                <p
                  class="text-xs mt-0.5"
                  :class="isDark ? 'text-white/50' : 'text-slate-400'"
                >
                  Copy events over the last 7 days
                </p>
              </div>
              <div v-if="trafficTrendPills.length" class="flex items-center gap-2">
                <span
                  v-for="pill in trafficTrendPills"
                  :key="pill.label"
                  class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="
                    pill.tone === 'admin-pill--warning'
                      ? (isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600')
                      : (isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600')
                  "
                >
                  {{ pill.label }} {{ pill.value }}
                </span>
              </div>
            </div>

            <div v-if="trafficChartData.length">
              <AdminChartsAreaChart :data="trafficChartData" color="#3b8bff" height="200px" />
            </div>
            <div v-else class="flex h-[200px] items-center justify-center">
              <p :class="isDark ? 'text-white/30' : 'text-slate-300'" class="text-sm">No traffic data available</p>
            </div>
          </div>

          <!-- Recent Activity -->
          <div
            class="rounded-xl border p-5"
            :class="isDark ? 'bg-[hsl(222.34,10.43%,12.27%)] border-[hsl(240,3.7%,22%)]' : 'bg-white border-slate-200'"
          >
            <div class="mb-4 flex items-center justify-between">
              <div>
                <h3
                  class="text-sm font-semibold"
                  :class="isDark ? 'text-white' : 'text-slate-900'"
                >
                  Recent activity
                </h3>
                <p
                  class="text-xs mt-0.5"
                  :class="isDark ? 'text-white/50' : 'text-slate-400'"
                >
                  Latest changes across content and data
                </p>
              </div>
              <NuxtLink
                to="/admin/system/activity"
                class="text-xs font-medium transition-colors text-primary hover:opacity-80"
              >
                View all
              </NuxtLink>
            </div>

            <div v-if="stats.recentActivity?.length" class="space-y-1">
              <div
                v-for="item in stats.recentActivity.slice(0, 8)"
                :key="item.id"
                class="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors"
                :class="isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50'"
              >
                <div
                  class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  :class="
                    item.action === 'created'
                      ? (isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600')
                      : item.action === 'updated'
                        ? (isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600')
                        : (isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600')
                  "
                >
                  <UIcon :name="actionIcon(item.action)" class="h-3.5 w-3.5" />
                </div>

                <div class="min-w-0 flex-1">
                  <p
                    class="truncate text-sm"
                    :class="isDark ? 'text-white/90' : 'text-slate-700'"
                  >
                    <span class="font-medium" :class="isDark ? 'text-white' : 'text-slate-900'">{{ item.entityName || typeLabel(item.entityType) }}</span>
                    <span class="mx-1.5 opacity-40">--</span>
                    <span class="capitalize">{{ item.action }}</span>
                  </p>
                  <p
                    class="text-xs"
                    :class="isDark ? 'text-white/35' : 'text-slate-400'"
                  >
                    {{ typeLabel(item.entityType) }}
                  </p>
                </div>

                <span
                  class="shrink-0 text-xs tabular-nums"
                  :class="isDark ? 'text-white/30' : 'text-slate-400'"
                >
                  {{ timeAgo(item.createdAt) }}
                </span>
              </div>
            </div>

            <AdminEmptyState
              v-else
              icon="i-heroicons-clock"
              title="No activity yet"
              description="Changes will appear here once content or settings are updated."
            />
          </div>
        </div>

        <!-- Right column -->
        <div class="space-y-5">
          <!-- Status card -->
          <div
            class="rounded-xl border p-5"
            :class="isDark ? 'bg-[hsl(222.34,10.43%,12.27%)] border-[hsl(240,3.7%,22%)]' : 'bg-white border-slate-200'"
          >
            <h3
              class="mb-4 text-sm font-semibold"
              :class="isDark ? 'text-white' : 'text-slate-900'"
            >
              System status
            </h3>

            <div class="space-y-0.5">
              <div
                v-for="signal in statusSignals"
                :key="signal.label"
                class="flex items-center justify-between rounded-lg px-2 py-2"
                :class="isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50'"
              >
                <span
                  class="text-sm"
                  :class="isDark ? 'text-white/60' : 'text-slate-500'"
                >
                  {{ signal.label }}
                </span>
                <span
                  class="text-sm font-medium tabular-nums"
                  :class="
                    signal.tone === 'warning'
                      ? (isDark ? 'text-amber-400' : 'text-amber-600')
                      : (isDark ? 'text-white/90' : 'text-slate-700')
                  "
                >
                  {{ signal.value }}
                </span>
              </div>
            </div>
          </div>

          <!-- Top Copied strings -->
          <div
            class="rounded-xl border p-5"
            :class="isDark ? 'bg-[hsl(222.34,10.43%,12.27%)] border-[hsl(240,3.7%,22%)]' : 'bg-white border-slate-200'"
          >
            <div class="mb-4">
              <h3
                class="text-sm font-semibold"
                :class="isDark ? 'text-white' : 'text-slate-900'"
              >
                Top copied strings
              </h3>
              <p
                class="text-xs mt-0.5"
                :class="isDark ? 'text-white/50' : 'text-slate-400'"
              >
                Most copied strings this period
              </p>
            </div>

            <AdminChartsHorizontalBarChart
              v-if="topDemandChartData.length"
              :data="topDemandChartData"
              color="#10b981"
            />
            <AdminEmptyState
              v-else
              icon="i-heroicons-fire"
              title="No demand data"
              description="Copied strings will appear here once users start pulling data."
            />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const isDark = useIsDark()
const { apiFetch } = useApi()
const { user } = useAuth()
const { notifications: notifItems, refresh: notifRefresh } = useAdminNotifications()

const greeting = computed(() => {
  const h = new Date().getHours()
  const name = user.value?.username || 'Admin'
  if (h < 12) return `Good morning, ${name}`
  if (h < 18) return `Good afternoon, ${name}`
  return `Good evening, ${name}`
})

const quickActions = [
  { label: 'Profiles', subtitle: 'Manage import strings', icon: 'i-heroicons-rectangle-stack', to: '/admin/strings/profiles' },
  { label: 'Changelog', subtitle: 'Write an update', icon: 'i-heroicons-document-text', to: '/admin/content/changelog' },
  { label: 'Analytics', subtitle: 'View traffic stats', icon: 'i-heroicons-chart-bar', to: '/admin/system/stats' },
  { label: 'GitHub', subtitle: 'Sync and releases', icon: 'i-simple-icons-github', to: '/admin/system/github' },
]

interface ActivityItem {
  id: number
  action: string
  entityType: string
  entityName: string
  createdAt: string | number | Date | null
}

interface TopCopiedItem {
  string_type: string
  string_id: number
  copies: number
  name: string
}

interface Stats {
  profiles: number
  wowupStrings: number
  layouts: number
  changelogs: number
  copiesLast7Days: number
  uniqueVisitors: number
  uniqueVisitorsLast7Days?: number
  uniquePageVisitorsLast7Days?: number
  recentActivity: ActivityItem[]
  dailyCopies: Array<{ day: string; count: number }>
  totalCopies?: number
  totalActivities?: number
  pageViewsLast7Days?: number
  pageViewTrend?: number
  copyTrend?: number
  users?: number
  apiCallsLast7Days?: number
  outdatedProfiles?: number
  outdatedLayouts?: number
  latestProfileUpdateAt?: string | number | Date | null
  latestWowupUpdateAt?: string | number | Date | null
  latestLayoutUpdateAt?: string | number | Date | null
  lastPublishedAt?: string | number | Date | null
  topCopied?: TopCopiedItem[]
}

type DashboardModuleId =
  | 'release-focus'
  | 'control-center'
  | 'watchlist'
  | 'release-lane'
  | 'recent-activity'
  | 'top-demand'
  | 'traffic-snapshot'

const DASHBOARD_LAYOUT_STORAGE_KEY = 'admin-dashboard-layout-v2'
const defaultDashboardOrder: DashboardModuleId[] = [
  'release-focus',
  'control-center',
  'watchlist',
  'release-lane',
  'recent-activity',
  'top-demand',
  'traffic-snapshot',
]

const dashboardModuleMeta: Record<DashboardModuleId, {
  id: DashboardModuleId
  title: string
  description: string
  icon: string
  layoutClass?: string
}> = {
  'release-focus': {
    id: 'release-focus',
    title: 'Release focus',
    description: 'The current release lane without the extra dashboard noise.',
    icon: 'i-heroicons-bolt',
    layoutClass: 'admin-dashboard-module--feature',
  },
  'control-center': {
    id: 'control-center',
    title: 'Control center',
    description: 'Quick actions, refresh pulse and the things that matter next.',
    icon: 'i-heroicons-command-line',
  },
  watchlist: {
    id: 'watchlist',
    title: 'Watchlist',
    description: 'Compact signal stack for release, freshness, recent updates and cadence.',
    icon: 'i-heroicons-shield-check',
  },
  'release-lane': {
    id: 'release-lane',
    title: 'Release lane',
    description: 'A calmer timeline for publish, profile and layout movement.',
    icon: 'i-heroicons-rocket-launch',
  },
  'recent-activity': {
    id: 'recent-activity',
    title: 'Recent activity',
    description: 'Latest changes across content and data.',
    icon: 'i-heroicons-clock',
  },
  'top-demand': {
    id: 'top-demand',
    title: 'Top demand',
    description: 'The strings people currently pull the most.',
    icon: 'i-heroicons-fire',
  },
  'traffic-snapshot': {
    id: 'traffic-snapshot',
    title: 'Traffic snapshot',
    description: 'Views, visitors and copy momentum for the last seven days.',
    icon: 'i-heroicons-chart-bar',
    layoutClass: 'admin-dashboard-module--panorama',
  },
}

const stats = ref<Stats | null>(null)
const refreshing = ref(false)
const moduleOrder = ref<DashboardModuleId[]>([...defaultDashboardOrder])
const draggedModuleId = ref<DashboardModuleId | null>(null)
const dragTargetId = ref<DashboardModuleId | null>(null)

const REFRESH_INTERVAL = 60
const nextRefresh = ref(REFRESH_INTERVAL)
let refreshTimer: ReturnType<typeof setInterval>

const versionData = ref<{ latestVersion: string; localVersion: string | null; isUpToDate: boolean } | null>(null)

const latestActivity = computed(() => stats.value?.recentActivity?.[0] ?? null)
const totalStaleStrings = computed(() => (stats.value?.outdatedProfiles || 0) + (stats.value?.outdatedLayouts || 0))
const lastActivityText = computed(() => latestActivity.value ? `Latest change ${timeAgo(latestActivity.value.createdAt)}` : '')
const versionStatusChip = computed(() => {
  if (!versionData.value) return 'unknown'
  return versionData.value.isUpToDate ? 'current' : `v${versionData.value.latestVersion}`
})

const overviewCards = computed(() => {
  const data = stats.value
  if (!data) return []

  const stale = totalStaleStrings.value
  const staleHint = stale
    ? `${data.outdatedProfiles || 0} profiles · ${data.outdatedLayouts || 0} layouts older than 30d`
    : `${data.profiles + data.wowupStrings + data.layouts} active strings checked`

  const releaseValue = !versionData.value
    ? 'Unknown'
    : versionData.value.isUpToDate
      ? 'Current'
      : `v${versionData.value.latestVersion}`

  const releaseHint = !versionData.value
    ? 'GitHub release state is currently unavailable'
    : versionData.value.isUpToDate
      ? `Local ${versionData.value.localVersion || versionData.value.latestVersion} matches GitHub`
      : `Local ${versionData.value.localVersion || 'unknown'} is behind GitHub`

  return [
    {
      label: 'Release',
      value: releaseValue,
      icon: 'i-heroicons-rocket-launch',
      tone: versionData.value && !versionData.value.isUpToDate ? ('warning' as const) : ('brand' as const),
      to: '/admin/system/github',
      hint: releaseHint,
      trend: null,
    },
    {
      label: 'Freshness',
      value: stale,
      icon: 'i-heroicons-shield-exclamation',
      tone: stale ? ('warning' as const) : ('success' as const),
      to: '/admin/system/stats',
      hint: staleHint,
      trend: null,
    },
    {
      label: 'Copies 7d',
      value: data.copiesLast7Days || 0,
      icon: 'i-heroicons-bolt',
      tone: 'success' as const,
      to: '/admin/system/stats',
      hint: `${data.pageViewsLast7Days || 0} views · ${data.uniquePageVisitorsLast7Days || 0} visitors`,
      trend: data.copyTrend ?? null,
    },
    {
      label: 'Alerts',
      value: notifItems.value.length,
      icon: 'i-heroicons-bell-alert',
      tone: notifItems.value.length ? ('warning' as const) : ('success' as const),
      to: '/admin/system/activity',
      hint: notifItems.value.length ? 'Open notices need attention' : 'No active admin alerts',
      trend: null,
    },
  ]
})

const releaseFocusCards = computed(() => {
  const data = stats.value
  if (!data) return []

  const latestPublishTitle = data.lastPublishedAt ? timeAgo(data.lastPublishedAt) : `${data.changelogs} updates`
  const latestPublishDescription = data.lastPublishedAt
    ? 'Latest published changelog entry'
    : 'No published update recorded yet.'

  return [
    {
      eyebrow: 'Inventory',
      title: `${data.profiles + data.wowupStrings + data.layouts}`,
      description: `${data.profiles} profiles · ${data.wowupStrings} WowUp · ${data.layouts} layouts`,
    },
    {
      eyebrow: 'Latest publish',
      title: latestPublishTitle,
      description: latestPublishDescription,
    },
    {
      eyebrow: 'Profiles',
      title: data.latestProfileUpdateAt ? timeAgo(data.latestProfileUpdateAt) : 'No data',
      description: `${data.profiles} addon profiles tracked in the current inventory`,
    },
    {
      eyebrow: 'WowUp',
      title: data.latestWowupUpdateAt ? timeAgo(data.latestWowupUpdateAt) : 'No data',
      description: `${data.wowupStrings} package strings ready for distribution`,
    },
  ]
})

const topDemandItems = computed(() => (stats.value?.topCopied || []).slice(0, 4))
const topDemandChartData = computed(() =>
  topDemandItems.value.map(item => ({ label: item.name, value: item.copies }))
)

const trafficCards = computed(() => {
  const data = stats.value
  if (!data) return []

  return [
    {
      label: 'Views 7d',
      value: data.pageViewsLast7Days || 0,
      hint: 'Public page traffic',
    },
    {
      label: 'Visitors 7d',
      value: data.uniquePageVisitorsLast7Days || 0,
      hint: 'Unique page visitors',
    },
    {
      label: 'Copies 7d',
      value: data.copiesLast7Days || 0,
      hint: 'String copy events',
    },
  ]
})

function buildDailySeries(source: Array<{ day: string; count: number | string }> | undefined, days: number) {
  const endDate = new Date()
  endDate.setHours(0, 0, 0, 0)

  const countByDay = new Map(
    (source || []).map(item => [item.day, Number(item.count) || 0]),
  )

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(endDate)
    date.setDate(endDate.getDate() - (days - 1 - index))
    const day = date.toISOString().slice(0, 10)

    return {
      day,
      count: countByDay.get(day) ?? 0,
    }
  })
}

const copySeries14 = computed(() => buildDailySeries(stats.value?.dailyCopies, 14))
const last7Copies = computed(() => copySeries14.value.slice(-7))
const trafficChartData = computed(() =>
  last7Copies.value.map(d => {
    try {
      return { label: new Date(d.day).toLocaleDateString('en', { weekday: 'short' }).slice(0, 2), value: d.count }
    } catch {
      return { label: d.day.slice(-2), value: d.count }
    }
  })
)
const trafficTrendPills = computed(() => {
  const data = stats.value
  if (!data) return []

  return [
    {
      label: 'Views',
      value: formatTrend(data.pageViewTrend),
      tone: typeof data.pageViewTrend === 'number' && data.pageViewTrend < 0 ? 'admin-pill--warning' : 'admin-pill--success',
    },
    {
      label: 'Copies',
      value: formatTrend(data.copyTrend),
      tone: typeof data.copyTrend === 'number' && data.copyTrend < 0 ? 'admin-pill--warning' : 'admin-pill--success',
    },
  ]
})

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
    label: 'Stale strings',
    value: totalStaleStrings.value ? `${totalStaleStrings.value} open` : 'Clear',
    tone: totalStaleStrings.value > 0 ? 'warning' : 'neutral',
  },
  {
    label: 'Profiles',
    value: stats.value?.latestProfileUpdateAt ? timeAgo(stats.value.latestProfileUpdateAt) : 'No data',
    tone: 'neutral',
  },
  {
    label: 'WowUp',
    value: stats.value?.latestWowupUpdateAt ? timeAgo(stats.value.latestWowupUpdateAt) : 'No data',
    tone: 'neutral',
  },
  {
    label: 'Layouts',
    value: stats.value?.latestLayoutUpdateAt ? timeAgo(stats.value.latestLayoutUpdateAt) : 'No data',
    tone: 'neutral',
  },
  {
    label: 'Last publish',
    value: stats.value?.lastPublishedAt ? timeAgo(stats.value.lastPublishedAt) : 'None',
    tone: 'neutral',
  },
  {
    label: 'Last change',
    value: latestActivity.value ? timeAgo(latestActivity.value.createdAt) : 'None',
    tone: 'neutral',
  },
  {
    label: 'Refresh',
    value: `${nextRefresh.value}s`,
    tone: 'neutral',
  },
])

const controlCenterCards = computed(() => {
  const data = stats.value
  return [
    {
      label: 'Sync state',
      value: versionData.value
        ? (versionData.value.isUpToDate ? 'Ready' : 'Review')
        : 'Unknown',
      hint: versionData.value
        ? (versionData.value.isUpToDate
            ? 'Local release matches GitHub'
            : `GitHub is ahead on v${versionData.value.latestVersion}`)
        : 'Release status unavailable right now',
    },
    {
      label: 'Next pulse',
      value: `${nextRefresh.value}s`,
      hint: `${notifItems.value.length || 0} alerts waiting · auto refresh running`,
    },
    {
      label: 'Audience',
      value: data?.uniquePageVisitorsLast7Days || 0,
      hint: `${data?.pageViewsLast7Days || 0} views in the last seven days`,
    },
  ]
})

const controlCenterLinks = computed(() => {
  const data = stats.value

  return [
    {
      label: 'Publish update',
      meta: data?.lastPublishedAt
        ? `Last published ${timeAgo(data.lastPublishedAt)}`
        : 'No changelog entry has been published yet',
      to: '/admin/content/changelog',
      icon: 'i-heroicons-document-text',
      tone: 'admin-tone-brand',
    },
    {
      label: 'Check GitHub sync',
      meta: versionData.value?.isUpToDate
        ? 'Repository and local release are aligned'
        : 'Version check suggests a sync review',
      to: '/admin/system/github',
      icon: 'i-simple-icons-github',
      tone: versionData.value?.isUpToDate ? 'admin-tone-success' : 'admin-tone-warning',
    },
    {
      label: 'Review traffic',
      meta: `${data?.apiCallsLast7Days || 0} API calls and ${data?.copiesLast7Days || 0} copies this week`,
      to: '/admin/system/stats',
      icon: 'i-heroicons-chart-bar',
      tone: 'admin-tone-violet',
    },
  ]
})

const releaseLaneItems = computed(() => {
  const data = stats.value

  return [
    {
      label: 'Last publish',
      value: data?.lastPublishedAt ? timeAgo(data.lastPublishedAt) : 'Not published',
      caption: data?.lastPublishedAt ? absoluteDate(data.lastPublishedAt) : 'Changelog pending',
      description: data?.lastPublishedAt
        ? 'Public update text is already live and ready for users.'
        : 'Your next changelog entry still needs a publish moment.',
      badge: data?.lastPublishedAt ? 'Published' : 'Pending',
      tone: data?.lastPublishedAt ? 'admin-pill--success' : 'admin-pill--warning',
    },
    {
      label: 'Profiles',
      value: data?.latestProfileUpdateAt ? timeAgo(data.latestProfileUpdateAt) : 'No data',
      caption: data?.latestProfileUpdateAt ? absoluteDate(data.latestProfileUpdateAt) : 'No profile sync yet',
      description: `${data?.profiles || 0} addon profiles tracked in the current inventory.`,
      badge: data?.outdatedProfiles ? `${data.outdatedProfiles} stale` : 'Fresh',
      tone: data?.outdatedProfiles ? 'admin-pill--warning' : 'admin-pill--success',
    },
    {
      label: 'Layouts',
      value: data?.latestLayoutUpdateAt ? timeAgo(data.latestLayoutUpdateAt) : 'No data',
      caption: data?.latestLayoutUpdateAt ? absoluteDate(data.latestLayoutUpdateAt) : 'No layout sync yet',
      description: `${data?.layouts || 0} class and spec layouts are available for distribution.`,
      badge: data?.outdatedLayouts ? `${data.outdatedLayouts} stale` : 'Fresh',
      tone: data?.outdatedLayouts ? 'admin-pill--warning' : 'admin-pill--success',
    },
    {
      label: 'WowUp',
      value: data?.latestWowupUpdateAt ? timeAgo(data.latestWowupUpdateAt) : 'No data',
      caption: data?.latestWowupUpdateAt ? absoluteDate(data.latestWowupUpdateAt) : 'No WowUp sync yet',
      description: `${data?.wowupStrings || 0} package strings are ready for the updater flow.`,
      badge: (data?.wowupStrings || 0) > 0 ? 'Ready' : 'Empty',
      tone: (data?.wowupStrings || 0) > 0 ? 'admin-pill--success' : 'admin-pill--warning',
    },
  ]
})

const orderedModules = computed(() =>
  normalizeDashboardOrder(moduleOrder.value).map(id => dashboardModuleMeta[id]),
)

function normalizeDashboardOrder(order: DashboardModuleId[]) {
  const seen = new Set<DashboardModuleId>()
  const normalized = order.filter((id): id is DashboardModuleId => {
    if (!(id in dashboardModuleMeta) || seen.has(id)) return false
    seen.add(id)
    return true
  })

  for (const id of defaultDashboardOrder) {
    if (!seen.has(id)) normalized.push(id)
  }

  return normalized
}

function persistDashboardLayout() {
  if (!import.meta.client) return
  window.localStorage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, JSON.stringify(moduleOrder.value))
}

function resetDashboardLayout() {
  moduleOrder.value = [...defaultDashboardOrder]
  persistDashboardLayout()
}

function handleModuleDragStart(id: DashboardModuleId) {
  draggedModuleId.value = id
  dragTargetId.value = id
}

function handleModuleDragOver(id: DashboardModuleId) {
  if (!draggedModuleId.value || draggedModuleId.value === id) return
  dragTargetId.value = id
}

function handleModuleDrop(id: DashboardModuleId) {
  const dragged = draggedModuleId.value
  if (!dragged || dragged === id) {
    handleModuleDragEnd()
    return
  }

  const next = [...moduleOrder.value]
  const fromIndex = next.indexOf(dragged)
  const toIndex = next.indexOf(id)

  if (fromIndex === -1 || toIndex === -1) {
    handleModuleDragEnd()
    return
  }

  next.splice(fromIndex, 1)
  next.splice(toIndex, 0, dragged)
  moduleOrder.value = normalizeDashboardOrder(next)
  persistDashboardLayout()
  handleModuleDragEnd()
}

function handleModuleDragEnd() {
  draggedModuleId.value = null
  dragTargetId.value = null
}

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
    interface GithubStatus { latestVersion?: string, localVersion?: string | null }
    const result = await apiFetch<GithubStatus>('/api/v1/admin/github/status')
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


function formatTrend(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'No data'
  if (value === 0) return 'Flat'
  return `${value > 0 ? '+' : ''}${value}%`
}

// timeAgo, absoluteDate, activityTone, actionIcon, entityTypeLabel
// are auto-imported from utils/adminHelpers.ts
const typeLabel = entityTypeLabel

onMounted(async () => {
  if (import.meta.client) {
    const stored = window.localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY)
    if (stored) {
      try {
        moduleOrder.value = normalizeDashboardOrder(JSON.parse(stored) as DashboardModuleId[])
      } catch {
        moduleOrder.value = [...defaultDashboardOrder]
      }
    }
  }

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
