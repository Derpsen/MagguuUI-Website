<template>
  <div class="space-y-6">
    <AdminPageHeader
      icon="i-heroicons-chart-bar"
      eyebrow="System"
      title="Analytics"
      description="Traffic, copies and API usage at a glance."
    >
      <template #meta>
        <span v-if="lastUpdatedText && !loading" class="admin-pill">{{ lastUpdatedText }}</span>
      </template>

      <template #actions>
        <UButton icon="i-heroicons-arrow-path" variant="ghost" color="neutral" :loading="loading" @click="refresh">
          Refresh
        </UButton>
      </template>
    </AdminPageHeader>

    <div class="admin-segmented w-fit">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="admin-segmented__button"
        :class="activeTab === tab.id ? 'admin-segmented__button--active' : ''"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Skeleton -->
    <div v-if="loading && !stats" class="space-y-6">
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div v-for="item in 4" :key="item" class="admin-metric-card">
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-2xl skeleton bg-slate-200/70 dark:bg-slate-800/70" />
            <div class="flex-1 space-y-2">
              <div class="h-7 w-16 rounded skeleton bg-slate-200/70 dark:bg-slate-800/70" />
              <div class="h-3 w-24 rounded skeleton bg-slate-200/70 dark:bg-slate-800/70" />
            </div>
          </div>
        </div>
      </div>
      <div class="grid gap-6 xl:grid-cols-2">
        <AdminPanel v-for="item in 2" :key="`sk-${item}`" title="Loading" icon="i-heroicons-chart-bar">
          <div class="h-48 rounded-2xl skeleton bg-slate-200/70 dark:bg-slate-800/70" />
        </AdminPanel>
      </div>
    </div>

    <template v-else-if="stats">
      <!-- Metric Cards -->
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          v-for="metric in activeMetrics"
          :key="metric.label"
          :label="metric.label"
          :value="metric.value"
          :icon="metric.icon"
          :tone="metric.tone"
          :trend="metric.trend"
        />
      </div>

      <!-- Overview Tab -->
      <template v-if="activeTab === 'overview'">
        <div class="grid gap-6 xl:grid-cols-2">
          <AdminPanel title="Page Views" description="Last 30 days" icon="i-heroicons-eye">
            <AdminChartsAreaChart :data="pageViewsChartData" color="#3b8bff" />
          </AdminPanel>

          <AdminPanel title="Copies" description="Last 30 days" icon="i-heroicons-clipboard-document">
            <AdminChartsAreaChart :data="copiesChartData" color="#10b981" />
          </AdminPanel>
        </div>

        <div class="grid gap-6 xl:grid-cols-2">
          <AdminPanel title="Top Referrers" description="Traffic sources with the most visits" icon="i-heroicons-link">
            <AdminChartsHorizontalBarChart
              v-if="referrerChartData.length"
              :data="referrerChartData"
              color="#8b5cf6"
            />
            <AdminEmptyState v-else icon="i-heroicons-link" title="No referrer data" description="Referrer sources will appear once traffic has been recorded." />
          </AdminPanel>

          <AdminPanel title="Top Pages" description="Most viewed public paths" icon="i-heroicons-document-text">
            <AdminChartsHorizontalBarChart
              v-if="topPagesChartData.length"
              :data="topPagesChartData"
              color="#3b8bff"
            />
            <AdminEmptyState v-else icon="i-heroicons-document-text" title="No page data" description="Top pages will appear once traffic has been recorded." />
          </AdminPanel>
        </div>
      </template>

      <!-- Visitors Tab -->
      <template v-else-if="activeTab === 'visitors'">
        <div class="grid gap-6 xl:grid-cols-3">
          <AdminPanel title="Devices" icon="i-heroicons-device-phone-mobile">
            <AdminChartsDoughnutChart
              v-if="deviceChartData.length"
              :data="deviceChartData"
              height="200px"
            />
            <AdminEmptyState v-else icon="i-heroicons-device-phone-mobile" title="No device data" description="Device breakdown will appear after visits." />
          </AdminPanel>

          <AdminPanel title="Browsers" icon="i-heroicons-window">
            <AdminChartsDoughnutChart
              v-if="browserChartData.length"
              :data="browserChartData"
              height="200px"
            />
            <AdminEmptyState v-else icon="i-heroicons-window" title="No browser data" description="Browser breakdown will appear after visits." />
          </AdminPanel>

          <AdminPanel title="Operating Systems" icon="i-heroicons-circle-stack">
            <AdminChartsDoughnutChart
              v-if="osChartData.length"
              :data="osChartData"
              height="200px"
            />
            <AdminEmptyState v-else icon="i-heroicons-circle-stack" title="No OS data" description="OS breakdown will appear after visits." />
          </AdminPanel>
        </div>

        <AdminPanel title="Hourly Page Views" description="Average pattern across the last 30 days" icon="i-heroicons-clock">
          <AdminChartsBarChart :data="hourlyPageViewsData" color="#3b8bff" />
        </AdminPanel>
      </template>

      <!-- Copies Tab -->
      <template v-else-if="activeTab === 'copies'">
        <div class="grid gap-6 xl:grid-cols-2">
          <AdminPanel title="Top Copied Strings" description="Highest demand across all string types" icon="i-heroicons-clipboard-document-list">
            <AdminChartsHorizontalBarChart
              v-if="topCopiedChartData.length"
              :data="topCopiedChartData"
              color="#10b981"
            />
            <AdminEmptyState v-else icon="i-heroicons-clipboard-document-list" title="No copy data" description="Popular strings will appear here once users start copying." />
          </AdminPanel>

          <AdminPanel title="Copies by Type" description="Relative volume per string category" icon="i-heroicons-squares-2x2">
            <AdminChartsDoughnutChart
              v-if="copiesByTypeData.length"
              :data="copiesByTypeData"
              height="200px"
            />
            <AdminEmptyState v-else icon="i-heroicons-squares-2x2" title="No type data" description="Copy type breakdown will appear after events are recorded." />
          </AdminPanel>
        </div>

        <AdminPanel title="Hourly Copies" description="Average hourly copy pattern across the last 30 days" icon="i-heroicons-clock">
          <AdminChartsBarChart :data="hourlyCopiesData" color="#10b981" />
        </AdminPanel>
      </template>

      <!-- API Tab -->
      <template v-else>
        <div class="grid gap-6 xl:grid-cols-2">
          <AdminPanel title="API Calls" description="Request volume across the last 30 days" icon="i-heroicons-server-stack">
            <AdminChartsAreaChart :data="apiChartData" color="#8b5cf6" />
          </AdminPanel>

          <AdminPanel title="Top Endpoints" description="Most requested API routes" icon="i-heroicons-bolt">
            <div v-if="stats.topEndpoints?.length" class="admin-list">
              <div v-for="endpoint in stats.topEndpoints" :key="`${endpoint.method}-${endpoint.endpoint}`" class="admin-row">
                <div class="admin-row__content">
                  <div class="flex flex-wrap items-center gap-2">
                    <UBadge :color="methodColor(endpoint.method)" variant="subtle" size="xs">{{ endpoint.method }}</UBadge>
                    <p class="admin-row__title font-mono">{{ endpoint.endpoint }}</p>
                  </div>
                </div>
                <div class="admin-row__actions">
                  <span class="text-sm font-medium text-slate-950 dark:text-white">{{ endpoint.calls }}</span>
                </div>
              </div>
            </div>
            <AdminEmptyState v-else icon="i-heroicons-bolt" title="No endpoint data" description="Endpoint usage appears after API requests have been recorded." />
          </AdminPanel>
        </div>

        <AdminPanel title="Average String Size" description="Average profile string size per addon" icon="i-heroicons-scale">
          <div v-if="stats.avgStringSizes?.length" class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div v-for="item in stats.avgStringSizes" :key="item.addon" class="admin-subpanel">
              <p class="admin-row__eyebrow">{{ item.addon }}</p>
              <p class="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{{ formatSize(item.avg_size) }}</p>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ item.count }} profiles</p>
            </div>
          </div>
          <AdminEmptyState v-else icon="i-heroicons-scale" title="No size data" description="Average size calculations will appear once profile data is available." />
        </AdminPanel>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const { apiFetch } = useApi()

type TabId = 'overview' | 'visitors' | 'copies' | 'api'

interface DailyPoint { day: string; count: number }
interface HourlyPoint { hour: number; views?: number; copies?: number }

interface StatsData {
  totalPageViews?: number
  uniquePageVisitors?: number
  pageViewsLast7Days?: number
  uniquePageVisitorsLast7Days?: number
  pageViewTrend?: number
  totalCopies?: number
  copiesLast7Days?: number
  uniqueVisitors?: number
  uniqueVisitorsLast7Days?: number
  copyTrend?: number
  totalApiCalls?: number
  apiCallsLast7Days?: number
  apiTrend?: number
  outdatedProfiles?: number
  outdatedLayouts?: number
  dailyPageViews?: DailyPoint[]
  dailyCopies?: DailyPoint[]
  dailyApi?: DailyPoint[]
  hourlyPageViews?: HourlyPoint[]
  hourlyCopies?: HourlyPoint[]
  topReferrers?: Array<{ referrer: string; visits: number }>
  topPages?: Array<{ path: string; views: number; unique_visitors: number }>
  deviceBreakdown?: Array<Record<string, any>>
  browserBreakdown?: Array<Record<string, any>>
  osBreakdown?: Array<Record<string, any>>
  topCopied?: Array<{ name: string; string_type: string; copies: number }>
  copiesByType?: Array<{ string_type: string; copies: number }>
  topEndpoints?: Array<{ method: string; endpoint: string; calls: number }>
  avgStringSizes?: Array<{ addon: string; avg_size: number; count: number }>
}

const loading = ref(true)
const stats = ref<StatsData | null>(null)
const activeTab = ref<TabId>('overview')
const tabs: Array<{ id: TabId; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'visitors', label: 'Visitors' },
  { id: 'copies', label: 'Copies' },
  { id: 'api', label: 'API' },
]

const lastLoaded = ref<Date | null>(null)
const lastUpdatedText = ref('')
let lastUpdatedTimer: ReturnType<typeof setInterval>

function updateLastUpdatedText() {
  if (!lastLoaded.value) return
  const seconds = Math.floor((Date.now() - lastLoaded.value.getTime()) / 1000)
  if (seconds < 10) lastUpdatedText.value = 'Updated just now'
  else if (seconds < 60) lastUpdatedText.value = `Updated ${seconds}s ago`
  else if (seconds < 3600) lastUpdatedText.value = `Updated ${Math.floor(seconds / 60)}m ago`
  else lastUpdatedText.value = `Updated ${Math.floor(seconds / 3600)}h ago`
}

async function refresh() {
  loading.value = true
  try {
    stats.value = await apiFetch('/api/v1/admin/stats')
    lastLoaded.value = new Date()
    updateLastUpdatedText()
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  refresh()
  lastUpdatedTimer = setInterval(updateLastUpdatedText, 10000)
})

onUnmounted(() => {
  clearInterval(lastUpdatedTimer)
})

// ── Chart Data Transforms ──────────────────────────

function formatDay(day: string): string {
  try {
    return new Date(day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return day.slice(-5)
  }
}

const pageViewsChartData = computed(() =>
  (stats.value?.dailyPageViews || []).map(d => ({ label: formatDay(d.day), value: d.count }))
)

const copiesChartData = computed(() =>
  (stats.value?.dailyCopies || []).map(d => ({ label: formatDay(d.day), value: d.count }))
)

const apiChartData = computed(() =>
  (stats.value?.dailyApi || []).map(d => ({ label: formatDay(d.day), value: d.count }))
)

const hourlyPageViewsData = computed(() =>
  Array.from({ length: 24 }, (_, h) => {
    const match = (stats.value?.hourlyPageViews || []).find(p => p.hour === h)
    return { label: `${String(h).padStart(2, '0')}:00`, value: Number(match?.views || 0) }
  })
)

const hourlyCopiesData = computed(() =>
  Array.from({ length: 24 }, (_, h) => {
    const match = (stats.value?.hourlyCopies || []).find(p => p.hour === h)
    return { label: `${String(h).padStart(2, '0')}:00`, value: Number(match?.copies || 0) }
  })
)

const referrerChartData = computed(() =>
  (stats.value?.topReferrers || []).map(r => ({ label: r.referrer || 'Direct', value: r.visits }))
)

const topPagesChartData = computed(() =>
  (stats.value?.topPages || []).map(p => ({ label: p.path, value: p.views }))
)

const topCopiedChartData = computed(() =>
  (stats.value?.topCopied || []).map(c => ({ label: `${c.name} (${c.string_type})`, value: c.copies }))
)

const deviceChartData = computed(() =>
  (stats.value?.deviceBreakdown || []).map(d => ({ label: d.device_type || 'Unknown', value: d.count }))
)

const browserChartData = computed(() =>
  (stats.value?.browserBreakdown || []).map(b => ({ label: b.browser || 'Unknown', value: b.count }))
)

const osChartData = computed(() =>
  (stats.value?.osBreakdown || []).map(o => ({ label: o.os || 'Unknown', value: o.count }))
)

const copiesByTypeData = computed(() =>
  (stats.value?.copiesByType || []).map(c => ({ label: c.string_type, value: c.copies }))
)

// ── Metric Cards ────────────────────────────────────

const activeMetrics = computed(() => {
  const v = stats.value
  if (!v) return []

  if (activeTab.value === 'overview') {
    return [
      { label: 'Page Views', value: v.totalPageViews || 0, icon: 'i-heroicons-eye', tone: 'brand' as const, trend: v.pageViewTrend ?? null },
      { label: 'Visitors', value: v.uniquePageVisitors || 0, icon: 'i-heroicons-user-group', tone: 'success' as const, trend: null },
      { label: 'Views 7d', value: v.pageViewsLast7Days || 0, icon: 'i-heroicons-calendar-days', tone: 'violet' as const, trend: v.pageViewTrend ?? null },
      { label: 'Visitors 7d', value: v.uniquePageVisitorsLast7Days || 0, icon: 'i-heroicons-users', tone: 'warning' as const, trend: null },
    ]
  }

  if (activeTab.value === 'visitors') {
    return [
      { label: 'Devices', value: v.deviceBreakdown?.length || 0, icon: 'i-heroicons-device-phone-mobile', tone: 'brand' as const, trend: null },
      { label: 'Browsers', value: v.browserBreakdown?.length || 0, icon: 'i-heroicons-window', tone: 'success' as const, trend: null },
      { label: 'Operating Systems', value: v.osBreakdown?.length || 0, icon: 'i-heroicons-circle-stack', tone: 'violet' as const, trend: null },
      { label: 'Visitors 30d', value: v.uniquePageVisitors || 0, icon: 'i-heroicons-user-group', tone: 'warning' as const, trend: null },
    ]
  }

  if (activeTab.value === 'copies') {
    return [
      { label: 'Total Copies', value: v.totalCopies || 0, icon: 'i-heroicons-clipboard-document', tone: 'brand' as const, trend: v.copyTrend ?? null },
      { label: 'Copies 7d', value: v.copiesLast7Days || 0, icon: 'i-heroicons-calendar', tone: 'success' as const, trend: null },
      { label: 'Copy Visitors', value: v.uniqueVisitors || 0, icon: 'i-heroicons-finger-print', tone: 'violet' as const, trend: null },
      { label: 'Copy Visitors 7d', value: v.uniqueVisitorsLast7Days || 0, icon: 'i-heroicons-signal', tone: 'warning' as const, trend: null },
    ]
  }

  return [
    { label: 'API Calls', value: v.totalApiCalls || 0, icon: 'i-heroicons-server', tone: 'brand' as const, trend: v.apiTrend ?? null },
    { label: 'API 7d', value: v.apiCallsLast7Days || 0, icon: 'i-heroicons-bolt', tone: 'success' as const, trend: null },
    { label: 'Outdated Profiles', value: v.outdatedProfiles || 0, icon: 'i-heroicons-exclamation-triangle', tone: (v.outdatedProfiles || 0) > 0 ? 'warning' as const : 'success' as const, trend: null },
    { label: 'Outdated Layouts', value: v.outdatedLayouts || 0, icon: 'i-heroicons-exclamation-triangle', tone: (v.outdatedLayouts || 0) > 0 ? 'warning' as const : 'success' as const, trend: null },
  ]
})

// ── Helpers ─────────────────────────────────────────

function methodColor(method: string): string {
  const colors: Record<string, string> = { GET: 'success', POST: 'info', PUT: 'warning', DELETE: 'error', PATCH: 'neutral' }
  return colors[method] || 'neutral'
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${Math.round(bytes)} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>
