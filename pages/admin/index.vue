<!--
  Admin Dashboard — Quick action buttons in header,
  stats, version, notifications, activity, system status,
  mini trend chart, auto-refresh
-->

<template>
  <div>
    <!-- Greeting Header -->
    <div class="mb-6">
      <div class="flex items-center justify-between mb-1">
        <div>
          <h1 class="text-2xl font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">
            {{ greeting }}, <span class="text-gradient">{{ user?.username || 'Admin' }}</span>
            <span class="inline-block ml-1.5 text-2xl">{{ greetingEmoji }}</span>
          </h1>
          <p class="text-sm mt-1" :class="isDark ? 'text-silver-500' : 'text-gray-500'">
            {{ todayFormatted }} &middot; Here's what's happening with your site.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-[11px] hidden sm:inline tabular-nums" :class="isDark ? 'text-silver-600' : 'text-gray-400'">{{ nextRefresh }}s</span>
          <UButton icon="i-heroicons-arrow-path" variant="ghost" color="neutral" size="sm" @click="refreshAll" :loading="refreshing" />
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        <NuxtLink v-for="qa in quickActions" :key="qa.to" :to="qa.to"
          class="glass rounded-xl p-4 transition-all hover:scale-[1.02] group">
          <div class="flex items-start gap-3">
            <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" :class="qa.bg">
              <UIcon :name="qa.icon" class="w-[18px] h-[18px]" :class="qa.color" />
            </div>
            <div class="min-w-0">
              <p class="text-sm font-semibold" :class="isDark ? 'text-white group-hover:text-brand-300' : 'text-gray-900 group-hover:text-brand-600'">{{ qa.label }}</p>
              <p class="text-xs mt-0.5 line-clamp-1" :class="isDark ? 'text-silver-500' : 'text-gray-400'">{{ qa.desc }}</p>
            </div>
          </div>
        </NuxtLink>
      </div>
    </div>

    <!-- Stats Row — clickable links to pages -->
    <div v-if="!stats" class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div v-for="i in 4" :key="'sk-'+i" class="glass rounded-xl p-5 admin-fade-in" :class="'admin-stagger-'+i">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg skeleton" :class="isDark ? 'bg-brand-900/50' : 'bg-gray-100'" />
          <div class="flex-1 space-y-2">
            <div class="h-7 w-14 rounded skeleton" :class="isDark ? 'bg-brand-900/50' : 'bg-gray-100'" />
            <div class="h-3 w-20 rounded skeleton" :class="isDark ? 'bg-brand-900/30' : 'bg-gray-100'" />
          </div>
        </div>
      </div>
    </div>
    <div v-else class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <NuxtLink v-for="(stat, idx) in statCards" :key="stat.label" :to="stat.to" class="glass rounded-xl p-5 transition-all hover:scale-[1.02] cursor-pointer group admin-fade-in" :class="'admin-stagger-'+(idx+1)">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg flex items-center justify-center transition-colors" :class="stat.bg">
            <UIcon :name="stat.icon" class="w-5 h-5" :class="stat.color" />
          </div>
          <div class="flex-1">
            <p class="text-2xl font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">{{ stat.value }}</p>
            <p class="text-xs" :class="isDark ? 'text-silver-500 group-hover:text-silver-300' : 'text-gray-500 group-hover:text-gray-700'">{{ stat.label }}</p>
          </div>
          <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" :class="isDark ? 'text-silver-600' : 'text-gray-400'" />
        </div>
      </NuxtLink>
    </div>

    <!-- Mini Trend Chart + Version + Notifications -->
    <div class="grid lg:grid-cols-3 gap-6 mb-6 admin-fade-in admin-stagger-3">

      <!-- 7-Day Copy Trend -->
      <div class="glass rounded-xl p-6">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">
            <UIcon name="i-heroicons-chart-bar" class="w-4 h-4 inline-block mr-1.5 -mt-0.5 text-brand-400" />
            Copy Trend
          </h2>
          <NuxtLink to="/admin/system/stats" class="text-xs text-brand-400 hover:underline">View all</NuxtLink>
        </div>
        <div class="flex items-end gap-3 mb-3">
          <div>
            <p class="text-2xl font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">{{ stats?.copiesLast7Days || 0 }}</p>
            <p class="text-xs" :class="isDark ? 'text-silver-500' : 'text-gray-400'">last 7 days</p>
          </div>
          <div v-if="trendPercent !== null" class="flex items-center gap-1 text-xs font-semibold mb-1"
            :class="trendPercent >= 0 ? 'text-green-400' : 'text-red-400'">
            <UIcon :name="trendPercent >= 0 ? 'i-heroicons-arrow-trending-up' : 'i-heroicons-arrow-trending-down'" class="w-4 h-4" />
            {{ Math.abs(trendPercent) }}% vs prev week
          </div>
        </div>
        <div v-if="last7Copies.length" class="relative h-24">
          <div class="absolute inset-0 flex flex-col justify-between pointer-events-none">
            <div class="border-b border-dashed" :class="isDark ? 'border-brand-400/8' : 'border-gray-100'">
              <span class="text-[9px] font-mono absolute -top-3 right-0" :class="isDark ? 'text-silver-700' : 'text-gray-300'">{{ maxLast7 }}</span>
            </div>
            <div class="border-b border-dashed" :class="isDark ? 'border-brand-400/8' : 'border-gray-100'" />
            <div />
          </div>
          <div class="relative flex items-end gap-1.5 h-full">
            <div v-for="(d, idx) in last7Copies" :key="idx" class="flex-1 flex flex-col items-center gap-1">
              <span class="text-[10px] font-mono font-semibold" :class="d.count > 0 ? (isDark ? 'text-silver-400' : 'text-gray-600') : (isDark ? 'text-silver-700' : 'text-gray-300')">
                {{ d.count }}
              </span>
              <div class="w-full rounded-t transition-colors"
                :class="isDark ? 'bg-brand-400/50 hover:bg-brand-400' : 'bg-brand-400/40 hover:bg-brand-400'"
                :style="{ height: `${barHeight(d.count, maxLast7)}%`, minHeight: d.count > 0 ? '6px' : '3px' }" />
            </div>
          </div>
        </div>
        <div v-else class="h-24 flex flex-col items-center justify-center gap-1">
          <UIcon name="i-heroicons-chart-bar" class="w-6 h-6" :class="isDark ? 'text-silver-700' : 'text-gray-300'" />
          <p class="text-xs" :class="isDark ? 'text-silver-600' : 'text-gray-400'">No data yet</p>
        </div>
        <div v-if="last7Copies.length" class="flex justify-between mt-1.5">
          <span v-for="(d, idx) in last7Copies" :key="'lbl-'+idx" class="flex-1 text-center text-[10px]" :class="isDark ? 'text-silver-600' : 'text-gray-400'">{{ shortDay(d.day) }}</span>
        </div>
      </div>

      <!-- Version Check Card -->
      <div class="glass rounded-xl p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">
            <UIcon name="i-simple-icons-github" class="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
            Addon Version
          </h2>
          <UButton size="xs" variant="subtle" icon="i-heroicons-arrow-path" :loading="versionChecking" @click="checkVersion">
            Check
          </UButton>
        </div>
        <div v-if="versionData" class="space-y-3">
          <div class="flex items-center gap-3">
            <div class="w-3 h-3 rounded-full" :class="versionData.isUpToDate ? 'bg-green-400' : 'bg-amber-400 animate-pulse'" />
            <span class="text-sm font-medium" :class="isDark ? 'text-silver-300' : 'text-gray-600'">
              {{ versionData.isUpToDate ? 'Up to date' : 'Update available' }}
            </span>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="rounded-lg p-3" :class="isDark ? 'bg-brand-900/50' : 'bg-gray-50'">
              <p class="text-xs mb-0.5" :class="isDark ? 'text-silver-500' : 'text-gray-500'">Local</p>
              <p class="text-lg font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">
                <template v-if="versionData.localVersion">v{{ versionData.localVersion }}</template>
                <span v-else class="text-sm font-normal" :class="isDark ? 'text-silver-600' : 'text-gray-400'">
                  Not configured
                  <NuxtLink to="/admin/system/settings" class="block text-[10px] mt-0.5 underline decoration-dotted" :class="isDark ? 'text-brand-400 hover:text-brand-300' : 'text-brand-600 hover:text-brand-500'">Set in Settings</NuxtLink>
                </span>
              </p>
            </div>
            <div class="rounded-lg p-3" :class="isDark ? 'bg-brand-900/50' : 'bg-gray-50'">
              <p class="text-xs mb-0.5" :class="isDark ? 'text-silver-500' : 'text-gray-500'">GitHub</p>
              <p class="text-lg font-bold" :class="versionData.isUpToDate ? 'text-green-400' : 'text-amber-400'">v{{ versionData.latestVersion }}</p>
            </div>
          </div>
          <NuxtLink v-if="!versionData.isUpToDate" to="/admin/system/github"
            class="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-xs font-medium transition-all"
            :class="isDark ? 'bg-brand-400/10 text-brand-300 hover:bg-brand-400/20' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'">
            <UIcon name="i-heroicons-arrow-up-circle" class="w-3.5 h-3.5" />
            Go to GitHub Sync
          </NuxtLink>
        </div>
        <div v-else class="text-center py-6">
          <UIcon name="i-simple-icons-github" class="w-8 h-8 mx-auto mb-2" :class="isDark ? 'text-silver-700' : 'text-gray-300'" />
          <p class="text-sm" :class="isDark ? 'text-silver-600' : 'text-gray-400'">Click "Check" to fetch version</p>
        </div>
      </div>

      <!-- Notifications Summary -->
      <div class="glass rounded-xl p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">
            <UIcon name="i-heroicons-bell" class="w-4 h-4 inline-block mr-1.5 -mt-0.5" :class="isDark ? 'text-silver-500' : 'text-gray-400'" />
            Notifications
          </h2>
          <UBadge v-if="notifCount > 0" :color="hasErrors ? 'error' : 'warning'" variant="subtle" size="xs">{{ notifCount }}</UBadge>
        </div>
        <div v-if="notifItems.length" class="space-y-2">
          <NuxtLink v-for="n in notifItems.slice(0, 4)" :key="n.id" :to="n.link || '#'"
            class="flex items-center gap-3 p-2.5 rounded-lg transition-all"
            :class="isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-gray-50'">
            <div class="w-2 h-2 rounded-full flex-shrink-0"
              :class="n.type === 'error' ? 'bg-red-400' : n.type === 'warning' ? 'bg-amber-400' : 'bg-blue-400'" />
            <span class="text-sm flex-1 truncate" :class="isDark ? 'text-silver-300' : 'text-gray-600'">{{ n.title }}</span>
            <UIcon name="i-heroicons-chevron-right" class="w-3.5 h-3.5 flex-shrink-0" :class="isDark ? 'text-silver-600' : 'text-gray-400'" />
          </NuxtLink>
        </div>
        <div v-else class="flex items-center gap-3 py-6 justify-center">
          <div class="w-3 h-3 rounded-full bg-green-400" />
          <p class="text-sm" :class="isDark ? 'text-silver-400' : 'text-gray-500'">All good!</p>
        </div>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="glass rounded-xl p-6 mb-6 admin-fade-in admin-stagger-4">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">
          <UIcon name="i-heroicons-clock" class="w-4 h-4 inline-block mr-1.5 -mt-0.5 text-brand-400" />
          Recent Activity
        </h2>
        <NuxtLink to="/admin/system/activity" class="text-xs text-brand-400 hover:underline">
          View all
        </NuxtLink>
      </div>
      <div v-if="stats?.recentActivity?.length" class="divide-y" :class="isDark ? 'divide-brand-400/5' : 'divide-gray-50'">
        <div v-for="item in stats.recentActivity.slice(0, 6)" :key="item.id"
          class="flex items-center gap-3 py-3 px-3 rounded-lg transition-colors"
          :class="isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50'">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            :class="item.action === 'created' ? 'bg-green-500/10' : item.action === 'updated' ? 'bg-blue-500/10' : 'bg-red-500/10'">
            <UIcon :name="actionIcon(item.action)" class="w-4 h-4" :class="actionColor(item.action)" />
          </div>
          <div class="flex-1 min-w-0">
            <span class="text-sm font-medium truncate block" :class="isDark ? 'text-silver-200' : 'text-gray-700'">{{ item.entityName }}</span>
            <span class="text-xs" :class="isDark ? 'text-silver-500' : 'text-gray-400'">{{ typeLabel(item.entityType) }}</span>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <span class="text-[11px] tabular-nums" :class="isDark ? 'text-silver-600' : 'text-gray-400'">{{ timeAgo(item.createdAt) }}</span>
            <UBadge :color="item.action === 'created' ? 'success' : item.action === 'updated' ? 'info' : 'error'" variant="subtle" size="sm">
              {{ item.action }}
            </UBadge>
          </div>
        </div>
      </div>
      <div v-else class="flex flex-col items-center justify-center py-8 gap-1">
        <UIcon name="i-heroicons-clock" class="w-6 h-6" :class="isDark ? 'text-silver-700' : 'text-gray-300'" />
        <p class="text-sm" :class="isDark ? 'text-silver-600' : 'text-gray-400'">No activity yet</p>
      </div>
    </div>

    <!-- System Status Bar -->
    <div class="glass rounded-xl px-5 py-3 admin-fade-in admin-stagger-6">
      <div class="flex flex-wrap items-center gap-4 sm:gap-6">
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full bg-green-400 ring-2 ring-green-400/20" />
          <span class="text-xs" :class="isDark ? 'text-silver-400' : 'text-gray-500'">Server</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full ring-2" :class="stats ? 'bg-green-400 ring-green-400/20' : 'bg-yellow-400 ring-yellow-400/20'" />
          <span class="text-xs" :class="isDark ? 'text-silver-400' : 'text-gray-500'">Database</span>
        </div>
        <div class="w-px h-3" :class="isDark ? 'bg-brand-400/10' : 'bg-gray-200'" />
        <div v-if="stats" class="flex items-center gap-4">
          <span class="text-xs tabular-nums" :class="isDark ? 'text-silver-500' : 'text-gray-500'">
            <strong class="font-semibold" :class="isDark ? 'text-silver-300' : 'text-gray-700'">{{ stats.copiesLast7Days || 0 }}</strong> copies
          </span>
          <span class="text-xs tabular-nums" :class="isDark ? 'text-silver-500' : 'text-gray-500'">
            <strong class="font-semibold" :class="isDark ? 'text-silver-300' : 'text-gray-700'">{{ stats.pageViewsLast7Days || 0 }}</strong> views
          </span>
          <span class="text-[10px]" :class="isDark ? 'text-silver-600' : 'text-gray-400'">7d</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })
const { apiFetch } = useApi()
const { user } = useAuth()
const isDark = useIsDark()

// Greeting + date
const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 5) return 'Good night'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
})
const greetingEmoji = computed(() => {
  const h = new Date().getHours()
  if (h < 5) return '🌙'
  if (h < 12) return '☀️'
  if (h < 18) return '🌤️'
  return '🌆'
})
const todayFormatted = computed(() => {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
})

// Quick action shortcuts
const quickActions = [
  { label: 'New Profile', desc: 'Add an addon import string', icon: 'i-heroicons-plus-circle', color: 'text-blue-400', bg: 'bg-blue-500/10', to: '/admin/strings/profiles?action=create' },
  { label: 'New Changelog', desc: 'Document latest changes', icon: 'i-heroicons-plus-circle', color: 'text-amber-400', bg: 'bg-amber-500/10', to: '/admin/content/changelog?action=create' },
  { label: 'View Stats', desc: 'Analyze traffic & copies', icon: 'i-heroicons-chart-bar', color: 'text-purple-400', bg: 'bg-purple-500/10', to: '/admin/system/stats' },
  { label: 'Settings', desc: 'Configure your site', icon: 'i-heroicons-cog-6-tooth', color: 'text-green-400', bg: 'bg-green-500/10', to: '/admin/system/settings' },
]

// Stats
interface Stats {
  profiles: number; wowupStrings: number; layouts: number; changelogs: number
  copiesLast7Days: number; uniqueVisitors: number; recentActivity: any[]
  dailyCopies: Array<{ day: string; count: number }>
  totalPageViews?: number; pageViewsLast7Days?: number; pageViewTrend?: number
}
const stats = ref<Stats | null>(null)
const refreshing = ref(false)

const statCards = computed(() => [
  { label: 'Addon Profiles', value: stats.value?.profiles ?? '—', icon: 'i-heroicons-cube', bg: 'bg-blue-500/10', color: 'text-blue-400', to: '/admin/strings/profiles' },
  { label: 'WowUp', value: stats.value?.wowupStrings ?? '—', icon: 'i-heroicons-arrow-down-tray', bg: 'bg-green-500/10', color: 'text-green-400', to: '/admin/strings/wowup' },
  { label: 'Character Layouts', value: stats.value?.layouts ?? '—', icon: 'i-heroicons-user-circle', bg: 'bg-purple-500/10', color: 'text-purple-400', to: '/admin/strings/layouts' },
  { label: 'Changelog', value: stats.value?.changelogs ?? '—', icon: 'i-heroicons-document-text', bg: 'bg-amber-500/10', color: 'text-amber-400', to: '/admin/content/changelog' },
])

// Mini 7-day trend chart
const last7Copies = computed(() => {
  const data = stats.value?.dailyCopies || []
  return data.slice(-7)
})
const prev7Copies = computed(() => {
  const data = stats.value?.dailyCopies || []
  return data.slice(-14, -7)
})
const maxLast7 = computed(() => Math.max(1, ...last7Copies.value.map(d => d.count)))
const trendPercent = computed(() => {
  const curr = last7Copies.value.reduce((s, d) => s + d.count, 0)
  const prev = prev7Copies.value.reduce((s, d) => s + d.count, 0)
  if (prev === 0) return null
  return Math.round(((curr - prev) / prev) * 100)
})

function barHeight(val: number, max: number): number {
  if (!val || !max) return 2
  return Math.max(8, (val / max) * 100)
}

function shortDay(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en', { weekday: 'short' }).slice(0, 2)
  } catch { return dateStr?.slice(8, 10) || '' }
}

// Auto-refresh every 60 seconds
const REFRESH_INTERVAL = 60
const nextRefresh = ref(REFRESH_INTERVAL)
let refreshTimer: ReturnType<typeof setInterval>

async function loadStats() {
  refreshing.value = true
  try { stats.value = await apiFetch('/api/v1/admin/stats') } catch { /* ok */ }
  finally { refreshing.value = false }
}

async function refreshAll() {
  nextRefresh.value = REFRESH_INTERVAL
  await loadStats()
  loadStoredVersion()
  notifRefresh(true)
}

// Version Check — auto-loads stored version, Check button fetches fresh from GitHub
const versionData = ref<{ latestVersion: string; localVersion: string | null; isUpToDate: boolean } | null>(null)
const versionChecking = ref(false)

async function loadStoredVersion() {
  try {
    const res = await apiFetch<any>('/api/v1/admin/github/status')
    if (res?.latestVersion) {
      versionData.value = {
        latestVersion: res.latestVersion,
        localVersion: res.localVersion || null,
        isUpToDate: !!(res.localVersion && res.latestVersion && res.localVersion === res.latestVersion),
      }
    }
  } catch { /* ok */ }
}

async function checkVersion() {
  versionChecking.value = true
  try {
    const res = await apiFetch<any>('/api/v1/admin/version-check', { method: 'POST' })
    if (res) versionData.value = res
  } catch { /* ok */ }
  finally { versionChecking.value = false }
}

// Notifications
const { notifications: notifItems, count: notifCount, refresh: notifRefresh } = useAdminNotifications()
const hasErrors = computed(() => notifItems.value.some(n => n.type === 'error'))

// Activity icons + time
function actionIcon(a: string) { return a === 'created' ? 'i-heroicons-plus-circle' : a === 'updated' ? 'i-heroicons-pencil-square' : a === 'deleted' ? 'i-heroicons-trash' : 'i-heroicons-information-circle' }
function actionColor(a: string) { return a === 'created' ? 'text-green-400' : a === 'updated' ? 'text-blue-400' : a === 'deleted' ? 'text-red-400' : 'text-silver-400' }
function typeLabel(type: string) {
  const labels: Record<string, string> = { profile: 'Addon Profile', wowup: 'WowUp String', layout: 'Character Layout', changelog: 'Changelog', content: 'Content' }
  return labels[type] || type
}
function timeAgo(d: string | number | null) {
  if (!d) return ''
  const date = typeof d === 'number' ? new Date(d * 1000) : new Date(d)
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
  loadStoredVersion()
  notifRefresh(true)

  // Auto-refresh countdown
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
