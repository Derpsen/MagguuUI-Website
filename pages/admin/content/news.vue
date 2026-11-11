<template>
  <div class="space-y-6">
    <AdminPageHeader
      icon="i-heroicons-newspaper"
      eyebrow="Content"
      title="News"
      description="Public articles, drafts, and sources. Author is always Magguu. Summaries stay under 160 characters."
    >
      <template #badge>
        <UBadge v-if="!loading" color="info" variant="subtle">{{ items.length }} total</UBadge>
      </template>
      <template #actions>
        <UButton icon="i-heroicons-plus" @click="openCreate">New article</UButton>
      </template>
    </AdminPageHeader>


    <AdminPanel v-if="loading" title="Articles" description="Loading news articles." icon="i-heroicons-newspaper">
      <div class="py-12 text-center">
        <UIcon name="i-heroicons-arrow-path" class="mx-auto h-8 w-8 animate-spin text-blue-500" />
      </div>
    </AdminPanel>

    <AdminPanel v-else title="Articles" description="Published articles appear on /news, the sitemap, and the RSS feed." icon="i-heroicons-newspaper">
      <div v-if="items.length" class="space-y-2">
        <div
          v-for="article in items"
          :key="article.id"
          class="rounded-lg border px-4 py-3"
          :class="isDark ? 'border-white/10' : 'border-slate-200'"
        >
          <div class="flex flex-wrap items-start gap-3">
            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap items-center gap-1.5 mb-1">
                <UBadge :color="article.isPublished ? 'success' : 'warning'" variant="subtle" size="xs">
                  {{ article.isPublished ? 'Published' : 'Unpublished' }}
                </UBadge>
                <span class="font-mono text-[11px]" :class="isDark ? 'text-white/40' : 'text-slate-400'">{{ article.slug }}</span>
              </div>
              <p class="text-sm font-medium" :class="isDark ? 'text-white' : 'text-slate-900'">{{ article.title }}</p>
              <p class="text-xs mt-0.5 line-clamp-2" :class="isDark ? 'text-white/40' : 'text-slate-500'">{{ article.summary }}</p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <UButton size="xs" variant="ghost" @click="openEdit(article)">Edit</UButton>
              <UButton size="xs" color="error" variant="ghost" @click="confirmDelete(article)">Delete</UButton>
            </div>
          </div>
        </div>
      </div>
      <p v-else class="py-8 text-sm text-center" :class="isDark ? 'text-white/50' : 'text-slate-500'">No news articles yet.</p>
    </AdminPanel>

    <UModal v-model:open="formOpen">
      <template #content>
        <UCard>
          <template #header>
            <h2 class="text-base font-semibold">{{ editingId ? 'Edit article' : 'New article' }}</h2>
          </template>
          <form class="space-y-4" @submit.prevent="save">
            <UFormField label="Title" required>
              <UInput v-model="form.title" @update:model-value="onTitle" />
            </UFormField>
            <UFormField label="Slug" required hint="Lowercase letters, numbers, and hyphens.">
              <UInput v-model="form.slug" @update:model-value="slugTouched = true" />
            </UFormField>
            <UFormField :label="`Summary (${form.summary.length}/160)`" required>
              <UTextarea v-model="form.summary" :maxlength="160" :rows="3" />
            </UFormField>
            <UFormField label="Body (Markdown)" required>
              <UTextarea v-model="form.body" :rows="14" />
            </UFormField>
            <div class="grid gap-4 sm:grid-cols-2">
              <UFormField label="Source URL">
                <UInput v-model="form.sourceUrl" placeholder="https://" />
              </UFormField>
              <UFormField label="Source name">
                <UInput v-model="form.sourceName" placeholder="Blizzard News" />
              </UFormField>
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <UFormField label="Published at (UTC date)">
                <UInput v-model="form.publishedDate" type="date" />
              </UFormField>
              <UFormField label="Tags">
                <UInput v-model="form.tagsText" placeholder="midnight, patch-12-1-5" />
              </UFormField>
            </div>
            <UFormField label="Author">
              <UInput model-value="Magguu" disabled />
            </UFormField>
            <UCheckbox v-model="form.isPublished" label="Published (listed on /news, sitemap, and RSS)" />
            <p v-if="errorMessage" class="text-sm text-red-500">{{ errorMessage }}</p>
            <div class="flex justify-end gap-2">
              <UButton variant="ghost" type="button" @click="formOpen = false">Cancel</UButton>
              <UButton type="submit" :loading="saving">Save</UButton>
            </div>
          </form>
        </UCard>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { NewsArticle } from '~/utils/news'
import { NEWS_AUTHOR, parseNewsTags } from '~/utils/news'
import { toIsoDate } from '~/utils/newsDates'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const isDark = useIsDark()
const toast = useToast()
const loading = ref(true)
const saving = ref(false)
const items = ref<NewsArticle[]>([])
const formOpen = ref(false)
const editingId = ref<number | null>(null)
const errorMessage = ref('')
const slugTouched = ref(false)

const form = reactive({
  title: '',
  slug: '',
  summary: '',
  body: '',
  sourceUrl: '',
  sourceName: '',
  publishedDate: '',
  tagsText: '',
  isPublished: false,
})

function slugFromTitle(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120)
}

function onTitle(value: string) {
  if (!slugTouched.value && !editingId.value) form.slug = slugFromTitle(value)
}

function resetForm() {
  form.title = ''
  form.slug = ''
  form.summary = ''
  form.body = ''
  form.sourceUrl = ''
  form.sourceName = ''
  form.publishedDate = toIsoDate(Math.floor(Date.now() / 1000))
  form.tagsText = ''
  form.isPublished = false
  errorMessage.value = ''
  slugTouched.value = false
}

async function load() {
  loading.value = true
  try {
    const res = await $fetch<{ data: NewsArticle[] }>('/api/v1/admin/news')
    items.value = res.data
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingId.value = null
  resetForm()
  formOpen.value = true
}

function openEdit(article: NewsArticle) {
  editingId.value = article.id
  slugTouched.value = true
  form.title = article.title
  form.slug = article.slug
  form.summary = article.summary
  form.body = article.body
  form.sourceUrl = article.sourceUrl || ''
  form.sourceName = article.sourceName || ''
  form.publishedDate = toIsoDate(article.publishedAt)
  form.tagsText = article.tags.join(', ')
  form.isPublished = article.isPublished
  errorMessage.value = ''
  formOpen.value = true
}

async function save() {
  saving.value = true
  errorMessage.value = ''
  const payload = {
    title: form.title.trim(),
    slug: form.slug.trim(),
    summary: form.summary.trim(),
    body: form.body,
    sourceUrl: form.sourceUrl.trim() || null,
    sourceName: form.sourceName.trim() || null,
    publishedAt: Math.floor(new Date(`${form.publishedDate}T00:00:00.000Z`).getTime() / 1000),
    tags: parseNewsTags(form.tagsText.split(',').map(item => item.trim()).filter(Boolean)),
    isPublished: form.isPublished,
    author: NEWS_AUTHOR,
  }
  try {
    if (editingId.value) {
      await $fetch(`/api/v1/admin/news/${editingId.value}`, { method: 'PUT', body: payload })
    } else {
      await $fetch('/api/v1/admin/news', { method: 'POST', body: payload })
    }
    formOpen.value = false
    toast.add({ title: 'News article saved', color: 'success' })
    await load()
  } catch (error: unknown) {
    const err = error as { data?: { message?: string }, message?: string }
    errorMessage.value = err?.data?.message || err?.message || 'Could not save the article.'
  } finally {
    saving.value = false
  }
}

async function confirmDelete(article: NewsArticle) {
  if (!window.confirm(`Delete “${article.title}”? This cannot be undone from here.`)) return
  await $fetch(`/api/v1/admin/news/${article.id}`, { method: 'DELETE' })
  toast.add({ title: 'News article deleted', color: 'success' })
  await load()
}

onMounted(load)
</script>
