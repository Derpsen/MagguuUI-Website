<template>
  <div class="space-y-6">
    <AdminPageHeader
      icon="i-heroicons-squares-2x2"
      eyebrow="Overview"
      title="Dashboard"
      description="Release health, string freshness and the latest activity in one compact view."
    >
      <template #meta>
        <div class="flex flex-wrap items-center gap-2">
          <span v-if="stats" class="admin-pill">Auto refresh {{ nextRefresh }}s</span>
          <span v-if="lastActivityText && stats" class="admin-pill">{{ lastActivityText }}</span>
        </div>
      </template>

      <template #actions>
        <UButton size="sm" color="neutral" variant="ghost" icon="i-heroicons-arrow-path" :loading="refreshing" @click="refreshAll">
          Refresh
        </UButton>
        <UButton size="sm" color="neutral" variant="ghost" icon="i-heroicons-squares-2x2" @click="resetDashboardLayout">
          Reset layout
        </UButton>
      </template>
    </AdminPageHeader>

    <div v-if="!stats" class="space-y-5">
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div v-for="item in 4" :key="`metric-${item}`" class="admin-metric-card">
          <div class="h-24 rounded-2xl skeleton bg-slate-200/70 dark:bg-slate-800/70" />
        </div>
      </div>

      <div class="admin-filterbar">
        <div class="h-5 w-32 rounded skeleton bg-slate-200/70 dark:bg-slate-800/70" />
        <div class="h-5 w-24 rounded skeleton bg-slate-200/70 dark:bg-slate-800/70" />
        <div class="h-5 w-28 rounded skeleton bg-slate-200/70 dark:bg-slate-800/70" />
        <div class="ml-auto h-5 w-52 rounded skeleton bg-slate-200/70 dark:bg-slate-800/70" />
      </div>

      <div class="grid gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(320px,0.78fr)]">
        <AdminPanel title="Release focus" description="Preparing the current release picture." icon="i-heroicons-bolt">
          <div class="space-y-4">
            <div class="h-10 w-64 rounded-xl skeleton bg-slate-200/70 dark:bg-slate-800/70" />
            <div class="grid gap-3 sm:grid-cols-2">
              <div v-for="item in 4" :key="`focus-${item}`" class="admin-subpanel">
                <div class="h-3 w-20 rounded skeleton bg-slate-200/70 dark:bg-slate-800/70" />
                <div class="mt-3 h-6 w-28 rounded skeleton bg-slate-200/70 dark:bg-slate-800/70" />
                <div class="mt-2 h-3 w-full rounded skeleton bg-slate-200/70 dark:bg-slate-800/70" />
              </div>
            </div>
          </div>
        </AdminPanel>

        <AdminPanel title="Watchlist" description="Loading operational signals." icon="i-heroicons-shield-check">
          <div class="space-y-2">
            <div v-for="i in 9" :key="`watch-${i}`" class="admin-status-row">
              <div class="h-3 w-20 rounded skeleton bg-slate-200/70 dark:bg-slate-800/70" />
              <div class="h-3 w-24 rounded skeleton bg-slate-200/70 dark:bg-slate-800/70" />
            </div>
          </div>
        </AdminPanel>
      </div>

      <div class="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
        <AdminPanel title="Recent activity" description="Loading the latest changes." icon="i-heroicons-clock">
          <div class="space-y-2">
            <div v-for="i in 5" :key="`activity-${i}`" class="admin-activity-row">
              <div class="h-9 w-9 rounded-xl skeleton bg-slate-200/70 dark:bg-slate-800/70" />
              <div class="flex-1 space-y-2">
                <div class="h-3 w-40 rounded skeleton bg-slate-200/70 dark:bg-slate-800/70" />
                <div class="h-3 w-24 rounded skeleton bg-slate-200/70 dark:bg-slate-800/70" />
              </div>
            </div>
          </div>
        </AdminPanel>

        <div class="space-y-5">
          <AdminPanel title="Top demand" description="Loading copy demand." icon="i-heroicons-fire">
            <div class="space-y-2">
              <div v-for="i in 3" :key="`demand-${i}`" class="admin-row">
                <div class="flex-1 space-y-2">
                  <div class="h-3 w-32 rounded skeleton bg-slate-200/70 dark:bg-slate-800/70" />
                  <div class="h-3 w-24 rounded skeleton bg-slate-200/70 dark:bg-slate-800/70" />
                </div>
                <div class="h-5 w-12 rounded skeleton bg-slate-200/70 dark:bg-slate-800/70" />
              </div>
            </div>
          </AdminPanel>

          <AdminPanel title="Traffic snapshot" description="Loading traffic and momentum." icon="i-heroicons-chart-bar">
            <div class="grid gap-3 sm:grid-cols-3">
              <div v-for="i in 3" :key="`traffic-${i}`" class="admin-subpanel">
                <div class="h-3 w-16 rounded skeleton bg-slate-200/70 dark:bg-slate-800/70" />
                <div class="mt-3 h-6 w-20 rounded skeleton bg-slate-200/70 dark:bg-slate-800/70" />
              </div>
            </div>
            <div class="mt-5 h-32 rounded-2xl skeleton bg-slate-200/70 dark:bg-slate-800/70" />
          </AdminPanel>
        </div>
      </div>
    </div>

    <template v-else>
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

      <div class="admin-filterbar">
        <div class="flex flex-wrap items-center gap-2">
          <span class="admin-context-chip">Release radar</span>
          <span class="admin-pill" :class="versionData && !versionData.isUpToDate ? 'admin-pill--warning' : 'admin-pill--success'">
            Version {{ versionStatusChip }}
          </span>
          <span class="admin-pill" :class="notifItems.length ? 'admin-pill--warning' : 'admin-pill--success'">
            Alerts {{ notifItems.length ? `${notifItems.length} open` : 'clear' }}
          </span>
          <span class="admin-pill" :class="totalStaleStrings ? 'admin-pill--warning' : 'admin-pill--success'">
            Stale {{ totalStaleStrings }}
          </span>
        </div>

        <div class="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          <span>{{ stats.apiCallsLast7Days || 0 }} API calls 7d</span>
          <span>•</span>
          <span>{{ stats.totalActivities || 0 }} tracked changes</span>
          <span>•</span>
          <span>{{ stats.uniquePageVisitorsLast7Days || 0 }} visitors 7d</span>
        </div>
      </div>

      <div class="admin-dashboard-grid">
        <section
          v-for="module in orderedModules"
          :key="module.id"
          class="admin-dashboard-module"
          :class="[
            module.layoutClass,
            draggedModuleId === module.id ? 'admin-dashboard-module--dragging' : '',
            dragTargetId === module.id ? 'admin-dashboard-module--drop' : '',
          ]"
          draggable="true"
          @dragstart="handleModuleDragStart(module.id)"
          @dragover.prevent="handleModuleDragOver(module.id)"
          @drop.prevent="handleModuleDrop(module.id)"
          @dragend="handleModuleDragEnd"
        >
          <AdminPanel :title="module.title" :description="module.description" :icon="module.icon">
            <template #actions>
              <span class="admin-module-hint hidden xl:inline-flex">
                <UIcon name="i-heroicons-arrows-up-down" class="h-3.5 w-3.5" />
                Drag
              </span>
            </template>

            <template v-if="module.id === 'release-focus'">
              <div class="space-y-5">
                <div class="flex flex-wrap items-center gap-3">
                  <UButton to="/admin/strings/profiles" icon="i-heroicons-plus-circle">
                    Profiles
                  </UButton>
                  <UButton to="/admin/content/changelog" color="neutral" variant="ghost" icon="i-heroicons-document-text">
                    Changelog
                  </UButton>
                  <UButton to="/admin/system/github" color="neutral" variant="ghost" icon="i-simple-icons-github">
                    GitHub
                  </UButton>
                </div>

                <div class="grid gap-3 sm:grid-cols-2">
                  <div v-for="item in releaseFocusCards" :key="item.eyebrow" class="admin-subpanel">
                    <p class="admin-row__eyebrow">{{ item.eyebrow }}</p>
                    <p class="mt-3 text-lg font-semibold tracking-tight text-slate-950 dark:text-white">{{ item.title }}</p>
                    <p class="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{{ item.description }}</p>
                  </div>
                </div>
              </div>
            </template>

            <template v-else-if="module.id === 'control-center'">
              <div class="space-y-4">
                <div class="grid gap-3 sm:grid-cols-3">
                  <div v-for="card in controlCenterCards" :key="card.label" class="admin-kpi-tile">
                    <p class="admin-kpi-tile__label">{{ card.label }}</p>
                    <p class="admin-kpi-tile__value">{{ card.value }}</p>
                    <p class="admin-kpi-tile__note">{{ card.hint }}</p>
                  </div>
                </div>

                <div class="admin-list">
                  <NuxtLink v-for="item in controlCenterLinks" :key="item.label" :to="item.to" class="admin-row">
                    <div class="flex min-w-0 flex-1 items-start gap-3">
                      <div class="admin-command__item-icon" :class="item.tone">
                        <UIcon :name="item.icon" class="h-4 w-4" />
                      </div>

                      <div class="admin-row__content">
                        <p class="admin-row__title">{{ item.label }}</p>
                        <p class="admin-row__meta">{{ item.meta }}</p>
                      </div>
                    </div>

                    <UIcon name="i-heroicons-arrow-up-right" class="mt-0.5 h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                  </NuxtLink>
                </div>
              </div>
            </template>

            <template v-else-if="module.id === 'watchlist'">
              <div class="admin-status-list">
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
            </template>

            <template v-else-if="module.id === 'release-lane'">
              <div class="admin-list">
                <div v-for="item in releaseLaneItems" :key="item.label" class="admin-row">
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <p class="admin-row__title">{{ item.label }}</p>
                      <span class="admin-pill" :class="item.tone">{{ item.badge }}</span>
                    </div>
                    <p class="admin-row__meta">{{ item.description }}</p>
                  </div>

                  <div class="shrink-0 text-right">
                    <p class="text-sm font-semibold text-slate-950 dark:text-white">{{ item.value }}</p>
                    <p class="text-xs text-slate-500 dark:text-slate-400">{{ item.caption }}</p>
                  </div>
                </div>
              </div>
            </template>

            <template v-else-if="module.id === 'recent-activity'">
              <div v-if="stats.recentActivity?.length" class="space-y-2">
                <div
                  v-for="item in stats.recentActivity.slice(0, 6)"
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
            </template>

            <template v-else-if="module.id === 'top-demand'">
              <div v-if="topDemandItems.length" class="admin-list">
                <div v-for="item in topDemandItems" :key="`${item.string_type}-${item.name}`" class="admin-row">
                  <div class="admin-row__content">
                    <p class="admin-row__title">{{ item.name }}</p>
                    <p class="admin-row__meta">{{ typeLabel(item.string_type) }}</p>
                  </div>
                  <div class="admin-row__actions">
                    <UBadge color="info" variant="subtle" size="xs">{{ item.copies }}x</UBadge>
                  </div>
                </div>
              </div>

              <AdminEmptyState
                v-else
                icon="i-heroicons-fire"
                title="No demand data"
                description="Copied strings will appear here once users start pulling data."
              />
            </template>

            <template v-else-if="module.id === 'traffic-snapshot'">
              <div class="grid gap-3 sm:grid-cols-3">
                <div v-for="card in trafficCards" :key="card.label" class="admin-subpanel">
                  <p class="admin-row__eyebrow">{{ card.label }}</p>
                  <p class="mt-3 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{{ card.value }}</p>
                  <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ card.hint }}</p>
                </div>
              </div>

              <div v-if="trafficTrendPills.length" class="mt-4 flex flex-wrap gap-2">
                <span
                  v-for="pill in trafficTrendPills"
                  :key="pill.label"
                  class="admin-pill"
                  :class="pill.tone"
                >
                  {{ pill.label }} {{ pill.value }}
                </span>
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
                    <div v-for="day in last7Copies" :key="day.day" class="flex h-full flex-1 flex-col items-center gap-2">
                      <span class="text-[11px] font-medium text-slate-500 dark:text-slate-400">{{ day.count }}</span>
                      <div class="flex w-full flex-1 items-end">
                        <div
                          class="w-full rounded-t-xl bg-blue-500/80 transition hover:bg-blue-500"
                          :style="{ height: `${barHeight(day.count, maxLast7)}%`, minHeight: day.count > 0 ? '10px' : '4px' }"
                        />
                      </div>
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
            </template>
          </AdminPanel>
        </section>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const { apiFetch } = useApi()
const { notifications: notifItems, refresh: notifRefresh } = useAdminNotifications()

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
const maxLast7 = computed(() => Math.max(1, ...last7Copies.value.map(day => day.count)))
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

function formatTrend(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'No data'
  if (value === 0) return 'Flat'
  return `${value > 0 ? '+' : ''}${value}%`
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

function timeAgo(value: string | number | Date | null) {
  if (!value) return ''
  const date = value instanceof Date ? value : typeof value === 'number' ? new Date(value * 1000) : new Date(value)
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

function absoluteDate(value: string | number | Date | null) {
  if (!value) return ''
  const date = value instanceof Date ? value : typeof value === 'number' ? new Date(value * 1000) : new Date(value)
  return date.toLocaleDateString('en', { day: '2-digit', month: 'short' })
}

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
