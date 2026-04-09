<template>
  <div class="space-y-6">
    <AdminPageHeader
      icon="i-heroicons-document-text"
      eyebrow="Content"
      title="Changelog"
      description="Publish release notes, keep drafts tidy and archive older updates without noise."
    >
      <template #badge>
        <UBadge v-if="!loading" color="info" variant="subtle">{{ items.length }} total</UBadge>
      </template>

      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">
          New Entry
        </UButton>
      </template>
    </AdminPageHeader>

    <AdminPanel v-if="loading" title="Entries" description="Loading changelog entries." icon="i-heroicons-document-text">
      <div class="py-12 text-center">
        <UIcon name="i-heroicons-arrow-path" class="mx-auto h-8 w-8 animate-spin text-blue-500" />
      </div>
    </AdminPanel>

    <AdminPanel
      v-else
      title="Entries"
      description="Each entry should answer one question: what changed for users?"
      icon="i-heroicons-document-text"
    >
      <div class="admin-filterbar">
        <div class="flex flex-wrap items-center gap-2">
          <button
            v-for="filter in statusFilters"
            :key="filter.value"
            class="admin-segmented__button"
            :class="statusFilter === filter.value ? 'admin-segmented__button--active' : ''"
            @click="statusFilter = filter.value; currentPage = 1"
          >
            {{ filter.label }}
            <span class="ml-1 text-[11px] opacity-70">{{ filter.count }}</span>
          </button>
        </div>

        <UInput
          v-model="searchQuery"
          icon="i-heroicons-magnifying-glass"
          placeholder="Search version or content"
          class="min-w-0 flex-1"
          @input="currentPage = 1"
        />
      </div>

      <div v-if="paginatedItems.length" class="admin-list mt-5">
        <div v-for="item in paginatedItems" :key="item.id" class="admin-row">
          <div class="admin-row__content">
            <div class="flex flex-wrap items-center gap-2">
              <UBadge :color="item.isPublished ? 'success' : 'warning'" variant="subtle" size="xs">
                {{ item.isPublished ? "Live" : "Draft" }}
              </UBadge>
              <UBadge v-if="item.version === 'auto'" color="neutral" variant="subtle" size="xs">Auto</UBadge>
            </div>

            <p class="admin-row__title mt-1.5">
              {{ item.version === "auto" ? autoTitle(item) : `Version ${item.version}` }}
            </p>

            <p class="admin-row__meta line-clamp-1">{{ cleanPreview(item.content) }}</p>
            <p class="mt-1 text-xs text-slate-400 dark:text-slate-500">
              {{ formatDateFull(item.publishedAt || item.createdAt) }}
              <span v-if="changeCount(item.content) > 0"> · {{ changeCount(item.content) }} changes</span>
            </p>
          </div>

          <div class="admin-row__actions">
            <UButton icon="i-heroicons-pencil-square" size="xs" color="neutral" variant="ghost" @click="openEdit(item)" />
            <UButton
              :icon="item.isPublished ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
              size="xs"
              color="neutral"
              variant="ghost"
              @click="togglePublish(item)"
            />
            <UButton icon="i-heroicons-trash" size="xs" color="error" variant="ghost" @click="confirmDel(item)" />
          </div>
        </div>
      </div>

      <AdminEmptyState
        v-else
        icon="i-heroicons-document-text"
        title="No changelog entries"
        :description="isFiltering ? 'No entries match the current filter.' : 'Create the first release note.'"
      >
        <template #actions>
          <UButton
            v-if="isFiltering"
            icon="i-heroicons-x-mark"
            color="neutral"
            variant="ghost"
            @click="resetFilters"
          >
            Clear filters
          </UButton>
          <UButton v-else icon="i-heroicons-plus" @click="openCreate">Create entry</UButton>
        </template>
      </AdminEmptyState>

      <template v-if="totalPages > 1" #footer>
        <div class="flex w-full items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400">
          <span>
            Showing {{ (currentPage - 1) * PAGE_SIZE + 1 }}-{{ Math.min(currentPage * PAGE_SIZE, filteredAndSearched.length) }}
            of {{ filteredAndSearched.length }}
          </span>

          <div class="flex items-center gap-1">
            <UButton icon="i-heroicons-chevron-left" variant="ghost" color="neutral" size="xs" :disabled="currentPage <= 1" @click="currentPage--" />
            <template v-for="page in visiblePages" :key="page">
              <span v-if="page === '...'" class="px-1.5 text-xs">...</span>
              <UButton
                v-else
                :variant="currentPage === page ? 'solid' : 'ghost'"
                :color="currentPage === page ? 'primary' : 'neutral'"
                size="xs"
                :label="String(page)"
                @click="currentPage = page as number"
              />
            </template>
            <UButton icon="i-heroicons-chevron-right" variant="ghost" color="neutral" size="xs" :disabled="currentPage >= totalPages" @click="currentPage++" />
          </div>
        </div>
      </template>
    </AdminPanel>

    <UModal v-model:open="modalOpen" class="sm:max-w-3xl">
      <template #content>
        <div class="p-6">
          <h2 class="text-lg font-semibold text-slate-950 dark:text-white">
            {{ editing ? "Edit Entry" : "New Entry" }}
          </h2>

          <div class="mt-6 space-y-4">
            <div class="admin-form-grid admin-form-grid--2">
              <div class="admin-field">
                <label class="admin-field__label">Version</label>
                <UInput v-model="form.version" placeholder="e.g. 2.1.0 or auto" :disabled="saving" />
                <p class="admin-field__hint">Use "auto" for generated release checks.</p>
              </div>

              <div class="admin-switch-row">
                <div class="admin-switch-row__content">
                  <p class="admin-switch-row__title">Publish immediately</p>
                  <p class="admin-switch-row__description">Turn drafts live directly after saving.</p>
                </div>

                <USwitch v-model="form.isPublished" :disabled="saving" />
              </div>
            </div>

            <div class="admin-field">
              <label class="admin-field__label">Content</label>
              <TipTapEditor v-model="form.content" placeholder="What changed in this version..." min-height="300px" />
            </div>

            <UAlert v-if="formError" color="error" variant="subtle" :title="formError" />
          </div>

          <div class="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-white/8">
            <UButton variant="ghost" color="neutral" :disabled="saving" @click="modalOpen = false">Cancel</UButton>
            <UButton :loading="saving" icon="i-heroicons-check" @click="save">
              {{ editing ? "Save" : "Create" }}
            </UButton>
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
              <h2 class="text-lg font-semibold text-slate-950 dark:text-white">Delete entry?</h2>
              <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
                <template v-if="delItem?.version === 'auto'">This auto-generated entry</template>
                <template v-else>Version <strong class="text-slate-950 dark:text-white">{{ delItem?.version }}</strong></template>
                will be permanently deleted.
              </p>
            </div>
          </div>

          <div class="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4 dark:border-white/8">
            <UButton variant="ghost" color="neutral" :disabled="deleting" @click="delModal = false">Cancel</UButton>
            <UButton color="error" :loading="deleting" icon="i-heroicons-trash" @click="doDelete">Delete</UButton>
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

interface Changelog {
  id: number
  version: string
  content: string
  contentEn: string | null
  isPublished: boolean
  publishedAt: string | null
  createdAt: string
}

const items = ref<Changelog[]>([])
const loading = ref(true)
const modalOpen = ref(false)
const editing = ref<Changelog | null>(null)
const saving = ref(false)
const formError = ref("")
const form = reactive({ version: "", content: "", isPublished: false })
const delModal = ref(false)
const delItem = ref<Changelog | null>(null)
const deleting = ref(false)
const statusFilter = ref("all")
const searchQuery = ref("")
const currentPage = ref(1)
const PAGE_SIZE = 10

const filteredItems = computed(() => {
  if (statusFilter.value === "all") return items.value
  if (statusFilter.value === "published") return items.value.filter(item => item.isPublished)
  if (statusFilter.value === "draft") return items.value.filter(item => !item.isPublished)
  if (statusFilter.value === "auto") return items.value.filter(item => item.version === "auto")
  return items.value
})

const filteredAndSearched = computed(() => {
  if (!searchQuery.value.trim()) return filteredItems.value
  const query = searchQuery.value.toLowerCase().trim()
  return filteredItems.value.filter(item => {
    const version = item.version.toLowerCase()
    const contentText = stripHtml(item.content).toLowerCase()
    return version.includes(query) || contentText.includes(query)
  })
})

const isFiltering = computed(() => statusFilter.value !== "all" || searchQuery.value.trim().length > 0)

function resetFilters() {
  statusFilter.value = "all"
  searchQuery.value = ""
  currentPage.value = 1
}

const statusFilters = computed(() => [
  { label: "All", value: "all", count: items.value.length },
  { label: "Live", value: "published", count: items.value.filter(item => item.isPublished).length },
  { label: "Draft", value: "draft", count: items.value.filter(item => !item.isPublished).length },
  { label: "Auto", value: "auto", count: items.value.filter(item => item.version === "auto").length },
])

const totalPages = computed(() => Math.max(1, Math.ceil(filteredAndSearched.value.length / PAGE_SIZE)))

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return filteredAndSearched.value.slice(start, start + PAGE_SIZE)
})

const visiblePages = computed((): Array<number | string> => {
  const total = totalPages.value
  const current = currentPage.value

  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1)

  const pages: Array<number | string> = [1]
  if (current > 3) pages.push("...")

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  for (let page = start; page <= end; page += 1) pages.push(page)

  if (current < total - 2) pages.push("...")
  pages.push(total)

  return pages
})

watch(filteredAndSearched, () => {
  if (currentPage.value > totalPages.value) {
    currentPage.value = Math.max(1, totalPages.value)
  }
})

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
}

function cleanPreview(html: string) {
  return stripHtml(html)
    .replace(/^###?\s*/gm, "")
    .replace(/^-\s*/gm, "• ")
    .replace(/\*\*/g, "")
    .substring(0, 240)
}

function autoTitle(item: Changelog) {
  const match = item.content?.match(/Changes\s+(\d{4}-\d{2}-\d{2})/)

  if (match) {
    const date = new Date(match[1])
    return `Changes - ${date.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}`
  }

  return "Auto-generated changes"
}

function changeCount(content: string) {
  const text = stripHtml(content)
  return (text.match(/•|-/g) || []).length || (content.match(/<li>/g) || []).length
}

function formatDateFull(value: string | number | null) {
  if (!value) return "-"
  const date = typeof value === "number" ? new Date(value * 1000) : new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleDateString("en-US", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })
}

const route = useRoute()

async function load() {
  loading.value = true

  try {
    items.value = await apiFetch("/api/v1/admin/changelogs")
  } catch {
    toast.add({ title: "Error", color: "error" })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  load()
  if (route.query.action === "create") nextTick(() => openCreate())
})

function openCreate() {
  editing.value = null
  formError.value = ""
  Object.assign(form, { version: "", content: "", isPublished: false })
  modalOpen.value = true
}

function openEdit(item: Changelog) {
  editing.value = item
  formError.value = ""
  Object.assign(form, { version: item.version, content: item.content, isPublished: item.isPublished })
  modalOpen.value = true
}

async function save() {
  if (!form.version.trim() || !form.content.trim()) {
    formError.value = "Version and content are required"
    return
  }

  saving.value = true
  formError.value = ""

  try {
    const body = { ...form, contentEn: form.content }

    if (editing.value) {
      await apiFetch(`/api/v1/admin/changelogs/${editing.value.id}`, { method: "PUT", body })
      toast.add({ title: "Entry updated", color: "success" })
    } else {
      await apiFetch("/api/v1/admin/changelogs", { method: "POST", body })
      toast.add({ title: "Entry created", color: "success" })
    }

    modalOpen.value = false
    await load()
  } catch (error: any) {
    formError.value = error?.data?.message || "Error"
  } finally {
    saving.value = false
  }
}

async function togglePublish(item: Changelog) {
  try {
    await apiFetch(`/api/v1/admin/changelogs/${item.id}`, { method: "PUT", body: { isPublished: !item.isPublished } })
    await load()
    toast.add({ title: item.isPublished ? "Unpublished" : "Published", color: "success" })
  } catch {
    toast.add({ title: "Error", color: "error" })
  }
}

function confirmDel(item: Changelog) {
  delItem.value = item
  delModal.value = true
}

async function doDelete() {
  if (!delItem.value) return

  deleting.value = true

  try {
    await apiFetch(`/api/v1/admin/changelogs/${delItem.value.id}`, { method: "DELETE" })
    toast.add({ title: "Entry deleted", color: "success" })
    delModal.value = false
    await load()
  } catch {
    toast.add({ title: "Error", color: "error" })
  } finally {
    deleting.value = false
  }
}
</script>
