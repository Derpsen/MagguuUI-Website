<template>
  <div class="space-y-6">
    <AdminPageHeader
      icon="i-heroicons-chart-bar"
      eyebrow="System"
      title="Analytics"
      description="Traffic, copies and API usage without the old dashboard noise."
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
        <AdminPanel v-for="item in 2" :key="`skeleton-${item}`" title="Loading" description="Preparing analytics data." icon="i-heroicons-chart-bar">
          <div class="h-48 rounded-2xl skeleton bg-slate-200/70 dark:bg-slate-800/70" />
        </AdminPanel>
      </div>
    </div>

    <template v-else-if="stats">
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

      <template v-if="activeTab === 'overview'">
        <div class="grid gap-6 xl:grid-cols-2">
          <AdminPanel title="Page Views" description="Last 30 days." icon="i-heroicons-eye">
            <div class="space-y-4">
              <div>
                <p class="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{{ stats.totalPageViews || 0 }}</p>
                <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">total page views</p>
              </div>
              <BarChart :data="stats.dailyPageViews || []" tone-class="bg-blue-500/80" />
            </div>
          </AdminPanel>

          <AdminPanel title="Copies" description="Last 30 days." icon="i-heroicons-clipboard-document">
            <div class="space-y-4">
              <div>
                <p class="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{{ stats.totalCopies || 0 }}</p>
                <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">total copy events</p>
              </div>
              <BarChart :data="stats.dailyCopies || []" tone-class="bg-emerald-500/80" />
            </div>
          </AdminPanel>
        </div>

        <div class="grid gap-6 xl:grid-cols-2">
          <AdminPanel title="Top Referrers" description="Traffic sources with the most visits." icon="i-heroicons-link">
            <BreakdownList
              :items="stats.topReferrers || []"
              label-key="referrer"
              value-key="visits"
              empty-label="No referrer data yet."
            />
          </AdminPanel>

          <AdminPanel title="Top Pages" description="Most viewed public paths." icon="i-heroicons-document-text">
            <div v-if="stats.topPages?.length" class="admin-list">
              <div v-for="page in stats.topPages" :key="page.path" class="admin-row">
                <div class="admin-row__content">
                  <p class="admin-row__title font-mono">{{ page.path }}</p>
                  <p class="admin-row__meta">{{ page.unique_visitors }} unique visitors</p>
                </div>
                <div class="admin-row__actions">
                  <UBadge color="info" variant="subtle" size="xs">{{ page.views }}</UBadge>
                </div>
              </div>
            </div>

            <AdminEmptyState
              v-else
              icon="i-heroicons-document-text"
              title="No page data"
              description="Top pages will appear once traffic has been recorded."
            />
          </AdminPanel>
        </div>
      </template>

      <template v-else-if="activeTab === 'visitors'">
        <div class="grid gap-6 xl:grid-cols-3">
          <AdminPanel title="Devices" description="Distribution by device type." icon="i-heroicons-device-phone-mobile">
            <BreakdownList :items="stats.deviceBreakdown || []" label-key="device_type" value-key="count" empty-label="No device data yet." />
          </AdminPanel>

          <AdminPanel title="Browsers" description="Browser usage across the last 30 days." icon="i-heroicons-window">
            <BreakdownList :items="stats.browserBreakdown || []" label-key="browser" value-key="count" empty-label="No browser data yet." />
          </AdminPanel>

          <AdminPanel title="Operating Systems" description="OS distribution for recent visits." icon="i-heroicons-circle-stack">
            <BreakdownList :items="stats.osBreakdown || []" label-key="os" value-key="count" empty-label="No OS data yet." />
          </AdminPanel>
        </div>

        <AdminPanel title="Hourly Page Views" description="Average hourly pattern across the last 30 days." icon="i-heroicons-clock">
          <HourlyChart :data="stats.hourlyPageViews || []" value-key="views" tone-class="bg-blue-500/75" />
        </AdminPanel>
      </template>

      <template v-else-if="activeTab === 'copies'">
        <div class="grid gap-6 xl:grid-cols-2">
          <AdminPanel title="Top Copied Strings" description="Highest demand across all string types." icon="i-heroicons-clipboard-document-list">
            <div v-if="stats.topCopied?.length" class="admin-list">
              <div v-for="item in stats.topCopied" :key="`${item.string_type}-${item.name}`" class="admin-row">
                <div class="admin-row__content">
                  <p class="admin-row__title">{{ item.name }}</p>
                  <p class="admin-row__meta">{{ item.string_type }}</p>
                </div>
                <div class="admin-row__actions">
                  <UBadge color="info" variant="subtle" size="xs">{{ item.copies }}x</UBadge>
                </div>
              </div>
            </div>

            <AdminEmptyState
              v-else
              icon="i-heroicons-clipboard-document-list"
              title="No copy data"
              description="Popular strings will appear here once users start copying."
            />
          </AdminPanel>

          <AdminPanel title="Copies by Type" description="Relative volume per string category." icon="i-heroicons-squares-2x2">
            <BreakdownList :items="stats.copiesByType || []" label-key="string_type" value-key="copies" empty-label="No type data yet." />
          </AdminPanel>
        </div>

        <AdminPanel title="Hourly Copies" description="Average hourly copy pattern across the last 30 days." icon="i-heroicons-clock">
          <HourlyChart :data="stats.hourlyCopies || []" value-key="copies" tone-class="bg-emerald-500/75" />
        </AdminPanel>
      </template>

      <template v-else>
        <div class="grid gap-6 xl:grid-cols-2">
          <AdminPanel title="API Calls" description="Request volume across the last 30 days." icon="i-heroicons-server-stack">
            <div class="space-y-4">
              <div>
                <p class="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{{ stats.totalApiCalls || 0 }}</p>
                <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">total API calls</p>
              </div>
              <BarChart :data="stats.dailyApi || []" tone-class="bg-violet-500/80" />
            </div>
          </AdminPanel>

          <AdminPanel title="Top Endpoints" description="Most requested API routes." icon="i-heroicons-bolt">
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

            <AdminEmptyState
              v-else
              icon="i-heroicons-bolt"
              title="No endpoint data"
              description="Endpoint usage appears after API requests have been recorded."
            />
          </AdminPanel>
        </div>

        <AdminPanel title="Average String Size" description="Average profile string size per addon." icon="i-heroicons-scale">
          <div v-if="stats.avgStringSizes?.length" class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div v-for="item in stats.avgStringSizes" :key="item.addon" class="admin-subpanel">
              <p class="admin-row__eyebrow">{{ item.addon }}</p>
              <p class="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{{ formatSize(item.avg_size) }}</p>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ item.count }} profiles</p>
            </div>
          </div>

          <AdminEmptyState
            v-else
            icon="i-heroicons-scale"
            title="No size data"
            description="Average size calculations will appear once profile data is available."
          />
        </AdminPanel>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { PropType } from "vue"

definePageMeta({ layout: "admin" })

const { apiFetch } = useApi()

type TabId = "overview" | "visitors" | "copies" | "api"

interface DailyPoint {
  day: string
  count: number
}

interface HourlyPoint {
  hour: number
  views?: number
  copies?: number
}

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
const activeTab = ref<TabId>("overview")
const tabs: Array<{ id: TabId; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "visitors", label: "Visitors" },
  { id: "copies", label: "Copies" },
  { id: "api", label: "API" },
]

const lastLoaded = ref<Date | null>(null)
const lastUpdatedText = ref("")
let lastUpdatedTimer: ReturnType<typeof setInterval>

function updateLastUpdatedText() {
  if (!lastLoaded.value) return
  const seconds = Math.floor((Date.now() - lastLoaded.value.getTime()) / 1000)
  if (seconds < 10) lastUpdatedText.value = "Updated just now"
  else if (seconds < 60) lastUpdatedText.value = `Updated ${seconds}s ago`
  else if (seconds < 3600) lastUpdatedText.value = `Updated ${Math.floor(seconds / 60)}m ago`
  else lastUpdatedText.value = `Updated ${Math.floor(seconds / 3600)}h ago`
}

async function refresh() {
  loading.value = true
  try {
    stats.value = await apiFetch("/api/v1/admin/stats")
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

const activeMetrics = computed(() => {
  const value = stats.value
  if (!value) return []

  if (activeTab.value === "overview") {
    return [
      { label: "Page Views", value: value.totalPageViews || 0, icon: "i-heroicons-eye", tone: "brand" as const, trend: value.pageViewTrend ?? null },
      { label: "Visitors", value: value.uniquePageVisitors || 0, icon: "i-heroicons-user-group", tone: "success" as const, trend: null },
      { label: "Views 7d", value: value.pageViewsLast7Days || 0, icon: "i-heroicons-calendar-days", tone: "violet" as const, trend: value.pageViewTrend ?? null },
      { label: "Visitors 7d", value: value.uniquePageVisitorsLast7Days || 0, icon: "i-heroicons-users", tone: "warning" as const, trend: null },
    ]
  }

  if (activeTab.value === "visitors") {
    return [
      { label: "Devices", value: value.deviceBreakdown?.length || 0, icon: "i-heroicons-device-phone-mobile", tone: "brand" as const, trend: null },
      { label: "Browsers", value: value.browserBreakdown?.length || 0, icon: "i-heroicons-window", tone: "success" as const, trend: null },
      { label: "Operating Systems", value: value.osBreakdown?.length || 0, icon: "i-heroicons-circle-stack", tone: "violet" as const, trend: null },
      { label: "Visitors 30d", value: value.uniquePageVisitors || 0, icon: "i-heroicons-user-group", tone: "warning" as const, trend: null },
    ]
  }

  if (activeTab.value === "copies") {
    return [
      { label: "Total Copies", value: value.totalCopies || 0, icon: "i-heroicons-clipboard-document", tone: "brand" as const, trend: value.copyTrend ?? null },
      { label: "Copies 7d", value: value.copiesLast7Days || 0, icon: "i-heroicons-calendar", tone: "success" as const, trend: null },
      { label: "Copy Visitors", value: value.uniqueVisitors || 0, icon: "i-heroicons-finger-print", tone: "violet" as const, trend: null },
      { label: "Copy Visitors 7d", value: value.uniqueVisitorsLast7Days || 0, icon: "i-heroicons-signal", tone: "warning" as const, trend: null },
    ]
  }

  return [
    { label: "API Calls", value: value.totalApiCalls || 0, icon: "i-heroicons-server", tone: "brand" as const, trend: value.apiTrend ?? null },
    { label: "API 7d", value: value.apiCallsLast7Days || 0, icon: "i-heroicons-bolt", tone: "success" as const, trend: null },
    { label: "Outdated Profiles", value: value.outdatedProfiles || 0, icon: "i-heroicons-exclamation-triangle", tone: (value.outdatedProfiles || 0) > 0 ? "warning" as const : "success" as const, trend: null },
    { label: "Outdated Layouts", value: value.outdatedLayouts || 0, icon: "i-heroicons-exclamation-triangle", tone: (value.outdatedLayouts || 0) > 0 ? "warning" as const : "success" as const, trend: null },
  ]
})

function methodColor(method: string): string {
  const colors: Record<string, string> = {
    GET: "success",
    POST: "info",
    PUT: "warning",
    DELETE: "error",
    PATCH: "neutral",
  }
  return colors[method] || "neutral"
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${Math.round(bytes)} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const BarChart = defineComponent({
  props: {
    data: {
      type: Array as PropType<DailyPoint[]>,
      default: () => [],
    },
    toneClass: {
      type: String,
      default: "bg-blue-500/80",
    },
  },
  setup(props) {
    const maxValue = computed(() => Math.max(1, ...props.data.map(item => item.count)))
    const shortDay = (value: string) => {
      try {
        return new Date(value).toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2)
      } catch {
        return value.slice(-2)
      }
    }

    const height = (count: number) => {
      if (!count) return 2
      return Math.max(8, (count / maxValue.value) * 100)
    }

    return () => {
      if (!props.data.length) {
        return h("div", { class: "py-10 text-center text-sm text-slate-500 dark:text-slate-400" }, "No data yet.")
      }

      return h("div", { class: "space-y-3" }, [
        h("div", { class: "relative h-40" }, [
          h("div", { class: "absolute inset-0 flex flex-col justify-between" }, [
            h("div", { class: "border-b border-dashed border-slate-200 dark:border-white/8" }),
            h("div", { class: "border-b border-dashed border-slate-200 dark:border-white/8" }),
            h("div", { class: "border-b border-dashed border-slate-200 dark:border-white/8" }),
            h("div"),
          ]),
          h("div", { class: "relative flex h-full items-end gap-2" },
            props.data.map((item, index) =>
              h("div", { key: `${item.day}-${index}`, class: "flex flex-1 flex-col items-center gap-2" }, [
                h("span", { class: "text-[11px] font-medium text-slate-500 dark:text-slate-400" }, String(item.count)),
                h("div", {
                  class: `w-full rounded-t-xl transition-colors ${props.toneClass}`,
                  style: { height: `${height(item.count)}%`, minHeight: item.count > 0 ? "10px" : "4px" },
                }),
              ]),
            ),
          ),
        ]),
        h("div", { class: "grid gap-2", style: `grid-template-columns: repeat(${props.data.length}, minmax(0, 1fr));` },
          props.data.map((item, index) =>
            h("span", { key: `label-${index}`, class: "text-center text-[11px] text-slate-500 dark:text-slate-400" }, shortDay(item.day)),
          ),
        ),
      ])
    }
  },
})

const HourlyChart = defineComponent({
  props: {
    data: {
      type: Array as PropType<HourlyPoint[]>,
      default: () => [],
    },
    valueKey: {
      type: String,
      required: true,
    },
    toneClass: {
      type: String,
      default: "bg-blue-500/75",
    },
  },
  setup(props) {
    const normalized = computed(() => Array.from({ length: 24 }, (_, hour) => {
      const match = props.data.find(item => item.hour === hour)
      return {
        hour,
        value: Number(match?.[props.valueKey as keyof HourlyPoint] || 0),
      }
    }))

    const maxValue = computed(() => Math.max(1, ...normalized.value.map(item => item.value)))

    return () => {
      if (!props.data.length) {
        return h("div", { class: "py-10 text-center text-sm text-slate-500 dark:text-slate-400" }, "No data yet.")
      }

      return h("div", { class: "space-y-3" }, [
        h("div", { class: "relative h-36" }, [
          h("div", { class: "absolute inset-0 flex flex-col justify-between" }, [
            h("div", { class: "border-b border-dashed border-slate-200 dark:border-white/8" }),
            h("div", { class: "border-b border-dashed border-slate-200 dark:border-white/8" }),
            h("div", { class: "border-b border-dashed border-slate-200 dark:border-white/8" }),
            h("div"),
          ]),
          h("div", { class: "relative flex h-full items-end gap-px" },
            normalized.value.map(item =>
              h("div", {
                key: item.hour,
                class: `flex-1 rounded-t transition-colors ${props.toneClass}`,
                style: { height: `${Math.max(4, (item.value / maxValue.value) * 100)}%`, minHeight: "4px" },
                title: `${String(item.hour).padStart(2, "0")}:00 - ${item.value}`,
              }),
            ),
          ),
        ]),
        h("div", { class: "flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400" }, [
          h("span", "00:00"),
          h("span", "12:00"),
          h("span", "23:00"),
        ]),
      ])
    }
  },
})

const BreakdownList = defineComponent({
  props: {
    items: {
      type: Array as PropType<Array<Record<string, any>>>,
      default: () => [],
    },
    labelKey: {
      type: String,
      required: true,
    },
    valueKey: {
      type: String,
      required: true,
    },
    emptyLabel: {
      type: String,
      default: "No data yet.",
    },
  },
  setup(props) {
    const maxValue = computed(() => Math.max(1, ...props.items.map(item => Number(item[props.valueKey] || 0))))

    return () => {
      if (!props.items.length) {
        return h("div", { class: "py-10 text-center text-sm text-slate-500 dark:text-slate-400" }, props.emptyLabel)
      }

      return h("div", { class: "space-y-3" },
        props.items.map((item, index) =>
          h("div", { key: `${String(item[props.labelKey])}-${index}`, class: "space-y-2" }, [
            h("div", { class: "flex items-center justify-between gap-3" }, [
              h("span", { class: "truncate text-sm font-medium text-slate-950 dark:text-white" }, String(item[props.labelKey] || "Unknown")),
              h("span", { class: "text-xs text-slate-500 dark:text-slate-400" }, String(item[props.valueKey] || 0)),
            ]),
            h("div", { class: "h-2 rounded-full bg-slate-200/80 dark:bg-white/8" }, [
              h("div", {
                class: "h-full rounded-full bg-blue-500/75",
                style: { width: `${Math.max(4, (Number(item[props.valueKey] || 0) / maxValue.value) * 100)}%` },
              }),
            ]),
          ]),
        ),
      )
    }
  },
})
</script>
