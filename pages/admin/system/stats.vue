<!--
  Admin — Analytics Dashboard (comprehensive statistics)
  All detailed analytics live here. Dashboard only shows quick overview.
-->

<template>
  <div class="space-y-6">
    <AdminPageHeader
      icon="i-heroicons-chart-bar"
      eyebrow="System"
      title="Analytics"
      description="Traffic, copy events, API usage and behavioural breakdowns across the admin platform."
    >
      <template #meta>
        <span v-if="lastUpdatedText && !loading" class="admin-pill">{{ lastUpdatedText }}</span>
      </template>

      <template #actions>
        <UButton icon="i-heroicons-arrow-path" variant="subtle" size="sm" :loading="loading" @click="refresh">
          Refresh
        </UButton>
      </template>
    </AdminPageHeader>

    <!-- Loading Skeleton -->
    <div v-if="loading && !stats" class="space-y-6">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div v-for="i in 4" :key="'sk-'+i" class="glass rounded-xl p-5">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg skeleton" :class="isDark ? 'bg-brand-900/50' : 'bg-gray-100'" />
            <div class="flex-1 space-y-2">
              <div class="h-7 w-16 rounded skeleton" :class="isDark ? 'bg-brand-900/50' : 'bg-gray-100'" />
              <div class="h-3 w-24 rounded skeleton" :class="isDark ? 'bg-brand-900/30' : 'bg-gray-100'" />
            </div>
          </div>
        </div>
      </div>
      <div class="grid lg:grid-cols-2 gap-6">
        <div v-for="i in 2" :key="'sk-c-'+i" class="glass rounded-xl p-6">
          <div class="h-5 w-32 rounded skeleton mb-4" :class="isDark ? 'bg-brand-900/50' : 'bg-gray-100'" />
          <div class="h-32 rounded-lg skeleton" :class="isDark ? 'bg-brand-900/30' : 'bg-gray-100'" />
        </div>
      </div>
    </div>

    <div v-else-if="stats">

      <!-- ═══════ TAB NAVIGATION ═══════ -->
      <div class="flex items-center gap-1 p-1 rounded-lg mb-6" :class="isDark ? 'bg-white/[0.03]' : 'bg-gray-100'">
        <button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id"
          class="px-4 py-2 text-sm font-medium rounded-md transition-all"
          :class="activeTab === tab.id
            ? (isDark ? 'bg-brand-400/10 text-brand-400' : 'bg-white text-brand-600 shadow-sm')
            : (isDark ? 'text-silver-400 hover:text-white' : 'text-gray-500 hover:text-gray-900')">
          {{ tab.label }}
        </button>
      </div>

      <!-- ═══════ TAB CONTENT ═══════ -->
      <div :key="activeTab" class="space-y-6 admin-fade-in">

        <!-- ═══════════════════════════════════════════ -->
        <!-- TAB: Overview                               -->
        <!-- ═══════════════════════════════════════════ -->
        <template v-if="activeTab === 'overview'">

          <!-- Traffic Overview Stats -->
          <div class="admin-fade-in">
            <h2 class="text-xs font-bold uppercase tracking-wider mb-3" :class="isDark ? 'text-silver-500' : 'text-gray-500'">
              <UIcon name="i-heroicons-globe-alt" class="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
              Traffic Overview
            </h2>
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Page Views" :value="stats.totalPageViews" icon="i-heroicons-eye" bg="bg-blue-500/10" color="text-blue-400" :trend="stats.pageViewTrend" />
              <StatCard label="Unique Visitors" :value="stats.uniquePageVisitors" icon="i-heroicons-user-group" bg="bg-teal-500/10" color="text-teal-400" />
              <StatCard label="Views (7d)" :value="stats.pageViewsLast7Days" icon="i-heroicons-calendar-days" bg="bg-purple-500/10" color="text-purple-400" :trend="stats.pageViewTrend" />
              <StatCard label="Visitors (7d)" :value="stats.uniquePageVisitorsLast7Days" icon="i-heroicons-users" bg="bg-amber-500/10" color="text-amber-400" />
            </div>
          </div>

          <!-- Page Views + Copies Charts -->
          <div class="grid lg:grid-cols-2 gap-6 admin-fade-in">
            <div class="glass rounded-xl p-6">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">Page Views (30 days)</h2>
                <span class="text-2xl font-bold text-brand-400">{{ stats.totalPageViews }}</span>
              </div>
              <BarChart :data="stats.dailyPageViews || []" color="brand" :is-dark="isDark" />
            </div>

            <div class="glass rounded-xl p-6">
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">Copies (30 days)</h2>
                <span class="text-2xl font-bold text-brand-400">{{ stats.totalCopies }}</span>
              </div>
              <BarChart :data="stats.dailyCopies || []" color="cyan" :is-dark="isDark" />
            </div>
          </div>

          <!-- Top Referrers + Top Pages -->
          <div class="grid lg:grid-cols-2 gap-6 admin-fade-in">
            <!-- Top Referrers -->
            <div class="glass rounded-xl p-6">
              <h2 class="text-base font-semibold mb-4" :class="isDark ? 'text-white' : 'text-gray-900'">
                <UIcon name="i-heroicons-link" class="w-4 h-4 inline -mt-0.5 mr-1.5 text-brand-400" />
                Top Referrers
              </h2>
              <div v-if="stats.topReferrers?.length" class="space-y-2">
                <div v-for="(ref, idx) in stats.topReferrers" :key="ref.referrer"
                  class="flex items-center gap-3 py-2 px-3 rounded-lg" :class="isDark ? 'bg-brand-900/30' : 'bg-gray-50'">
                  <span class="text-xs font-bold w-5 text-center" :class="isDark ? 'text-silver-500' : 'text-gray-400'">#{{ idx + 1 }}</span>
                  <span class="text-sm flex-1 truncate" :class="isDark ? 'text-silver-300' : 'text-gray-700'">{{ ref.referrer }}</span>
                  <UBadge color="info" variant="subtle" size="xs">{{ ref.visits }}</UBadge>
                </div>
              </div>
              <EmptyState v-else />
            </div>

            <!-- Top Pages -->
            <div class="glass rounded-xl p-6">
              <h2 class="text-base font-semibold mb-4" :class="isDark ? 'text-white' : 'text-gray-900'">
                <UIcon name="i-heroicons-document-text" class="w-4 h-4 inline -mt-0.5 mr-1.5 text-brand-400" />
                Top Pages
              </h2>
              <div v-if="stats.topPages?.length" class="space-y-2">
                <div v-for="(page, idx) in stats.topPages" :key="page.path"
                  class="flex items-center gap-3 py-2 px-3 rounded-lg" :class="isDark ? 'bg-brand-900/30' : 'bg-gray-50'">
                  <span class="text-xs font-bold w-5 text-center" :class="isDark ? 'text-silver-500' : 'text-gray-400'">#{{ idx + 1 }}</span>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium truncate" :class="isDark ? 'text-silver-300' : 'text-gray-700'">{{ page.path }}</p>
                    <p class="text-xs" :class="isDark ? 'text-silver-600' : 'text-gray-400'">{{ page.unique_visitors }} unique</p>
                  </div>
                  <UBadge color="info" variant="subtle" size="xs">{{ page.views }}</UBadge>
                </div>
              </div>
              <EmptyState v-else />
            </div>
          </div>

        </template>

        <!-- ═══════════════════════════════════════════ -->
        <!-- TAB: Visitors                               -->
        <!-- ═══════════════════════════════════════════ -->
        <template v-if="activeTab === 'visitors'">

          <!-- Device / Browser / OS Breakdown -->
          <div class="admin-fade-in">
            <h2 class="text-xs font-bold uppercase tracking-wider mb-3" :class="isDark ? 'text-silver-500' : 'text-gray-500'">
              <UIcon name="i-heroicons-device-phone-mobile" class="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
              Visitor Breakdown
            </h2>
            <div class="grid lg:grid-cols-3 gap-6">
              <!-- Devices -->
              <div class="glass rounded-xl p-6">
                <h3 class="text-sm font-semibold mb-4" :class="isDark ? 'text-white' : 'text-gray-900'">Devices</h3>
                <BreakdownList :items="stats.deviceBreakdown || []" label-key="device_type" value-key="count" :is-dark="isDark" />
              </div>

              <!-- Browsers -->
              <div class="glass rounded-xl p-6">
                <h3 class="text-sm font-semibold mb-4" :class="isDark ? 'text-white' : 'text-gray-900'">Browsers</h3>
                <BreakdownList :items="stats.browserBreakdown || []" label-key="browser" value-key="count" :is-dark="isDark" />
              </div>

              <!-- OS -->
              <div class="glass rounded-xl p-6">
                <h3 class="text-sm font-semibold mb-4" :class="isDark ? 'text-white' : 'text-gray-900'">Operating Systems</h3>
                <BreakdownList :items="stats.osBreakdown || []" label-key="os" value-key="count" :is-dark="isDark" />
              </div>
            </div>
          </div>

          <!-- Hourly Page Views -->
          <div class="glass rounded-xl p-6 admin-fade-in">
            <h2 class="text-base font-semibold mb-4" :class="isDark ? 'text-white' : 'text-gray-900'">
              <UIcon name="i-heroicons-clock" class="w-4 h-4 inline -mt-0.5 mr-1.5 text-brand-400" />
              Hourly Page Views (30d)
            </h2>
            <HourlyChart :data="stats.hourlyPageViews || []" value-key="views" color="brand" :is-dark="isDark" />
          </div>

        </template>

        <!-- ═══════════════════════════════════════════ -->
        <!-- TAB: Copies                                 -->
        <!-- ═══════════════════════════════════════════ -->
        <template v-if="activeTab === 'copies'">

          <!-- Copy Analytics Stats -->
          <div class="admin-fade-in">
            <h2 class="text-xs font-bold uppercase tracking-wider mb-3" :class="isDark ? 'text-silver-500' : 'text-gray-500'">
              <UIcon name="i-heroicons-clipboard-document" class="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
              Copy Analytics
            </h2>
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard label="Total Copies" :value="stats.totalCopies" icon="i-heroicons-clipboard-document" bg="bg-cyan-500/10" color="text-cyan-400" :trend="stats.copyTrend" />
              <StatCard label="Copies (7d)" :value="stats.copiesLast7Days" icon="i-heroicons-calendar" bg="bg-blue-500/10" color="text-blue-400" />
              <StatCard label="Copy IPs (total)" :value="stats.uniqueVisitors" icon="i-heroicons-finger-print" bg="bg-teal-500/10" color="text-teal-400" />
              <StatCard label="Copy IPs (7d)" :value="stats.uniqueVisitorsLast7Days" icon="i-heroicons-signal" bg="bg-emerald-500/10" color="text-emerald-400" />
            </div>

            <div class="grid lg:grid-cols-2 gap-6">
              <!-- Top Copied Strings -->
              <div class="glass rounded-xl p-6">
                <h3 class="text-base font-semibold mb-4" :class="isDark ? 'text-white' : 'text-gray-900'">Top Copied Strings</h3>
                <div v-if="stats.topCopied?.length" class="space-y-2">
                  <div v-for="(item, idx) in stats.topCopied" :key="idx"
                    class="flex items-center justify-between py-2 px-3 rounded-lg" :class="isDark ? 'bg-brand-900/30' : 'bg-gray-50'">
                    <div class="flex items-center gap-3 min-w-0">
                      <span class="text-xs font-bold w-5 text-center flex-shrink-0" :class="isDark ? 'text-silver-500' : 'text-gray-400'">#{{ idx + 1 }}</span>
                      <div class="min-w-0">
                        <p class="text-sm font-medium truncate" :class="isDark ? 'text-white' : 'text-gray-900'">{{ item.name }}</p>
                        <p class="text-xs" :class="isDark ? 'text-silver-600' : 'text-gray-400'">{{ item.string_type }}</p>
                      </div>
                    </div>
                    <UBadge color="info" variant="subtle" size="xs" class="flex-shrink-0 ml-2">{{ item.copies }}×</UBadge>
                  </div>
                </div>
                <EmptyState v-else />
              </div>

              <!-- Copies by Type -->
              <div class="glass rounded-xl p-6">
                <h3 class="text-base font-semibold mb-4" :class="isDark ? 'text-white' : 'text-gray-900'">Copies by Type</h3>
                <div v-if="stats.copiesByType?.length" class="space-y-3">
                  <div v-for="item in stats.copiesByType" :key="item.string_type" class="flex items-center gap-3">
                    <span class="text-xs font-medium w-16 truncate" :class="isDark ? 'text-silver-400' : 'text-gray-500'">{{ item.string_type }}</span>
                    <div class="flex-1 h-2.5 rounded-full overflow-hidden" :class="isDark ? 'bg-brand-900/50' : 'bg-gray-100'">
                      <div class="h-full rounded-full bg-brand-400 transition-all"
                        :style="{ width: `${Math.max(4, (item.copies / Math.max(1, stats.copiesByType![0].copies)) * 100)}%` }" />
                    </div>
                    <span class="text-xs font-mono w-12 text-right" :class="isDark ? 'text-silver-300' : 'text-gray-600'">{{ item.copies }}</span>
                  </div>
                </div>
                <EmptyState v-else />
              </div>
            </div>
          </div>

          <!-- Hourly Copies -->
          <div class="glass rounded-xl p-6 admin-fade-in">
            <h2 class="text-base font-semibold mb-4" :class="isDark ? 'text-white' : 'text-gray-900'">
              <UIcon name="i-heroicons-clock" class="w-4 h-4 inline -mt-0.5 mr-1.5 text-cyan-400" />
              Hourly Copies (30d)
            </h2>
            <HourlyChart :data="stats.hourlyCopies || []" value-key="copies" color="cyan" :is-dark="isDark" />
          </div>

        </template>

        <!-- ═══════════════════════════════════════════ -->
        <!-- TAB: API & Addons                           -->
        <!-- ═══════════════════════════════════════════ -->
        <template v-if="activeTab === 'api'">

          <!-- API & System Stats -->
          <div class="admin-fade-in">
            <h2 class="text-xs font-bold uppercase tracking-wider mb-3" :class="isDark ? 'text-silver-500' : 'text-gray-500'">
              <UIcon name="i-heroicons-server-stack" class="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
              API & System
            </h2>
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard label="API Calls" :value="stats.totalApiCalls" icon="i-heroicons-server" bg="bg-green-500/10" color="text-green-400" :trend="stats.apiTrend" />
              <StatCard label="API (7d)" :value="stats.apiCallsLast7Days" icon="i-heroicons-bolt" bg="bg-lime-500/10" color="text-lime-400" />
              <StatCard label="Outdated Profiles" :value="stats.outdatedProfiles" icon="i-heroicons-exclamation-triangle" :bg="stats.outdatedProfiles > 0 ? 'bg-amber-500/10' : 'bg-green-500/10'" :color="stats.outdatedProfiles > 0 ? 'text-amber-400' : 'text-green-400'" />
              <StatCard label="Outdated Layouts" :value="stats.outdatedLayouts" icon="i-heroicons-exclamation-triangle" :bg="stats.outdatedLayouts > 0 ? 'bg-amber-500/10' : 'bg-green-500/10'" :color="stats.outdatedLayouts > 0 ? 'text-amber-400' : 'text-green-400'" />
            </div>

            <div class="grid lg:grid-cols-2 gap-6">
              <!-- API Chart -->
              <div class="glass rounded-xl p-6">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">API Calls (30 days)</h3>
                  <span class="text-2xl font-bold text-green-400">{{ stats.totalApiCalls }}</span>
                </div>
                <BarChart :data="stats.dailyApi || []" color="green" :is-dark="isDark" />
              </div>

              <!-- Top Endpoints -->
              <div class="glass rounded-xl p-6">
                <h3 class="text-base font-semibold mb-4" :class="isDark ? 'text-white' : 'text-gray-900'">Top Endpoints</h3>
                <div v-if="stats.topEndpoints?.length" class="space-y-2">
                  <div v-for="(ep, idx) in stats.topEndpoints" :key="idx"
                    class="flex items-center gap-3 py-2 px-3 rounded-lg" :class="isDark ? 'bg-brand-900/30' : 'bg-gray-50'">
                    <UBadge :color="methodColor(ep.method)" variant="subtle" size="xs" class="w-12 justify-center flex-shrink-0">{{ ep.method }}</UBadge>
                    <span class="text-sm flex-1 truncate font-mono" :class="isDark ? 'text-silver-300' : 'text-gray-600'">{{ ep.endpoint }}</span>
                    <span class="text-xs font-mono" :class="isDark ? 'text-silver-500' : 'text-gray-400'">{{ ep.calls }}</span>
                  </div>
                </div>
                <EmptyState v-else />
              </div>
            </div>
          </div>

          <!-- Average String Size per Addon -->
          <div v-if="stats.avgStringSizes?.length" class="glass rounded-xl p-6 admin-fade-in">
            <h2 class="text-base font-semibold mb-4" :class="isDark ? 'text-white' : 'text-gray-900'">
              <UIcon name="i-heroicons-scale" class="w-4 h-4 inline -mt-0.5 mr-1.5 text-brand-400" />
              Average String Size per Addon
            </h2>
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div v-for="item in stats.avgStringSizes" :key="item.addon"
                class="rounded-lg p-4" :class="isDark ? 'bg-brand-900/30' : 'bg-gray-50'">
                <p class="text-sm font-semibold truncate" :class="isDark ? 'text-white' : 'text-gray-900'">{{ item.addon }}</p>
                <p class="text-lg font-bold text-brand-400">{{ formatSize(item.avg_size) }}</p>
                <p class="text-xs" :class="isDark ? 'text-silver-500' : 'text-gray-400'">{{ item.count }} profiles</p>
              </div>
            </div>
          </div>

        </template>

      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const { apiFetch } = useApi()
const isDark = useIsDark()

const loading = ref(true)
const stats = ref<any>(null)

// ─── Tab Navigation ─────────────────────────────────
const activeTab = ref('overview')
const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'visitors', label: 'Visitors' },
  { id: 'copies', label: 'Copies' },
  { id: 'api', label: 'API & Addons' },
]

// Last Updated
const lastLoaded = ref<Date | null>(null)
const lastUpdatedText = ref('')
function updateLastUpdatedText() {
  if (!lastLoaded.value) return
  const s = Math.floor((Date.now() - lastLoaded.value.getTime()) / 1000)
  if (s < 10) lastUpdatedText.value = 'just now'
  else if (s < 60) lastUpdatedText.value = `${s}s ago`
  else if (s < 3600) lastUpdatedText.value = `${Math.floor(s / 60)}m ago`
  else lastUpdatedText.value = `${Math.floor(s / 3600)}h ago`
}
let lastUpdatedTimer: ReturnType<typeof setInterval>

async function refresh() {
  loading.value = true
  try { stats.value = await apiFetch('/api/v1/admin/stats'); lastLoaded.value = new Date(); updateLastUpdatedText() }
  catch { /* ok */ }
  finally { loading.value = false }
}

onMounted(() => { refresh(); lastUpdatedTimer = setInterval(updateLastUpdatedText, 10000) })
onUnmounted(() => { clearInterval(lastUpdatedTimer) })

function methodColor(method: string): string {
  const map: Record<string, string> = { GET: 'success', POST: 'info', PUT: 'warning', DELETE: 'error', PATCH: 'purple' }
  return map[method] || 'neutral'
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${Math.round(bytes)} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─── Inline Sub-Components ──────────────────────────

// StatCard — reusable metric card
const StatCard = defineComponent({
  props: {
    label: String, value: [Number, String], icon: String,
    bg: String, color: String, trend: { type: Number, default: undefined },
  },
  setup(props) {
    return () => h('div', { class: 'glass rounded-xl p-5' }, [
      h('div', { class: 'flex items-center gap-3' }, [
        h('div', { class: `w-10 h-10 rounded-lg flex items-center justify-center ${props.bg}` }, [
          h(resolveComponent('UIcon'), { name: props.icon, class: `w-5 h-5 ${props.color}` }),
        ]),
        h('div', { class: 'flex-1' }, [
          h('p', { class: `text-2xl font-bold ${isDark.value ? 'text-white' : 'text-gray-900'}` }, String(props.value ?? 0)),
          h('div', { class: 'flex items-center gap-2' }, [
            h('p', { class: `text-xs ${isDark.value ? 'text-silver-500' : 'text-gray-500'}` }, props.label),
            props.trend !== undefined && props.trend !== 0
              ? h('span', { class: `text-[10px] font-semibold ${props.trend >= 0 ? 'text-green-400' : 'text-red-400'}` },
                  `${props.trend >= 0 ? '↑' : '↓'}${Math.abs(props.trend)}%`)
              : null,
          ]),
        ]),
      ]),
    ])
  },
})

// BarChart — 30-day bar chart
const BarChart = defineComponent({
  props: { data: Array as () => Array<{ day: string; count: number }>, color: String, isDark: Boolean },
  setup(props) {
    const maxVal = computed(() => Math.max(1, ...(props.data || []).map(d => d.count)))
    const colorMap: Record<string, string[]> = {
      brand: ['bg-brand-400/50 hover:bg-brand-400', 'bg-brand-400/40 hover:bg-brand-400'],
      cyan: ['bg-cyan-400/50 hover:bg-cyan-400', 'bg-cyan-400/40 hover:bg-cyan-400'],
      green: ['bg-green-400/50 hover:bg-green-400', 'bg-green-400/40 hover:bg-green-400'],
    }
    const barClass = computed(() => (colorMap[props.color || 'brand'] || colorMap.brand)[props.isDark ? 0 : 1])

    return () => {
      if (!props.data?.length) return h('p', { class: `text-sm text-center py-6 ${props.isDark ? 'text-silver-600' : 'text-gray-400'}` }, 'No data yet')
      return h('div', {}, [
        h('div', { class: 'relative h-24' }, [
          h('div', { class: 'absolute inset-0 flex flex-col justify-between pointer-events-none' }, [
            h('div', { class: `border-b ${props.isDark ? 'border-brand-400/5' : 'border-gray-100'}` }),
            h('div', { class: `border-b ${props.isDark ? 'border-brand-400/5' : 'border-gray-100'}` }),
            h('div', { class: `border-b ${props.isDark ? 'border-brand-400/5' : 'border-gray-100'}` }),
            h('div'),
          ]),
          h('div', { class: 'relative flex items-end gap-0.5 h-full' },
            props.data.map((d, idx) =>
              h('div', {
                key: idx,
                class: `flex-1 rounded-t transition-colors relative group ${barClass.value}`,
                style: { height: `${Math.max(d.count > 0 ? 4 : 2, (d.count / maxVal.value) * 100)}%`, minHeight: d.count > 0 ? '4px' : '2px' },
              }, [
                h('div', {
                  class: `absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg text-[10px] font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 border ${props.isDark ? 'bg-brand-900 text-white border-brand-400/20' : 'bg-gray-900 text-white border-gray-700'}`,
                }, `${d.count} ${d.day?.slice(5) || ''}`),
              ])
            )
          ),
        ]),
        h('div', { class: 'flex justify-between mt-1.5' }, [
          h('span', { class: `text-[10px] ${props.isDark ? 'text-silver-600' : 'text-gray-400'}` }, props.data[0]?.day?.slice(5) || ''),
          props.data.length > 14 ? h('span', { class: `text-[10px] ${props.isDark ? 'text-silver-600' : 'text-gray-400'}` }, props.data[Math.floor(props.data.length / 2)]?.day?.slice(5) || '') : null,
          h('span', { class: `text-[10px] ${props.isDark ? 'text-silver-600' : 'text-gray-400'}` }, props.data[props.data.length - 1]?.day?.slice(5) || ''),
        ]),
      ])
    }
  },
})

// HourlyChart — 24-hour histogram
const HourlyChart = defineComponent({
  props: { data: Array as () => Array<Record<string, number>>, valueKey: String, color: String, isDark: Boolean },
  setup(props) {
    const getVal = (hour: number) => {
      const item = (props.data || []).find((d: any) => d.hour === hour)
      return item ? (item as any)[props.valueKey || 'count'] || 0 : 0
    }
    const maxVal = computed(() => Math.max(1, ...(props.data || []).map((d: any) => (d as any)[props.valueKey || 'count'] || 0)))
    const colorMap: Record<string, string[]> = {
      brand: ['bg-brand-400/40 hover:bg-brand-400', 'bg-brand-400/30 hover:bg-brand-400'],
      cyan: ['bg-cyan-400/40 hover:bg-cyan-400', 'bg-cyan-400/30 hover:bg-cyan-400'],
    }
    const barClass = computed(() => (colorMap[props.color || 'brand'] || colorMap.brand)[props.isDark ? 0 : 1])

    return () => {
      if (!props.data?.length) return h('p', { class: `text-sm text-center py-6 ${props.isDark ? 'text-silver-600' : 'text-gray-400'}` }, 'No data yet')
      return h('div', {}, [
        h('div', { class: 'relative h-20' }, [
          h('div', { class: 'relative flex items-end gap-px h-full' },
            Array.from({ length: 24 }, (_, i) =>
              h('div', {
                key: i,
                class: `flex-1 rounded-t transition-colors ${barClass.value}`,
                style: { height: `${Math.max(2, (getVal(i) / maxVal.value) * 100)}%`, minHeight: '2px' },
                title: `${String(i).padStart(2, '0')}:00 — ${getVal(i)}`,
              })
            )
          ),
        ]),
        h('div', { class: 'flex justify-between mt-1.5' }, [
          h('span', { class: `text-[10px] ${props.isDark ? 'text-silver-600' : 'text-gray-400'}` }, '00:00'),
          h('span', { class: `text-[10px] ${props.isDark ? 'text-silver-600' : 'text-gray-400'}` }, '12:00'),
          h('span', { class: `text-[10px] ${props.isDark ? 'text-silver-600' : 'text-gray-400'}` }, '23:00'),
        ]),
      ])
    }
  },
})

// BreakdownList — horizontal bar breakdown
const BreakdownList = defineComponent({
  props: { items: Array as () => any[], labelKey: String, valueKey: String, isDark: Boolean },
  setup(props) {
    const maxVal = computed(() => Math.max(1, ...(props.items || []).map((d: any) => d[props.valueKey || 'count'] || 0)))
    const total = computed(() => (props.items || []).reduce((s: number, d: any) => s + (d[props.valueKey || 'count'] || 0), 0))

    return () => {
      if (!props.items?.length) return h('p', { class: `text-sm text-center py-4 ${props.isDark ? 'text-silver-600' : 'text-gray-400'}` }, 'No data yet')
      return h('div', { class: 'space-y-3' },
        props.items!.map((item: any) => {
          const val = item[props.valueKey || 'count'] || 0
          const pct = total.value ? Math.round((val / total.value) * 100) : 0
          return h('div', { key: item[props.labelKey!], class: 'flex items-center gap-3' }, [
            h('span', { class: `text-xs font-medium w-20 truncate ${props.isDark ? 'text-silver-400' : 'text-gray-500'}` }, item[props.labelKey!] || 'Unknown'),
            h('div', { class: `flex-1 h-2 rounded-full overflow-hidden ${props.isDark ? 'bg-brand-900/50' : 'bg-gray-100'}` }, [
              h('div', { class: 'h-full rounded-full bg-brand-400 transition-all', style: { width: `${Math.max(4, (val / maxVal.value) * 100)}%` } }),
            ]),
            h('span', { class: `text-xs font-mono w-14 text-right ${props.isDark ? 'text-silver-300' : 'text-gray-600'}` }, `${pct}%`),
          ])
        })
      )
    }
  },
})

// EmptyState
const EmptyState = defineComponent({
  setup() {
    return () => h('p', { class: `text-sm text-center py-6 ${isDark.value ? 'text-silver-600' : 'text-gray-400'}` }, 'No data yet')
  },
})
</script>
