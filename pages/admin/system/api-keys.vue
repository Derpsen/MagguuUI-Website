<!--
  Admin — API Keys Management
  Create, list, delete API keys. Full key shown only once on creation.
  Stat cards, entrance animations, visual polish.
-->

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <h1 class="text-2xl font-bold text-gradient">API Keys</h1>
        <UBadge v-if="!loading" color="info" variant="subtle" size="xs">{{ keys.length }} key{{ keys.length !== 1 ? 's' : '' }}</UBadge>
      </div>
      <UButton icon="i-heroicons-plus" @click="createModal = true" size="sm">New API Key</UButton>
    </div>

    <!-- Stat Cards — Skeleton -->
    <div v-if="loading" class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div v-for="i in 4" :key="'sk-'+i" class="glass rounded-xl p-5 admin-fade-in" :class="'admin-stagger-'+i">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg" :class="isDark ? 'bg-brand-900/50 animate-pulse' : 'bg-gray-100 animate-pulse'" />
          <div class="flex-1 space-y-2">
            <div class="h-7 w-14 rounded" :class="isDark ? 'bg-brand-900/50 animate-pulse' : 'bg-gray-100 animate-pulse'" />
            <div class="h-3 w-20 rounded" :class="isDark ? 'bg-brand-900/30 animate-pulse' : 'bg-gray-100 animate-pulse'" />
          </div>
        </div>
      </div>
    </div>

    <!-- Stat Cards — Real -->
    <div v-else class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div v-for="(card, idx) in statCards" :key="idx" class="glass rounded-xl p-5 admin-fade-in" :class="'admin-stagger-' + (idx + 1)">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg flex items-center justify-center" :class="card.bg">
            <UIcon :name="card.icon" class="w-5 h-5" :class="card.color" />
          </div>
          <div>
            <p class="text-2xl font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">{{ card.value }}</p>
            <p class="text-xs" :class="isDark ? 'text-silver-500' : 'text-gray-500'">{{ card.label }}</p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="glass rounded-xl p-12 text-center">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-brand-400 animate-spin mx-auto" />
    </div>

    <div v-else class="space-y-6">
      <!-- Info Box -->
      <div class="rounded-xl p-4 flex items-start gap-3 admin-fade-in admin-stagger-5" :class="isDark ? 'bg-blue-500/5 border border-blue-400/10' : 'bg-blue-50 border border-blue-100'">
        <UIcon name="i-heroicons-information-circle" class="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <p class="text-sm" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
          API keys allow external access to the MagguuUI API. The full key is only displayed once during creation.
        </p>
      </div>

      <!-- Keys List -->
      <div v-if="keys.length" class="glass rounded-xl overflow-hidden admin-fade-in admin-stagger-6">
        <div class="divide-y" :class="isDark ? 'divide-brand-400/5' : 'divide-gray-100'">
          <div v-for="k in keys" :key="k.id"
            class="flex items-center justify-between px-5 py-4 transition-all hover:scale-[1.005]"
            :class="isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50'">
            <div class="flex items-center gap-4">
              <div class="w-10 h-10 rounded-lg flex items-center justify-center" :class="isDark ? 'bg-amber-500/10' : 'bg-amber-50'">
                <UIcon name="i-heroicons-key" class="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p class="font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">{{ k.name }}</p>
                <div class="flex items-center gap-3 mt-0.5">
                  <code class="text-xs font-mono" :class="isDark ? 'text-silver-500' : 'text-gray-400'">{{ k.keyPreview }}</code>
                  <UBadge :color="k.permissions === 'write' ? 'warning' : 'info'" variant="subtle" size="xs">{{ k.permissions }}</UBadge>
                </div>
                <p class="text-xs mt-0.5" :class="isDark ? 'text-silver-600' : 'text-gray-400'">
                  Created: {{ formatDate(k.createdAt) }}
                  <span v-if="k.lastUsed"> · Last used: {{ formatDate(k.lastUsed) }}</span>
                </p>
              </div>
            </div>
            <UButton icon="i-heroicons-trash" variant="ghost" color="error" size="xs" @click="confirmDel(k)" />
          </div>
        </div>
      </div>

      <div v-else class="glass rounded-xl p-12 text-center admin-fade-in admin-stagger-6">
        <UIcon name="i-heroicons-key" class="w-12 h-12 mx-auto mb-4" :class="isDark ? 'text-silver-700' : 'text-gray-300'" />
        <p class="text-base font-medium mb-1" :class="isDark ? 'text-silver-400' : 'text-gray-600'">No API keys yet</p>
        <p class="text-sm mb-5 max-w-sm mx-auto" :class="isDark ? 'text-silver-600' : 'text-gray-400'">API keys allow external applications to access your MagguuUI data securely.</p>
        <UButton icon="i-heroicons-plus" @click="createModal = true">New API Key</UButton>
      </div>
    </div>

    <!-- Create Modal -->
    <UModal v-model:open="createModal">
      <template #content>
        <div class="p-6">
          <h2 class="text-lg font-semibold mb-6" :class="isDark ? 'text-white' : 'text-gray-900'">Create API Key</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-1.5" :class="isDark ? 'text-silver-300' : 'text-gray-700'">Name</label>
              <UInput v-model="createForm.name" :placeholder="'e.g. WoW Addon Sync'" :disabled="creating" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1.5" :class="isDark ? 'text-silver-300' : 'text-gray-700'">Permissions</label>
              <USelect v-model="createForm.permissions" :items="[{ label: 'Read', value: 'read' }, { label: 'Read + Write', value: 'write' }]" value-key="value" :disabled="creating" />
            </div>
            <UAlert v-if="createError" color="error" variant="subtle" :title="createError" />
          </div>
          <div class="flex justify-end gap-3 mt-6 pt-4" :class="isDark ? 'border-t border-brand-400/10' : 'border-t border-gray-100'">
            <UButton variant="ghost" color="neutral" @click="createModal = false" :disabled="creating">Cancel</UButton>
            <UButton @click="doCreate" :loading="creating">Create</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Key Created Modal (show full key once) -->
    <UModal v-model:open="keyCreatedModal" :dismissible="false">
      <template #content>
        <div class="p-6">
          <div class="flex items-start gap-4 mb-5">
            <div class="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <UIcon name="i-heroicons-check-circle" class="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h2 class="text-lg font-semibold" :class="isDark ? 'text-white' : 'text-gray-900'">API Key Created</h2>
              <p class="text-sm mt-1" :class="isDark ? 'text-silver-400' : 'text-gray-500'">Copy the key now — it will not be shown again!</p>
            </div>
          </div>
          <div class="rounded-lg p-4 font-mono text-sm break-all relative group" :class="isDark ? 'bg-brand-900/80 text-brand-300 border border-brand-400/10' : 'bg-gray-50 text-blue-700 border border-gray-200'">
            {{ newKeyFull }}
            <button @click="copyKey" class="absolute top-2 right-2 p-1.5 rounded-md transition-all opacity-0 group-hover:opacity-100"
              :class="isDark ? 'bg-white/5 hover:bg-white/10 text-silver-400' : 'bg-gray-200 hover:bg-gray-300 text-gray-600'">
              <UIcon :name="keyCopied ? 'i-heroicons-check' : 'i-heroicons-clipboard-document'" class="w-4 h-4" />
            </button>
          </div>
          <div class="flex justify-end mt-6 pt-4" :class="isDark ? 'border-t border-brand-400/10' : 'border-t border-gray-100'">
            <UButton @click="keyCreatedModal = false; newKeyFull = ''">Done</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Delete Modal -->
    <UModal v-model:open="delModal">
      <template #content>
        <div class="p-6">
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
              <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h2 class="text-lg font-semibold mb-2" :class="isDark ? 'text-white' : 'text-gray-900'">Delete API Key?</h2>
              <p class="text-sm" :class="isDark ? 'text-silver-400' : 'text-gray-500'">
                <strong>{{ delKey?.name }}</strong> — This key will be permanently deleted. All applications using it will lose access.
              </p>
            </div>
          </div>
          <div class="flex justify-end gap-3 mt-6 pt-4" :class="isDark ? 'border-t border-brand-400/10' : 'border-t border-gray-100'">
            <UButton variant="ghost" color="neutral" @click="delModal = false" :disabled="deleting">Cancel</UButton>
            <UButton color="error" @click="doDelete" :loading="deleting">Delete</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const toast = useToast()
const { apiFetch } = useApi()
const isDark = useIsDark()

interface ApiKey { id: number; name: string; keyPreview: string; permissions: string; lastUsed: string | null; createdAt: string }
const keys = ref<ApiKey[]>([])
const loading = ref(true)

const statCards = computed(() => [
  { label: 'Total Keys', value: keys.value.length, icon: 'i-heroicons-key', bg: 'bg-blue-500/10', color: 'text-blue-400' },
  { label: 'Read-only', value: keys.value.filter(k => k.permissions === 'read').length, icon: 'i-heroicons-eye', bg: 'bg-green-500/10', color: 'text-green-400' },
  { label: 'Read + Write', value: keys.value.filter(k => k.permissions === 'write').length, icon: 'i-heroicons-pencil-square', bg: 'bg-amber-500/10', color: 'text-amber-400' },
  { label: 'Recently Used', value: keys.value.filter(k => k.lastUsed).length, icon: 'i-heroicons-clock', bg: 'bg-purple-500/10', color: 'text-purple-400' },
])

function formatDate(d: string | number | null) {
  if (!d) return '—'
  const date = typeof d === 'number' ? new Date(d * 1000) : new Date(d)
  return date.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

async function load() {
  loading.value = true
  try { keys.value = await apiFetch('/api/v1/admin/api-keys') } catch { /* ok */ }
  finally { loading.value = false }
}
onMounted(load)

// Create
const createModal = ref(false); const creating = ref(false); const createError = ref('')
const createForm = reactive({ name: '', permissions: 'read' })
const keyCreatedModal = ref(false); const newKeyFull = ref(''); const keyCopied = ref(false)

async function doCreate() {
  if (!createForm.name.trim()) { createError.value = 'Name required'; return }
  creating.value = true; createError.value = ''
  try {
    const res = await apiFetch<any>('/api/v1/admin/api-keys', { method: 'POST', body: { ...createForm } })
    createModal.value = false
    newKeyFull.value = res.key
    keyCreatedModal.value = true
    keyCopied.value = false
    Object.assign(createForm, { name: '', permissions: 'read' })
    await load()
  } catch (e: any) { createError.value = e?.data?.message || 'Error' }
  finally { creating.value = false }
}

async function copyKey() {
  try { await navigator.clipboard.writeText(newKeyFull.value); keyCopied.value = true; toast.add({ title: 'Copied!', color: 'success' }) }
  catch { const ta = document.createElement('textarea'); ta.value = newKeyFull.value; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); keyCopied.value = true }
}

// Delete
const delModal = ref(false); const delKey = ref<ApiKey | null>(null); const deleting = ref(false)
function confirmDel(k: ApiKey) { delKey.value = k; delModal.value = true }
async function doDelete() {
  if (!delKey.value) return; deleting.value = true
  try {
    await apiFetch(`/api/v1/admin/api-keys/${delKey.value.id}`, { method: 'DELETE' })
    toast.add({ title: 'API Key deleted', color: 'success' }); delModal.value = false; await load()
  } catch (e: any) { toast.add({ title: e?.data?.message || 'Error', color: 'error' }) }
  finally { deleting.value = false }
}
</script>
