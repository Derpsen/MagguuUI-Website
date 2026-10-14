<template>
  <div class="space-y-6">
    <AdminPageHeader
      icon="i-heroicons-bolt"
      eyebrow="System"
      title="Web Vitals"
      description="Anonymous real-user measurements, 75th percentile per page."
    />

    <AdminPanel title="p75 per page" :description="summary" icon="i-heroicons-table-cells">
      <div class="admin-filterbar">
        <USelect v-model="days" :items="dayOptions" value-key="value" class="w-32" aria-label="Time range" />
      </div>
      <p v-if="loading" class="py-6 text-sm">Loading…</p>
      <p v-else-if="!pages.length" class="py-6 text-sm" data-testid="vitals-empty">No samples yet.</p>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm" data-testid="vitals-table">
          <caption class="sr-only">Web Vitals p75 per page</caption>
          <thead>
            <tr class="text-left">
              <th scope="col" class="py-2 pr-4 font-medium">Page</th>
              <th v-for="m in metrics" :key="m" scope="col" class="py-2 pr-4 font-medium">{{ m }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in pages" :key="row.path" class="border-t" :class="isDark ? 'border-white/10' : 'border-slate-200'">
              <th scope="row" class="py-2 pr-4 font-mono font-normal">{{ row.path }}</th>
              <td v-for="m in metrics" :key="m" class="py-2 pr-4 tabular-nums">
                <template v-if="row.cells[m]">
                  {{ formatValue(m, row.cells[m]!.p75) }}
                  <span class="text-xs opacity-70">{{ row.cells[m]!.rating }} · n={{ row.cells[m]!.samples }}</span>
                </template>
                <template v-else>–</template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </AdminPanel>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })

interface VitalRow { path: string, metric: string, p75: number, samples: number, rating: string }

const { apiFetch } = useApi()
const isDark = useIsDark()
const metrics = ['LCP', 'INP', 'CLS', 'TTFB'] as const
const dayOptions = [
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 28 days', value: 28 },
  { label: 'Last 90 days', value: 90 },
]
const days = ref(28)
const loading = ref(true)
const rows = ref<VitalRow[]>([])
const total = ref(0)

const summary = computed(() => `${total.value} samples in the last ${days.value} days. No cookies, IPs or user agents are stored.`)

const pages = computed(() => {
  const byPath = new Map<string, Record<string, VitalRow>>()
  for (const r of rows.value) {
    if (!byPath.has(r.path)) byPath.set(r.path, {})
    byPath.get(r.path)![r.metric] = r
  }
  return [...byPath.entries()].map(([path, cells]) => ({ path, cells }))
})

function formatValue(metric: string, value: number) {
  return metric === 'CLS' ? (value / 1000).toFixed(3) : `${value} ms`
}

async function load() {
  loading.value = true
  try {
    const res = await apiFetch<{ total: number, rows: VitalRow[] }>(`/api/v1/admin/vitals?days=${days.value}`)
    rows.value = res.rows
    total.value = res.total
  } catch {
    rows.value = []
  } finally {
    loading.value = false
  }
}

watch(days, load)
onMounted(load)
</script>
