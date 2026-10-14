<template>
  <AdminPanel title="History" :description="`Previous values for ${label}. Restore puts one back live; the replaced value is kept too.`" icon="i-heroicons-clock">
    <p v-if="loading" class="text-sm">Loading…</p>
    <p v-else-if="!items.length" class="text-sm" data-testid="content-history-empty">No earlier versions yet.</p>
    <ul v-else class="divide-y divide-[var(--admin-border)]" data-testid="content-history">
      <li v-for="rev in items" :key="rev.id" class="py-2.5 flex flex-wrap items-start gap-3 text-sm">
        <div class="min-w-0 flex-1">
          <p class="font-mono text-xs">
            <span class="text-[var(--admin-label)]">{{ rev.page }} · {{ rev.section }} · {{ rev.key }}</span>
            <span class="opacity-70"> — {{ formatDate(rev.createdAt) }}{{ rev.username ? ` · ${rev.username}` : '' }}</span>
          </p>
          <p class="mt-1 break-words opacity-90">{{ excerpt(rev.value) }}</p>
        </div>
        <UButton
          size="xs"
          variant="ghost"
          color="neutral"
          :disabled="rev.value === rev.current || restoring !== null"
          :loading="restoring === rev.id"
          :aria-label="`Restore ${rev.section} ${rev.key} from ${formatDate(rev.createdAt)}`"
          data-testid="content-history-restore"
          @click="restore(rev)"
        >
          {{ rev.value === rev.current ? 'Current' : 'Restore' }}
        </UButton>
      </li>
    </ul>
  </AdminPanel>
</template>

<script setup lang="ts">
interface Revision {
  id: number
  page: string
  section: string
  key: string
  value: string | null
  current: string | null
  createdAt: string
  username?: string | null
}

const props = defineProps<{ pages: string[], label: string }>()
const emit = defineEmits<{ restored: [] }>()
const { apiFetch } = useApi()
const toast = useToast()
const items = ref<Revision[]>([])
const loading = ref(true)
const restoring = ref<number | null>(null)

function excerpt(value: string | null) {
  if (value === null) return '(default text)'
  const text = value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return text.length > 160 ? `${text.slice(0, 160)}…` : text || '(empty)'
}

function formatDate(value: string) {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString()
}

async function load() {
  loading.value = true
  try {
    const q = props.pages.map(p => `page=${encodeURIComponent(p)}`).join('&')
    items.value = await apiFetch<Revision[]>(`/api/v1/admin/content/revisions?${q}`)
  } catch {
    items.value = []
  } finally {
    loading.value = false
  }
}

async function restore(rev: Revision) {
  restoring.value = rev.id
  try {
    await apiFetch(`/api/v1/admin/content/revisions/${rev.id}/restore`, { method: 'POST' })
    toast.add({ title: 'Restored', color: 'success' })
    emit('restored')
    await load()
  } catch {
    toast.add({ title: 'Restore failed', color: 'error' })
  } finally {
    restoring.value = null
  }
}

defineExpose({ load })
watch(() => props.pages.join(','), load)
onMounted(load)
</script>
