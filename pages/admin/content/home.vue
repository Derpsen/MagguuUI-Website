<template>
  <div class="space-y-6">
    <AdminStickyBar :show="hasChanges" description="Homepage changes are ready to publish.">
      <template #actions>
        <UButton icon="i-heroicons-check" :loading="saving" @click="save">
          Save
        </UButton>
      </template>
    </AdminStickyBar>

    <AdminPageHeader
      icon="i-heroicons-home"
      eyebrow="Content"
      title="Homepage"
      description="Keep the landing page concise: hero, section labels and three feature cards."
    >
      <template #actions>
        <div class="flex flex-wrap items-center gap-3">
          <div class="admin-segmented">
            <button
              class="admin-segmented__button"
              :class="tab === 'edit' ? 'admin-segmented__button--active' : ''"
              @click="tab = 'edit'"
            >
              Edit
            </button>
            <button
              class="admin-segmented__button"
              :class="tab === 'preview' ? 'admin-segmented__button--active' : ''"
              @click="tab = 'preview'"
            >
              Preview
            </button>
          </div>

          <UButton v-if="hasChanges" icon="i-heroicons-check" :loading="saving" @click="save">
            Save
          </UButton>
        </div>
      </template>
    </AdminPageHeader>

    <AdminPanel v-if="loading" title="Homepage" description="Loading homepage content." icon="i-heroicons-home">
      <div class="py-12 text-center">
        <UIcon name="i-heroicons-arrow-path" class="mx-auto h-8 w-8 animate-spin text-blue-500" />
      </div>
    </AdminPanel>

    <template v-else-if="tab === 'edit'">
      <AdminPanel title="Hero" description="This is the only part visitors should notice first." icon="i-heroicons-sparkles">
        <div class="admin-form-grid admin-form-grid--2">
          <div class="admin-field">
            <label class="admin-field__label">Heading line 1</label>
            <UInput v-model="form.hero.title" :disabled="saving" placeholder="Your WoW Interface," />
            <p class="admin-field__hint" :class="counterClass(form.hero.title?.length || 0, 40)">
              {{ form.hero.title?.length || 0 }}/40
            </p>
          </div>

          <div class="admin-field">
            <label class="admin-field__label">Heading line 2</label>
            <UInput v-model="form.hero.title2" :disabled="saving" placeholder="perfected." />
            <p class="admin-field__hint" :class="counterClass(form.hero.title2?.length || 0, 30)">
              {{ form.hero.title2?.length || 0 }}/30
            </p>
          </div>
        </div>

        <div class="mt-4 admin-field">
          <label class="admin-field__label">Subtitle</label>
          <TipTapEditor v-model="form.hero.description" placeholder="Short description..." min-height="96px" />
        </div>
      </AdminPanel>

      <div class="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <AdminPanel title="Section labels" description="Only keep the labels users actually scan." icon="i-heroicons-rectangle-group">
          <div class="space-y-4">
            <div class="admin-subpanel space-y-4">
              <div>
                <p class="admin-row__eyebrow">Addons</p>
                <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Headline for supported addons.</p>
              </div>

              <div class="admin-field">
                <label class="admin-field__label">Title</label>
                <UInput v-model="form.addons.title" :disabled="saving" placeholder="Supported Addons" />
              </div>

              <div class="admin-field">
                <label class="admin-field__label">Subtitle</label>
                <UInput
                  v-model="form.addons.subtitle"
                  :disabled="saving"
                  placeholder="Profiles for the most popular WoW addons"
                />
              </div>
            </div>

            <div class="admin-subpanel space-y-4">
              <div>
                <p class="admin-row__eyebrow">Features</p>
                <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Short heading above the three feature cards.</p>
              </div>

              <div class="admin-field">
                <label class="admin-field__label">Title</label>
                <UInput v-model="form.features_heading.title" :disabled="saving" placeholder="Why MagguuUI?" />
              </div>

              <div class="admin-field">
                <label class="admin-field__label">Subtitle</label>
                <UInput
                  v-model="form.features_heading.subtitle"
                  :disabled="saving"
                  placeholder="Everything you need in one package"
                />
              </div>
            </div>
          </div>
        </AdminPanel>

        <AdminPanel title="Feature cards" description="Three cards are enough. Keep each one sharp." icon="i-heroicons-squares-2x2">
          <div class="grid gap-4 xl:grid-cols-3">
            <div v-for="index in featureIndices" :key="index" class="admin-subpanel space-y-4">
              <div class="flex items-center justify-between gap-3">
                <p class="admin-row__eyebrow">Feature {{ index }}</p>
                <span class="admin-pill">{{ featureEmoji(index) || "?" }}</span>
              </div>

              <div class="grid gap-4 sm:grid-cols-[72px_minmax(0,1fr)]">
                <div class="admin-field">
                  <label class="admin-field__label">Icon</label>
                  <UInput
                    v-model="form.features[`feature_${index}_emoji`]"
                    :disabled="saving"
                    maxlength="2"
                    class="text-center text-lg"
                  />
                </div>

                <div class="admin-field">
                  <label class="admin-field__label">Title</label>
                  <UInput v-model="form.features[`feature_${index}_title`]" :disabled="saving" />
                </div>
              </div>

              <div class="admin-field">
                <label class="admin-field__label">Description</label>
                <TipTapEditor
                  v-model="form.features[`feature_${index}_text`]"
                  placeholder="Feature description..."
                  min-height="110px"
                />
              </div>
            </div>
          </div>
        </AdminPanel>
      </div>
    </template>

    <AdminPanel
      v-else
      title="Preview"
      description="A compact approximation of what visitors will see."
      icon="i-heroicons-eye"
    >
      <div class="space-y-6">
        <div class="admin-preview-shell text-center">
          <p class="admin-row__eyebrow">Hero</p>
          <h2 class="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
            {{ form.hero.title || "Your WoW Interface," }}
            <br>
            <span class="text-slate-500 dark:text-slate-400">{{ form.hero.title2 || "perfected." }}</span>
          </h2>
          <div
            class="prose prose-sm mx-auto mt-4 max-w-2xl dark:prose-invert"
            v-html="renderPreviewHtml(form.hero.description, '<em>No subtitle set</em>')"
          />
        </div>

        <div class="grid gap-6 xl:grid-cols-2">
          <div class="admin-preview-shell">
            <p class="admin-row__eyebrow">Supported addons</p>
            <h3 class="mt-3 text-xl font-semibold text-slate-950 dark:text-white">
              {{ form.addons.title || "Supported Addons" }}
            </h3>
            <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {{ form.addons.subtitle || "Profiles for the most popular WoW addons" }}
            </p>
            <div class="mt-4 flex flex-wrap gap-2">
              <span
                v-for="name in previewAddons"
                :key="name"
                class="admin-pill"
              >
                {{ name }}
              </span>
            </div>
          </div>

          <div class="admin-preview-shell">
            <p class="admin-row__eyebrow">Features heading</p>
            <h3 class="mt-3 text-xl font-semibold text-slate-950 dark:text-white">
              {{ form.features_heading.title || "Why MagguuUI?" }}
            </h3>
            <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {{ form.features_heading.subtitle || "Everything you need in one package" }}
            </p>
          </div>
        </div>

        <div class="grid gap-4 xl:grid-cols-3">
          <div v-for="index in featureIndices" :key="`preview-${index}`" class="admin-preview-shell text-center">
            <div class="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-xl text-blue-500 dark:text-blue-300">
              {{ featureEmoji(index) || "?" }}
            </div>
            <h3 class="mt-4 text-base font-semibold text-slate-950 dark:text-white">
              {{ featureTitle(index) || `Feature ${index}` }}
            </h3>
            <div
              class="prose prose-sm mt-3 max-w-none text-left dark:prose-invert"
              v-html="renderPreviewHtml(featureText(index), '<em>No description</em>')"
            />
          </div>
        </div>
      </div>
    </AdminPanel>
  </div>
</template>

<script setup lang="ts">
import { sanitizeRichHtml } from '~/utils/richText'

definePageMeta({ layout: "admin" })

const toast = useToast()
const { apiFetch } = useApi()

const loading = ref(true)
const saving = ref(false)
const tab = ref<"edit" | "preview">("edit")

const previewAddons = ["ElvUI", "Plater", "BigWigs", "Details"]
const featureIndices = [1, 2, 3] as const

const form = reactive({
  hero: {
    title: "Your WoW Interface,",
    title2: "perfected.",
    description: "High-quality import strings for cooldowns, addon profiles, and more. Simply copy and paste into WoW.",
  } as Record<string, string>,
  addons: {
    title: "Supported Addons",
    subtitle: "Profiles for the most popular WoW addons",
  } as Record<string, string>,
  features_heading: {
    title: "Why MagguuUI?",
    subtitle: "Everything you need in one package",
  } as Record<string, string>,
  features: {
    feature_1_emoji: "A",
    feature_1_title: "Pre-configured Profiles",
    feature_1_text: "Pre-configured profiles for ElvUI, Plater, BigWigs, Details, and more.",
    feature_2_emoji: "B",
    feature_2_title: "Class Layouts",
    feature_2_text: "Optimized cooldown layouts for every class and specialization.",
    feature_3_emoji: "C",
    feature_3_title: "Always Up-to-Date",
    feature_3_text: "Regular updates with the latest changes and improvements for every addon.",
  } as Record<string, string>,
})

const originalData = ref("")

function serializeForm(): string {
  return JSON.stringify({
    hero: { ...form.hero },
    addons: { ...form.addons },
    features_heading: { ...form.features_heading },
    features: { ...form.features },
  })
}

const hasChanges = computed(() => {
  if (loading.value || !originalData.value) return false
  return serializeForm() !== originalData.value
})

function snapshotOriginal() {
  originalData.value = serializeForm()
}

function counterClass(value: number, max: number) {
  return value > max ? "text-amber-500" : "text-slate-400 dark:text-slate-500"
}

function featureEmoji(index: typeof featureIndices[number]) {
  return form.features[`feature_${index}_emoji`]
}

function featureTitle(index: typeof featureIndices[number]) {
  return form.features[`feature_${index}_title`]
}

function featureText(index: typeof featureIndices[number]) {
  return form.features[`feature_${index}_text`]
}

function renderPreviewHtml(value: string, fallback: string) {
  return sanitizeRichHtml(value || fallback)
}

async function load() {
  loading.value = true

  try {
    const data = await apiFetch<Record<string, Record<string, Record<string, string>>>>("/api/v1/admin/content/home")
    const source = data?.en || data?.de

    if (source?.hero) Object.assign(form.hero, source.hero)
    if (source?.addons) Object.assign(form.addons, source.addons)
    if (source?.features_heading) Object.assign(form.features_heading, source.features_heading)
    if (source?.features) Object.assign(form.features, source.features)
  } catch {
    // Keep defaults.
  } finally {
    loading.value = false
    nextTick(() => snapshotOriginal())
  }
}

async function save() {
  saving.value = true

  const items: Array<{ page: string; section: string; key: string; value: string; locale: string }> = []

  for (const [key, value] of Object.entries(form.hero)) {
    items.push({ page: "home", section: "hero", key, value, locale: "en" })
  }

  for (const [key, value] of Object.entries(form.addons)) {
    items.push({ page: "home", section: "addons", key, value, locale: "en" })
  }

  for (const [key, value] of Object.entries(form.features_heading)) {
    items.push({ page: "home", section: "features_heading", key, value, locale: "en" })
  }

  for (const [key, value] of Object.entries(form.features)) {
    items.push({ page: "home", section: "features", key, value, locale: "en" })
  }

  try {
    await apiFetch("/api/v1/admin/content/bulk", { method: "POST", body: { items } })
    toast.add({ title: "Homepage saved", color: "success" })
    nextTick(() => snapshotOriginal())
  } catch {
    toast.add({ title: "Error", color: "error" })
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>
