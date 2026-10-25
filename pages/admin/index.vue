<template>
  <div class="admin-dash" data-testid="admin-dashboard">
    <header class="admin-dash__head">
      <div class="min-w-0">
        <p class="admin-dash__label">Overview</p>
        <h1 class="admin-dash__title">{{ greeting }}</h1>
        <p class="admin-dash__muted">
          Site data only: content, changelog, FAQ, strings, drafts and the audit log.
          <span data-testid="admin-dash-refresh-note">Auto refresh {{ nextRefresh }}s.</span>
        </p>
        <p class="admin-dash__muted admin-dash__mono" data-testid="admin-live-build" :title="buildInfo?.gitSha">
          Live: {{ buildLabel }}
        </p>
      </div>
      <UButton size="xs" color="neutral" variant="ghost" icon="i-heroicons-arrow-path" :loading="refreshing" data-testid="admin-dash-refresh" @click="refreshAll">
        Refresh
      </UButton>
    </header>

    <p v-if="!overview" class="admin-dash__muted" data-testid="admin-dash-loading">{{ failed ? 'The overview could not be loaded.' : 'Loading…' }}</p>

    <template v-else>
      <section class="admin-dash__section" aria-labelledby="dash-attention" data-testid="dash-attention">
        <h2 id="dash-attention" class="admin-dash__label">Needs attention</h2>
        <ul v-if="attention.length" class="admin-dash__rows">
          <li v-for="item in attention" :key="item.id" class="admin-dash__row" :data-testid="`dash-attention-${item.id}`">
            <span>{{ item.text }}</span>
            <NuxtLink :to="item.to" class="admin-dash__link">Open</NuxtLink>
          </li>
        </ul>
        <p v-else class="admin-dash__muted">Nothing open. No drafts, unpublished notes or stale strings.</p>
      </section>

      <div class="admin-dash__grid">
        <section class="admin-dash__section" aria-labelledby="dash-content" data-testid="dash-content">
          <h2 id="dash-content" class="admin-dash__label">Content</h2>
          <ul class="admin-dash__rows">
            <li v-for="row in contentRows" :key="row.key" class="admin-dash__row" :data-testid="`dash-count-${row.key}`">
              <NuxtLink :to="row.to" class="admin-dash__name">{{ row.label }}</NuxtLink>
              <span class="admin-dash__value">{{ row.value }}</span>
            </li>
          </ul>
        </section>

        <section class="admin-dash__section" aria-labelledby="dash-publishing" data-testid="dash-publishing">
          <h2 id="dash-publishing" class="admin-dash__label">Publishing</h2>
          <ul class="admin-dash__rows">
            <li class="admin-dash__row" data-testid="dash-latest-version">
              <span>Latest changelog</span>
              <span class="admin-dash__value">
                {{ overview.changelog.latestVersion ? `v${overview.changelog.latestVersion.replace(/^v/i, '')}` : 'none' }}
                <span v-if="overview.changelog.latestPublishedAt" class="admin-dash__muted"> · {{ when(overview.changelog.latestPublishedAt) }}</span>
              </span>
            </li>
            <li class="admin-dash__row" data-testid="dash-last-publish">
              <span>Last content publish</span>
              <span class="admin-dash__value">{{ overview.lastChange.publishAt ? when(overview.lastChange.publishAt) : 'none yet' }}</span>
            </li>
            <li class="admin-dash__row" data-testid="dash-last-change">
              <span>Last change</span>
              <span class="admin-dash__value">
                <template v-if="overview.lastChange.any">
                  {{ when(overview.lastChange.any.createdAt) }}
                  <span class="admin-dash__muted"> · {{ overview.lastChange.any.actorName || 'system' }}</span>
                </template>
                <template v-else>none yet</template>
              </span>
            </li>
            <li v-for="row in overview.lastChange.byType" :key="row.entityType" class="admin-dash__row admin-dash__row--sub">
              <span class="admin-dash__type">{{ typeLabel(row.entityType) }}</span>
              <span class="admin-dash__value">{{ when(row.at) }}<span class="admin-dash__muted"> · {{ row.actorName || 'system' }}</span></span>
            </li>
          </ul>
        </section>

        <section class="admin-dash__section" aria-labelledby="dash-traffic" data-testid="dash-traffic">
          <h2 id="dash-traffic" class="admin-dash__label">Traffic, own counters, 7 days</h2>
          <ul class="admin-dash__rows">
            <li class="admin-dash__row" data-testid="dash-views">
              <span>Page views</span>
              <span class="admin-dash__value">{{ overview.traffic.views7d }}<span class="admin-dash__muted"> · {{ formatTrend(overview.traffic.views7d, overview.traffic.viewsPrev7d) }}</span></span>
            </li>
            <li class="admin-dash__row">
              <span>Daily visitors, summed</span>
              <span class="admin-dash__value">{{ overview.traffic.visitors7d }}</span>
            </li>
            <li class="admin-dash__row" data-testid="dash-copies">
              <span>String copies</span>
              <span class="admin-dash__value">{{ overview.traffic.copies7d }}<span class="admin-dash__muted"> · {{ formatTrend(overview.traffic.copies7d, overview.traffic.copiesPrev7d) }}</span></span>
            </li>
          </ul>
          <p class="admin-dash__label admin-dash__label--sub">Most copied, 30 days</p>
          <ul v-if="overview.traffic.topCopied.length" class="admin-dash__rows">
            <li v-for="item in overview.traffic.topCopied" :key="`${item.type}-${item.name}`" class="admin-dash__row">
              <span class="admin-dash__name">{{ item.name }}</span>
              <span class="admin-dash__value">{{ item.copies }}</span>
            </li>
          </ul>
          <p v-else class="admin-dash__muted">No copies yet.</p>
        </section>

        <section class="admin-dash__section" aria-labelledby="dash-health" data-testid="dash-health">
          <h2 id="dash-health" class="admin-dash__label">Health, this site</h2>
          <ul class="admin-dash__rows">
            <li class="admin-dash__row" data-testid="dash-db">
              <span>Database</span>
              <span class="admin-dash__value" :class="overview.health.database === 'ok' ? '' : 'admin-dash__bad'">{{ overview.health.database === 'ok' ? 'ok' : 'unavailable' }}</span>
            </li>
            <li class="admin-dash__row">
              <span>Database size</span>
              <span class="admin-dash__value">{{ formatBytes(overview.health.dbSizeBytes) }}</span>
            </li>
            <li class="admin-dash__row">
              <span>Uptime</span>
              <span class="admin-dash__value">{{ formatUptime(overview.health.uptimeSeconds) }}</span>
            </li>
            <li class="admin-dash__row">
              <span>Audit log</span>
              <span class="admin-dash__value">{{ overview.health.auditRows }} entries</span>
            </li>
            <li class="admin-dash__row">
              <span>Activity log</span>
              <span class="admin-dash__value">{{ overview.health.activityRows }} entries</span>
            </li>
          </ul>
        </section>
      </div>

      <section class="admin-dash__section" aria-labelledby="dash-recent" data-testid="dash-recent">
        <div class="admin-dash__sectionhead">
          <h2 id="dash-recent" class="admin-dash__label">Recent changes</h2>
          <NuxtLink to="/admin/system/audit" class="admin-dash__link">Audit log</NuxtLink>
        </div>
        <ul v-if="overview.recent.length" class="admin-dash__rows">
          <li v-for="entry in overview.recent" :key="entry.id" class="admin-dash__row">
            <span class="min-w-0">
              <span class="admin-dash__type">{{ entry.action }}</span>
              <span class="admin-dash__name"> {{ entry.entityName }}</span>
              <span class="admin-dash__muted"> · {{ typeLabel(entry.entityType) }} · {{ entry.actorName || 'system' }}</span>
            </span>
            <span class="admin-dash__muted">{{ when(entry.createdAt) }}</span>
          </li>
        </ul>
        <p v-else class="admin-dash__muted">No audited changes yet.</p>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { formatBuildLabel, type BuildInfo } from '~/utils/buildInfo'
import type { Overview } from '~/server/utils/adminOverview'

definePageMeta({ layout: 'admin' })

const { apiFetch } = useApi()
const { user } = useAuth()

const greeting = computed(() => {
  const h = new Date().getHours()
  const name = user.value?.username || 'Admin'
  if (h < 12) return `Good morning, ${name}`
  if (h < 18) return `Good afternoon, ${name}`
  return `Good evening, ${name}`
})

const overview = ref<Overview | null>(null)
const failed = ref(false)
const refreshing = ref(false)

const REFRESH_INTERVAL = 60
const nextRefresh = ref(REFRESH_INTERVAL)
let refreshTimer: ReturnType<typeof setInterval>

const attention = computed(() => overview.value ? attentionItems(overview.value) : [])

const contentRows = computed(() => {
  const c = overview.value?.counts
  if (!c) return []
  return [
    { key: 'content', label: 'Site content', value: `${c.contentPages} pages · ${c.contentCells} fields`, to: '/admin/content' },
    { key: 'changelog', label: 'Changelog', value: `${c.changelogPublished} published / ${c.changelogTotal}`, to: '/admin/content/changelog' },
    { key: 'faq', label: 'FAQ', value: visibleOf(c.faqTotal, c.faqVisible), to: '/admin/content/faq' },
    { key: 'profiles', label: 'Profiles', value: visibleOf(c.profilesTotal, c.profilesVisible), to: '/admin/strings/profiles' },
    { key: 'wowup', label: 'WowUp strings', value: visibleOf(c.wowupTotal, c.wowupVisible), to: '/admin/strings/wowup' },
    { key: 'layouts', label: 'Layouts', value: visibleOf(c.layoutsTotal, c.layoutsVisible), to: '/admin/strings/layouts' },
  ]
})

const TYPE_LABELS: Record<string, string> = {
  content: 'Content', changelog: 'Changelog', faq: 'FAQ', setting: 'Settings',
  profile: 'Profile', wowup: 'WowUp', layout: 'Layout', addon: 'Addon',
}
const typeLabel = (t: string) => TYPE_LABELS[t] || t
const when = (ts: number) => new Date(ts * 1000).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })

async function loadOverview(fresh = false) {
  refreshing.value = true
  try {
    overview.value = await apiFetch<Overview>(`/api/v1/admin/overview${fresh ? '?fresh=1' : ''}`)
    failed.value = false
  } catch {
    failed.value = !overview.value
  } finally {
    refreshing.value = false
  }
}

const buildInfo = ref<BuildInfo | null>(null)
const buildLabel = computed(() => buildInfo.value ? formatBuildLabel(buildInfo.value) : '…')

async function loadBuildInfo() {
  try {
    buildInfo.value = await apiFetch<BuildInfo>('/api/v1/admin/system/build')
  } catch {
    buildInfo.value = null
  }
}

async function refreshAll() {
  nextRefresh.value = REFRESH_INTERVAL
  await loadOverview(true)
}

onMounted(async () => {
  await Promise.all([loadOverview(), loadBuildInfo()])
  refreshTimer = setInterval(() => {
    nextRefresh.value--
    if (nextRefresh.value <= 0) {
      nextRefresh.value = REFRESH_INTERVAL
      void loadOverview()
    }
  }, 1000)
})

onBeforeUnmount(() => clearInterval(refreshTimer))
</script>
