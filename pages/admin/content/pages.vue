<template>
  <div class="space-y-6">
    <AdminStickyBar :show="hasChanges" description="Save your edits as a draft. Nothing goes live until you publish.">
      <template #actions>
        <UButton variant="ghost" color="neutral" icon="i-heroicons-eye" data-testid="pages-review" @click="reviewOpen = true">
          Review changes
        </UButton>
        <UButton icon="i-heroicons-check" :loading="saving" data-testid="pages-save" @click="save">
          Save draft
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
        <UButton
          variant="ghost"
          color="neutral"
          size="sm"
          :icon="previewOpen ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
          data-testid="pages-preview-toggle"
          @click="previewOpen = !previewOpen"
        >
          {{ previewOpen ? 'Hide preview' : 'Live preview' }}
        </UButton>
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

    <AdminDraftBar
      :count="draft.draftCount.value"
      :updated-at="draft.draftUpdatedAt.value"
      :dirty="hasChanges"
      :publishing="draft.publishing.value"
      :discarding="draft.discarding.value"
      @publish="publishDraft"
      @discard="discardDraft"
    />

    <AdminPanel v-if="loading" title="Pages" description="Loading page content." icon="i-heroicons-document-duplicate">
      <div class="py-12 text-center">
        <UIcon name="i-heroicons-arrow-path" class="mx-auto h-8 w-8 animate-spin text-blue-500" />
      </div>
    </AdminPanel>

    <div v-else class="grid gap-6" :class="previewOpen ? 'xl:grid-cols-2' : ''">
      <div class="space-y-6">
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
      </div>

      <aside v-if="previewOpen" class="admin-draft-preview" aria-label="Live preview" data-testid="pages-preview">
        <p class="admin-draft-preview__label">Live preview · {{ currentPath }} · draft</p>
        <div class="admin-draft-preview__frame public-shell" :class="isDark ? 'text-silver-200' : 'text-gray-800'">
          <PageViewAbout v-if="page === 'about'" :copy="previewCopy" :contact-email="contactEmail" />
          <PageViewImprint v-else-if="page === 'imprint'" :copy="previewCopy" :contact-email="contactEmail" />
          <PageViewPrivacy v-else :copy="previewCopy" />
        </div>
      </aside>
    </div>
    <AdminContentHistory v-if="!loading" ref="history" :pages="[page]" :label="currentPath" @restored="load" />
  </div>
</template>

<script setup lang="ts">
import { EDITABLE_PAGE_DEFAULTS, isHtmlCopyKey, mergePageCopy } from '~/utils/pageCopyDefaults'
import { diffContentForms, type ContentForm } from '~/utils/contentChanges'
import { overlayDrafts, type ContentTree, type DraftItem } from '~/utils/contentDrafts'
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
const isDark = useIsDark()
const siteSettings = usePublicSiteSettings()
const contactEmail = computed(() => siteSettings.value.contact_email || 'contact@magguu.xyz')
const previewOpen = ref(true)
const draft = useContentDraft(pageTabs.map(p => p.key))

function cloneDefaults(defaults: PageCopyDefaults): PageCopyDefaults {
  return JSON.parse(JSON.stringify(defaults))
}

const forms = reactive<Record<EditablePageKey, PageCopyDefaults>>({
  about: cloneDefaults(EDITABLE_PAGE_DEFAULTS.about),
  imprint: cloneDefaults(EDITABLE_PAGE_DEFAULTS.imprint),
  privacy: cloneDefaults(EDITABLE_PAGE_DEFAULTS.privacy),
})

const previewCopy = computed(() => mergePageCopy(EDITABLE_PAGE_DEFAULTS[page.value], forms[page.value]))

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

/** Items the form would store right now (default text is not stored: empty value = default). */
function buildItems(): DraftItem[] {
  const items: DraftItem[] = []
  for (const { key: pageKey } of pageTabs) {
    const defaults = EDITABLE_PAGE_DEFAULTS[pageKey]
    for (const [section, keys] of Object.entries(forms[pageKey])) {
      for (const [key, value] of Object.entries(keys)) {
        const stored = value.trim() === (defaults[section]?.[key] ?? '').trim() ? '' : value
        items.push({ page: pageKey, section, key, value: stored, locale: 'en', type: isHtmlCopyKey(key) ? 'html' : 'text' })
      }
    }
  }
  return items
}

async function load() {
  loading.value = true
  try {
    const published: Partial<Record<EditablePageKey, ContentTree>> = {}
    await Promise.all(pageTabs.map(async ({ key }) => {
      try {
        published[key] = await apiFetch<ContentTree>(`/api/v1/admin/content/${key}`)
      } catch {
        // Keep defaults.
      }
    }))
    // What the live site shows: used to store only the cells a draft changes.
    for (const { key } of pageTabs) forms[key] = mergePageCopy(EDITABLE_PAGE_DEFAULTS[key], published[key]?.en)
    draft.setPublished(buildItems())
    const drafts = await draft.fetchDrafts()
    for (const { key } of pageTabs) forms[key] = mergePageCopy(EDITABLE_PAGE_DEFAULTS[key], overlayDrafts(published[key], key, drafts).en)
  } finally {
    loading.value = false
    nextTick(() => { originalData.value = serialize() })
  }
}

async function save() {
  saving.value = true
  try {
    await draft.saveDraft(buildItems())
    toast.add({ title: 'Draft saved', description: 'Not live yet. Publish to show it to visitors.', color: 'success' })
    reviewOpen.value = false
    nextTick(() => { originalData.value = serialize() })
  } catch {
    toast.add({ title: 'Error', color: 'error' })
  } finally {
    saving.value = false
  }
}

async function publishDraft() {
  saving.value = true
  try {
    if (hasChanges.value) await draft.saveDraft(buildItems())
    const n = await draft.publish()
    toast.add({ title: 'Published', description: `${n} ${n === 1 ? 'field is' : 'fields are'} live now.`, color: 'success' })
    reviewOpen.value = false
    await load()
    void history.value?.load()
  } catch {
    toast.add({ title: 'Publish failed', color: 'error' })
  } finally {
    saving.value = false
  }
}

async function discardDraft() {
  try {
    await draft.discard()
    toast.add({ title: 'Draft discarded', color: 'success' })
    await load()
  } catch {
    toast.add({ title: 'Error', color: 'error' })
  }
}

onMounted(load)
</script>
