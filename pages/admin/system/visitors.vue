<template>
  <div class="space-y-6" data-testid="visitors-page">
    <AdminPageHeader
      icon="i-heroicons-eye"
      eyebrow="Analytics"
      title="Visitors"
      description="Visits of people who agreed to statistics in the cookie banner. Full IP address and user agent, so this page and its CSV export are for the admin role only."
    >
      <template #actions>
        <UButton icon="i-heroicons-arrow-path" variant="ghost" color="neutral" :loading="loading" @click="load">
          Refresh
        </UButton>
      </template>
    </AdminPageHeader>

    <div class="admin-dash">
      <section class="admin-dash__section" aria-labelledby="visitors-status-heading" data-testid="visitors-status">
        <h2 id="visitors-status-heading" class="admin-dash__label">Status</h2>
        <ul class="admin-dash__rows">
          <li class="admin-dash__row">
            <span>Visitor log (<span class="admin-dash__mono">NUXT_VISITOR_LOG</span>)</span>
            <span class="admin-dash__value" data-testid="visitors-flag">{{ data ? (data.enabled ? 'on' : 'off') : '…' }}</span>
          </li>
          <li class="admin-dash__row">
            <span>Stored sessions (kept 13 months, then deleted)</span>
            <span class="admin-dash__value" data-testid="visitors-stored">{{ data ? data.storedSessions : '…' }}</span>
          </li>
        </ul>
      </section>

      <section class="admin-dash__section" aria-labelledby="visitors-filter-heading" data-testid="visitors-filters">
        <h2 id="visitors-filter-heading" class="admin-dash__label">Filters</h2>
        <form class="admin-vfilters" @submit.prevent="apply">
          <label class="admin-vfield">
            <span>Period</span>
            <select v-model.number="form.days" data-testid="vf-days">
              <option v-for="p in periods" :key="p.value" :value="p.value">{{ p.label }}</option>
            </select>
          </label>
          <label class="admin-vfield">
            <span>Country</span>
            <select v-model="form.country" data-testid="vf-country">
              <option value="">All countries</option>
              <option v-for="c in data?.options.countries || []" :key="c.code" :value="c.code">{{ countryFlag(c.code) }} {{ countryName(c.code) }} ({{ c.sessions }})</option>
            </select>
          </label>
          <label class="admin-vfield">
            <span>Page visited</span>
            <select v-model="form.page" data-testid="vf-page">
              <option value="">All pages</option>
              <option v-for="p in data?.options.pages || []" :key="p" :value="p">{{ p }}</option>
            </select>
          </label>
          <label class="admin-vfield">
            <span>Referrer contains</span>
            <input v-model="form.referrer" type="text" maxlength="100" autocomplete="off" data-testid="vf-referrer">
          </label>
          <label class="admin-vfield">
            <span>UTM value</span>
            <input v-model="form.utm" type="text" maxlength="100" autocomplete="off" data-testid="vf-utm">
          </label>
          <label class="admin-vfield">
            <span>Visitors</span>
            <select v-model="form.visitor" data-testid="vf-visitor">
              <option value="">New and returning</option>
              <option value="new">New only</option>
              <option value="returning">Returning only</option>
            </select>
          </label>
          <div class="admin-vfilters__actions">
            <button type="submit" class="admin-vbtn admin-vbtn--primary" data-testid="vf-apply">Apply</button>
            <button type="button" class="admin-vbtn" data-testid="vf-reset" @click="reset">Reset</button>
            <a class="admin-vbtn" :href="exportUrl" download data-testid="visitors-export">Export CSV</a>
          </div>
        </form>
        <p class="admin-dash__muted">The CSV contains the filtered view, at most {{ exportCap.toLocaleString('en-GB') }} sessions, and every export is written to the audit log (counts only).</p>
      </section>

      <section class="admin-dash__section" aria-labelledby="visitors-list-heading" data-testid="visitors-list">
        <div class="admin-dash__sectionhead">
          <h2 id="visitors-list-heading" class="admin-dash__label">Sessions</h2>
          <span class="admin-dash__muted" data-testid="visitors-count">{{ data ? `${data.total} matching` : '' }}</span>
        </div>

        <p v-if="error" class="admin-dash__bad" role="alert">{{ error }}</p>
        <p v-else-if="!data" class="admin-dash__muted">Loading…</p>

        <div v-else-if="!data.rows.length" class="admin-vempty" data-testid="visitors-empty">
          <template v-if="data.storedSessions === 0">
            <p><strong>No consented visits yet</strong></p>
            <p class="admin-dash__muted">
              Visitors appear here only after they agree to statistics in the cookie banner; refusals, Global Privacy Control and Do Not Track are never recorded.
              The visitor log is <strong>{{ data.enabled ? 'on' : 'off' }}</strong>.
              <template v-if="!data.enabled">While it is off, no banner is shown and nothing is recorded. It is on by default and was switched off with the container setting <span class="admin-dash__mono">NUXT_VISITOR_LOG</span>; remove that setting (or set it to <span class="admin-dash__mono">true</span>) to switch it on again (see AGENTS.md).</template>
              <template v-else>The banner is live; the first agreeing visitor will show up here.</template>
            </p>
          </template>
          <p v-else class="admin-dash__muted">No sessions match these filters. {{ data.storedSessions }} sessions are stored in total.</p>
        </div>

        <template v-else>
          <div class="admin-vtable-wrap">
            <table class="admin-vtable" data-testid="visitors-table">
              <caption class="sr-only">Consented visitor sessions, newest first</caption>
              <thead>
                <tr>
                  <th scope="col">Start</th>
                  <th scope="col">Country</th>
                  <th scope="col">IP</th>
                  <th scope="col">Browser, OS, device</th>
                  <th scope="col">Referrer</th>
                  <th scope="col">UTM</th>
                  <th scope="col">Entry → exit</th>
                  <th scope="col" class="admin-vtable__num">Pages</th>
                  <th scope="col" class="admin-vtable__num">Duration</th>
                  <th scope="col"><span class="sr-only">Path</span></th>
                </tr>
              </thead>
              <tbody>
                <template v-for="row in data.rows" :key="row.id">
                  <tr :data-testid="`visitor-row-${row.id}`">
                    <td>{{ when(row.startedAt) }}<br><span class="admin-dash__muted">{{ row.returning ? 'returning' : 'new' }}</span></td>
                    <td>
                      <span aria-hidden="true">{{ countryFlag(row.country) }}</span> {{ countryName(row.country) }}
                      <template v-if="row.city"><br><span class="admin-dash__muted">{{ row.city }}</span></template>
                    </td>
                    <td class="admin-dash__mono">{{ row.ip || '–' }}</td>
                    <td>{{ row.browser }}, {{ row.os }}, {{ row.device }}</td>
                    <td class="admin-vtable__wrap">{{ row.referrerHost || 'direct' }}</td>
                    <td class="admin-vtable__wrap">{{ row.utm || '–' }}</td>
                    <td class="admin-dash__mono admin-vtable__wrap">{{ row.landingPath }} → {{ row.exitPath || row.landingPath }}</td>
                    <td class="admin-vtable__num">{{ row.pages }}</td>
                    <td class="admin-vtable__num">{{ duration(row.durationS) }}</td>
                    <td>
                      <button
                        type="button" class="admin-vbtn admin-vbtn--link" :aria-expanded="open === row.id" :aria-controls="`visitor-path-${row.id}`"
                        :data-testid="`visitor-toggle-${row.id}`" @click="toggle(row.id)"
                      >{{ open === row.id ? 'Hide path' : 'Show path' }}</button>
                    </td>
                  </tr>
                  <tr v-if="open === row.id" :id="`visitor-path-${row.id}`" class="admin-vtable__detail" :data-testid="`visitor-path-${row.id}`">
                    <td colspan="10">
                      <p v-if="detailLoading" class="admin-dash__muted">Loading…</p>
                      <template v-else-if="detail">
                        <p class="admin-dash__muted">
                          Screen {{ row.screen || '–' }} · language {{ row.language || '–' }} · time zone {{ row.timezone || '–' }}
                          · <span class="admin-dash__mono">{{ row.userAgent || 'no user agent' }}</span>
                          <template v-if="row.referrerUrl"> · referrer <span class="admin-dash__mono">{{ row.referrerUrl }}</span></template>
                        </p>
                        <table class="admin-vtable admin-vtable--inner" :data-testid="`visitor-hits-${row.id}`">
                          <caption class="admin-dash__label">Page sequence</caption>
                          <thead><tr><th scope="col">#</th><th scope="col">Page</th><th scope="col">Time</th><th scope="col" class="admin-vtable__num">Dwell</th><th scope="col" class="admin-vtable__num">Scroll depth</th></tr></thead>
                          <tbody>
                            <tr v-for="(h, i) in detail.hits" :key="i">
                              <td>{{ i + 1 }}</td>
                              <td class="admin-dash__mono">{{ h.path }}</td>
                              <td>{{ clock(h.at) }}</td>
                              <td class="admin-vtable__num">{{ h.dwellS === null ? '–' : duration(h.dwellS) }}</td>
                              <td class="admin-vtable__num">{{ h.scrollMax ? `${h.scrollMax}%` : '–' }}</td>
                            </tr>
                          </tbody>
                        </table>
                        <table v-if="detail.events.length" class="admin-vtable admin-vtable--inner" :data-testid="`visitor-events-${row.id}`">
                          <caption class="admin-dash__label">Clicks</caption>
                          <thead><tr><th scope="col">Kind</th><th scope="col">Target</th><th scope="col">On page</th><th scope="col">Time</th></tr></thead>
                          <tbody>
                            <tr v-for="(e, i) in detail.events" :key="i">
                              <td>{{ e.kind }}</td>
                              <td class="admin-dash__mono admin-vtable__wrap">{{ e.target }}</td>
                              <td class="admin-dash__mono">{{ e.path }}</td>
                              <td>{{ clock(e.at) }}</td>
                            </tr>
                          </tbody>
                        </table>
                        <p v-else class="admin-dash__muted">No clicks on marked buttons, downloads or external links.</p>
                      </template>
                      <p v-else class="admin-dash__bad" role="alert">The path could not be loaded.</p>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>

          <nav class="admin-vpager" aria-label="Pagination" data-testid="visitors-pager">
            <button type="button" class="admin-vbtn" :disabled="data.page <= 1" @click="go(data.page - 1)">Previous</button>
            <span class="admin-dash__muted" data-testid="visitors-page-info">Page {{ data.page }} of {{ data.pages }}</span>
            <button type="button" class="admin-vbtn" :disabled="data.page >= data.pages" @click="go(data.page + 1)">Next</button>
          </nav>
          <p v-if="data.total > data.pageSize * data.pages || data.page >= pageCap" class="admin-dash__muted">Only the newest {{ (pageCap * data.pageSize).toLocaleString('en-GB') }} sessions can be paged through. Narrow the filters or use the CSV export.</p>
        </template>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { VisitorDetail, VisitorListRow } from '~/utils/visitorView'
import { VISITOR_EXPORT_MAX_ROWS, VISITOR_MAX_OFFSET } from '~/utils/visitorView'

definePageMeta({ layout: 'admin' })

interface VisitorsResponse {
  rows: VisitorListRow[]
  total: number
  page: number
  pageSize: number
  pages: number
  enabled: boolean
  storedSessions: number
  options: { countries: Array<{ code: string, sessions: number }>, pages: string[] }
}

const { apiFetch } = useApi()
const route = useRoute()

const periods = [
  { label: 'Last 24 hours', value: 1 },
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
  { label: 'Last 13 months', value: 395 },
  { label: 'Everything stored', value: 0 },
]
const exportCap = VISITOR_EXPORT_MAX_ROWS

const q = (k: string) => (typeof route.query[k] === 'string' ? route.query[k] as string : '')
const form = reactive({
  days: q('days') === '' ? 30 : Number(q('days')),
  country: q('country'),
  page: q('visited'),
  referrer: q('referrer'),
  utm: q('utm'),
  visitor: q('visitor'),
})
const pageNo = ref(Math.max(1, Number(q('p')) || 1))
const data = ref<VisitorsResponse | null>(null)
const loading = ref(false)
const error = ref('')
const open = ref<string | null>(null)
const detail = ref<VisitorDetail | null>(null)
const detailLoading = ref(false)

const pageCap = computed(() => data.value ? Math.floor(VISITOR_MAX_OFFSET / data.value.pageSize) + 1 : 1)

function listQuery() {
  const p = new URLSearchParams()
  p.set('days', String(form.days))
  if (form.country) p.set('country', form.country)
  if (form.page) p.set('path', form.page)
  if (form.referrer.trim()) p.set('referrer', form.referrer.trim())
  if (form.utm.trim()) p.set('utm', form.utm.trim())
  if (form.visitor) p.set('visitor', form.visitor)
  return p
}

const exportUrl = computed(() => `/api/v1/admin/visitors/export?${listQuery().toString()}`)

async function load() {
  loading.value = true
  error.value = ''
  open.value = null
  try {
    const p = listQuery()
    p.set('page', String(pageNo.value))
    data.value = await apiFetch<VisitorsResponse>(`/api/v1/admin/visitors?${p.toString()}`)
    pageNo.value = data.value.page
    const keep: Record<string, string> = { days: String(form.days) }
    if (form.country) keep.country = form.country
    if (form.page) keep.visited = form.page
    if (form.referrer.trim()) keep.referrer = form.referrer.trim()
    if (form.utm.trim()) keep.utm = form.utm.trim()
    if (form.visitor) keep.visitor = form.visitor
    if (pageNo.value > 1) keep.p = String(pageNo.value)
    // The admin layout keys its content by route.fullPath, so router.replace would remount this page and drop what is being typed.
    window.history.replaceState(window.history.state, '', `${route.path}?${new URLSearchParams(keep).toString()}`)
  } catch {
    error.value = 'The visitor list could not be loaded.'
  } finally {
    loading.value = false
  }
}

function apply() { pageNo.value = 1; load() }
function reset() {
  Object.assign(form, { days: 30, country: '', page: '', referrer: '', utm: '', visitor: '' })
  apply()
}
function go(n: number) { pageNo.value = n; load() }

async function toggle(id: string) {
  if (open.value === id) { open.value = null; return }
  open.value = id
  detail.value = null
  detailLoading.value = true
  try {
    detail.value = await apiFetch<VisitorDetail>(`/api/v1/admin/visitors/${id}`)
  } catch {
    detail.value = null
  } finally {
    detailLoading.value = false
  }
}

const when = (ts: number) => new Date(ts * 1000).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
const clock = (ts: number) => new Date(ts * 1000).toLocaleTimeString('en-GB')
function duration(s: number) {
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  return m < 60 ? `${m}m ${String(s % 60).padStart(2, '0')}s` : `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`
}

onMounted(load)
</script>
