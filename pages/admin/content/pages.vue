<template>
  <div class="space-y-6">
    <AdminStickyBar :show="hasChanges" description="Page text changes are ready to publish.">
      <template #actions>
        <UButton variant="ghost" color="neutral" icon="i-heroicons-eye" data-testid="pages-review" @click="reviewOpen = true">
          Review changes
        </UButton>
        <UButton icon="i-heroicons-check" :loading="saving" data-testid="pages-save" @click="save">
          Save
        </UButton>
      </template>
    </AdminStickyBar>
    <AdminChangePreview v-model:open="reviewOpen" :changes="pendingChanges" :saving="saving" @confirm="save" />

    <AdminPageHeader
      icon="i-heroicons-document-duplicate"
      eyebrow="Content"
      title="Pages"
      description="About, Legal notice and Privacy text. Empty fields fall back to the built-in default. The contact email comes from Settings."
    >
      <template #actions>
        <div class="admin-segmented" role="tablist" aria-label="Page">
          <button
            v-for="p in pageTabs"
            :key="p.key"
            type="button"
            role="tab"
            class="admin-segmented__button"
            :aria-selected="page === p.key"
            :class="page === p.key ? 'admin-segmented__button--active' : ''"
            :data-testid="`pages-tab-${p.key}`"
            @click="page = p.key"
          >
            {{ p.label }}
          </button>
        </div>
      </template>
    </AdminPageHeader>

    <AdminPanel v-if="loading" title="Pages" description="Loading page content." icon="i-heroicons-document-duplicate">
      <div class="py-12 text-center">
        <UIcon name="i-heroicons-arrow-path" class="mx-auto h-8 w-8 animate-spin text-blue-500" />
      </div>
    </AdminPanel>

    <template v-else>
      <AdminPanel
        v-for="(keys, section) in forms[page]"
        :key="`${page}-${section}`"
        :title="sectionTitle(String(section))"
        :description="`Section ${section} on ${currentPath}`"
        icon="i-heroicons-pencil-square"
      >
        <div class="space-y-4">
          <div v-for="(_value, key) in keys" :key="`${page}-${section}-${key}`" class="admin-field">
            <label :for="fieldId(String(section), String(key))" class="admin-field__label">{{ fieldLabel(String(key)) }}</label>
            <template v-if="isHtmlCopyKey(String(key))">
              <UTextarea
                :id="fieldId(String(section), String(key))"
                v-model="forms[page][section]![key]"
                :disabled="saving"
                :rows="6"
                autoresize
                class="font-mono text-xs"
                :data-testid="fieldId(String(section), String(key))"
              />
              <p class="admin-field__hint">HTML (p, strong, code, a, ul, li, h3, dl). Sanitized on display.</p>
              <SafeHtml class="admin-preview-shell prose prose-sm mt-2 max-w-none dark:prose-invert" :html="forms[page][section]![key] || ''" />
            </template>
            <UInput
              v-else
              :id="fieldId(String(section), String(key))"
              v-model="forms[page][section]![key]"
              :disabled="saving"
              :data-testid="fieldId(String(section), String(key))"
            />
          </div>
        </div>
      </AdminPanel>
    </template>
    <AdminContentHistory v-if="!loading" ref="history" :pages="[page]" :label="currentPath" @restored="load" />
  </div>
</template>

<script setup lang="ts">
import { EDITABLE_PAGE_DEFAULTS, isHtmlCopyKey, mergePageCopy } from '~/utils/pageCopyDefaults'
import { diffContentForms, type ContentForm } from '~/utils/contentChanges'
import type { EditablePageKey, PageCopyDefaults } from '~/utils/pageCopyDefaults'

definePageMeta({ layout: 'admin' })

const toast = useToast()
const { apiFetch } = useApi()

const pageTabs: Array<{ key: EditablePageKey, label: string, path: string }> = [
  { key: 'about', label: 'About', path: '/about' },
  { key: 'imprint', label: 'Legal notice', path: '/imprint' },
  { key: 'privacy', label: 'Privacy', path: '/privacy' },
]

const route = useRoute()
const initialPage = pageTabs.some(p => p.key === route.query.page) ? route.query.page as EditablePageKey : 'about'
const page = ref<EditablePageKey>(initialPage)
const currentPath = computed(() => pageTabs.find(p => p.key === page.value)?.path || '')

const loading = ref(true)
const saving = ref(false)

function cloneDefaults(defaults: PageCopyDefaults): PageCopyDefaults {
  return JSON.parse(JSON.stringify(defaults))
}

const forms = reactive<Record<EditablePageKey, PageCopyDefaults>>({
  about: cloneDefaults(EDITABLE_PAGE_DEFAULTS.about),
  imprint: cloneDefaults(EDITABLE_PAGE_DEFAULTS.imprint),
  privacy: cloneDefaults(EDITABLE_PAGE_DEFAULTS.privacy),
})

const originalData = ref('')
const serialize = () => JSON.stringify(forms)
const reviewOpen = ref(false)
const history = ref<{ load: () => Promise<void> } | null>(null)
const pendingChanges = computed(() => {
  if (!originalData.value) return []
  const before = JSON.parse(originalData.value) as Record<string, ContentForm>
  return pageTabs.flatMap(({ key, label }) => diffContentForms(before[key] || {}, forms[key] as ContentForm)
    .map(c => ({ ...c, section: `${label} · ${c.section}` })))
})
const hasChanges = computed(() => !loading.value && !!originalData.value && serialize() !== originalData.value)

const sectionTitles: Record<string, string> = {
  header: 'Page heading',
  intro: 'What is MagguuUI?',
  features: 'What it does',
  website: 'What this website is for',
  contact: 'Contact',
  legal: 'Legal',
  operator: 'Operator',
  disclaimer: 'Disclaimer',
}

function sectionTitle(section: string) {
  if (/^s\d+$/.test(section)) return `Section ${section.slice(1)}`
  return sectionTitles[section] || section
}

function fieldLabel(key: string) {
  const labels: Record<string, string> = { eyebrow: 'Eyebrow label', title: 'Title', label: 'Label', body: 'Body', text: 'Text', lead: 'Lead-in before the email address' }
  return labels[key] || key
}

function fieldId(section: string, key: string) {
  return `page-${page.value}-${section}-${key}`
}

async function load() {
  loading.value = true
  try {
    await Promise.all(pageTabs.map(async ({ key }) => {
      try {
        const data = await apiFetch<Record<string, Record<string, Record<string, string>>>>(`/api/v1/admin/content/${key}`)
        forms[key] = mergePageCopy(EDITABLE_PAGE_DEFAULTS[key], data?.en)
      } catch {
        // Keep defaults.
      }
    }))
  } finally {
    loading.value = false
    nextTick(() => { originalData.value = serialize() })
  }
}

async function save() {
  saving.value = true
  const items: Array<{ page: string, section: string, key: string, value: string, locale: string, type: string }> = []
  for (const { key: pageKey } of pageTabs) {
    const defaults = EDITABLE_PAGE_DEFAULTS[pageKey]
    for (const [section, keys] of Object.entries(forms[pageKey])) {
      for (const [key, value] of Object.entries(keys)) {
        // Default text is not stored: an empty value deletes the row and the page shows the default.
        const stored = value.trim() === (defaults[section]?.[key] ?? '').trim() ? '' : value
        items.push({ page: pageKey, section, key, value: stored, locale: 'en', type: isHtmlCopyKey(key) ? 'html' : 'text' })
      }
    }
  }
  try {
    await apiFetch('/api/v1/admin/content/bulk', { method: 'POST', body: { items } })
    toast.add({ title: 'Pages saved', color: 'success' })
    reviewOpen.value = false
    nextTick(() => { originalData.value = serialize() })
    void history.value?.load()
  } catch {
    toast.add({ title: 'Error', color: 'error' })
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>
