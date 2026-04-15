<template>
  <div class="space-y-6">
    <AdminPageHeader
      icon="i-heroicons-key"
      eyebrow="System"
      title="API Keys"
      description="Keep integrations narrow: name every key clearly and delete unused access fast."
    >
      <template #badge>
        <UBadge v-if="!loading" color="info" variant="subtle">{{ keys.length }} keys</UBadge>
      </template>

      <template #actions>
        <UButton icon="i-heroicons-plus" @click="createModal = true">
          New API Key
        </UButton>
      </template>
    </AdminPageHeader>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <AdminMetricCard
        v-for="card in statCards"
        :key="card.label"
        :label="card.label"
        :value="card.value"
        :icon="card.icon"
        :tone="card.tone"
      />
    </div>

    <AdminPanel
      title="Keys"
      description="The full key is only shown once after creation. Treat delete as revoke."
      icon="i-heroicons-key"
    >
      <div v-if="loading" class="py-12 text-center">
        <UIcon name="i-heroicons-arrow-path" class="mx-auto h-8 w-8 animate-spin text-blue-500" />
      </div>

      <div v-else-if="keys.length" class="admin-list">
        <div v-for="key in keys" :key="key.id" class="admin-row">
          <div class="flex min-w-0 flex-1 items-start gap-4">
            <div class="admin-empty-state__icon admin-tone-warning h-10 w-10">
              <UIcon name="i-heroicons-key" class="h-4 w-4" />
            </div>

            <div class="admin-row__content">
              <div class="flex flex-wrap items-center gap-2">
                <p class="admin-row__title">{{ key.name }}</p>
                <UBadge :color="key.permissions === 'write' ? 'warning' : 'info'" variant="subtle" size="xs">
                  {{ key.permissions }}
                </UBadge>
              </div>

              <p class="admin-row__meta font-mono">{{ key.keyPreview }}</p>
              <p class="mt-2 text-xs text-slate-400 dark:text-slate-500">
                Created {{ formatDate(key.createdAt) }}
                <span v-if="key.lastUsed"> · Last used {{ formatDate(key.lastUsed) }}</span>
              </p>
            </div>
          </div>

          <div class="admin-row__actions">
            <UButton icon="i-heroicons-trash" variant="ghost" color="error" size="xs" @click="confirmDel(key)" />
          </div>
        </div>
      </div>

      <AdminEmptyState
        v-else
        icon="i-heroicons-key"
        title="No API keys yet"
        description="Create a key only when an external integration actually needs access."
      >
        <template #actions>
          <UButton icon="i-heroicons-plus" @click="createModal = true">New API Key</UButton>
        </template>
      </AdminEmptyState>
    </AdminPanel>

    <UModal v-model:open="createModal">
      <template #content>
        <div class="p-6">
          <h2 class="text-lg font-semibold text-slate-950 dark:text-white">Create API Key</h2>

          <div class="mt-6 space-y-4">
            <div class="admin-field">
              <label class="admin-field__label">Name</label>
              <UInput v-model="createForm.name" :disabled="creating" placeholder="e.g. WoW Addon Sync" />
            </div>

            <div class="admin-field">
              <label class="admin-field__label">Permissions</label>
              <USelect
                v-model="createForm.permissions"
                :items="permissionOptions"
                value-key="value"
                :disabled="creating"
              />
            </div>

            <UAlert v-if="createError" color="error" variant="subtle" :title="createError" />
          </div>

          <div class="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-white/8">
            <UButton variant="ghost" color="neutral" :disabled="creating" @click="createModal = false">Cancel</UButton>
            <UButton :loading="creating" @click="doCreate">Create</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="keyCreatedModal" :dismissible="false">
      <template #content>
        <div class="p-6">
          <div class="flex items-start gap-4">
            <div class="admin-empty-state__icon admin-tone-success h-10 w-10">
              <UIcon name="i-heroicons-check-circle" class="h-5 w-5" />
            </div>

            <div>
              <h2 class="text-lg font-semibold text-slate-950 dark:text-white">API key created</h2>
              <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Copy the key now. It will not be shown again.
              </p>
            </div>
          </div>

          <div class="relative mt-5">
            <pre class="admin-code-block break-all whitespace-pre-wrap">{{ newKeyFull }}</pre>
            <UButton
              class="absolute right-3 top-3"
              :icon="keyCopied ? 'i-heroicons-check' : 'i-heroicons-clipboard-document'"
              color="neutral"
              variant="ghost"
              size="xs"
              @click="copyKey"
            />
          </div>

          <div class="mt-6 flex justify-end border-t border-slate-200 pt-4 dark:border-white/8">
            <UButton @click="keyCreatedModal = false; newKeyFull = ''">Done</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="delModal">
      <template #content>
        <div class="p-6">
          <div class="flex items-start gap-4">
            <div class="admin-empty-state__icon admin-tone-danger h-10 w-10">
              <UIcon name="i-heroicons-exclamation-triangle" class="h-5 w-5" />
            </div>

            <div>
              <h2 class="text-lg font-semibold text-slate-950 dark:text-white">Delete API key?</h2>
              <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
                <strong class="text-slate-950 dark:text-white">{{ delKey?.name }}</strong> will lose access immediately.
              </p>
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-white/8">
            <UButton variant="ghost" color="neutral" :disabled="deleting" @click="delModal = false">Cancel</UButton>
            <UButton color="error" :loading="deleting" @click="doDelete">Delete</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "admin" })

const toast = useToast()
const { apiFetch } = useApi()

interface ApiKey {
  id: number
  name: string
  keyPreview: string
  permissions: string
  lastUsed: string | null
  createdAt: string
}

const keys = ref<ApiKey[]>([])
const loading = ref(true)

const statCards = computed(() => [
  { label: "Total Keys", value: keys.value.length, icon: "i-heroicons-key", tone: "brand" as const },
  { label: "Read-only", value: keys.value.filter(key => key.permissions === "read").length, icon: "i-heroicons-eye", tone: "success" as const },
  { label: "Read + Write", value: keys.value.filter(key => key.permissions === "write").length, icon: "i-heroicons-pencil-square", tone: "warning" as const },
  { label: "Recently Used", value: keys.value.filter(key => key.lastUsed).length, icon: "i-heroicons-clock", tone: "violet" as const },
])

const permissionOptions = [
  { label: "Read", value: "read" },
  { label: "Read + Write", value: "write" },
]

function formatDate(value: string | number | null) {
  if (!value) return "-"
  const date = typeof value === "number" ? new Date(value * 1000) : new Date(value)
  return date.toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric" })
}

async function load() {
  loading.value = true
  try {
    keys.value = await apiFetch("/api/v1/admin/api-keys")
  } catch {
    keys.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)

const createModal = ref(false)
const creating = ref(false)
const createError = ref("")
const createForm = reactive({ name: "", permissions: "read" })
const keyCreatedModal = ref(false)
const newKeyFull = ref("")
const keyCopied = ref(false)

async function doCreate() {
  if (!createForm.name.trim()) {
    createError.value = "Name required"
    return
  }

  creating.value = true
  createError.value = ""

  try {
    const response = await apiFetch<{ key: string }>("/api/v1/admin/api-keys", { method: "POST", body: { ...createForm } })
    createModal.value = false
    newKeyFull.value = response.key
    keyCreatedModal.value = true
    keyCopied.value = false
    Object.assign(createForm, { name: "", permissions: "read" })
    await load()
  } catch (error: unknown) {
    createError.value = errorMessage(error, "Error")
  } finally {
    creating.value = false
  }
}

async function copyKey() {
  try {
    await navigator.clipboard.writeText(newKeyFull.value)
    keyCopied.value = true
    toast.add({ title: "Copied", color: "success" })
  } catch {
    const textarea = document.createElement("textarea")
    textarea.value = newKeyFull.value
    textarea.style.cssText = "position:fixed;opacity:0"
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand("copy")
    document.body.removeChild(textarea)
    keyCopied.value = true
  }
}

const delModal = ref(false)
const delKey = ref<ApiKey | null>(null)
const deleting = ref(false)

function confirmDel(key: ApiKey) {
  delKey.value = key
  delModal.value = true
}

async function doDelete() {
  if (!delKey.value) return
  deleting.value = true

  try {
    await apiFetch(`/api/v1/admin/api-keys/${delKey.value.id}`, { method: "DELETE" })
    toast.add({ title: "API key deleted", color: "success" })
    delModal.value = false
    await load()
  } catch (error: unknown) {
    toast.add({ title: errorMessage(error, "Error"), color: "error" })
  } finally {
    deleting.value = false
  }
}
</script>
