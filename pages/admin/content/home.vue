<template>
  <div class="space-y-6">
    <AdminStickyBar :show="hasChanges" description="Save your edits as a draft. Nothing goes live until you publish.">
      <template #actions>
        <UButton variant="ghost" color="neutral" icon="i-heroicons-eye" data-testid="home-review" @click="reviewOpen = true">
          Review changes
        </UButton>
        <UButton icon="i-heroicons-check" :loading="saving" data-testid="home-save" @click="save">
          Save draft
        </UButton>
      </template>
    </AdminStickyBar>
    <AdminChangePreview v-model:open="reviewOpen" :changes="pendingChanges" :saving="saving" @confirm="save" />

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

    <AdminPanel v-if="loading" title="Homepage" description="Loading homepage content." icon="i-heroicons-home">
      <div class="py-12 text-center">
        <UIcon name="i-heroicons-arrow-path" class="mx-auto h-8 w-8 animate-spin text-blue-500" />
      </div>
    </AdminPanel>

    <template v-else-if="tab === 'edit'">
      <!-- Hero -->
      <AdminPanel title="Hero" description="The first thing visitors see — keep it punchy." icon="i-heroicons-sparkles">
        <div class="space-y-4">
          <div class="admin-form-grid admin-form-grid--2">
            <div class="admin-field">
              <label for="home-hero-title" class="admin-field__label">Heading line 1</label>
              <UInput id="home-hero-title" v-model="form.hero.title" :disabled="saving" placeholder="MagguuUI" />
              <p class="admin-field__hint" :class="counterClass(form.hero.title?.length || 0, 40)">
                {{ form.hero.title?.length || 0 }}/40
              </p>
            </div>
            <div class="admin-field">
              <label for="home-hero-title2" class="admin-field__label">Heading line 2</label>
              <UInput id="home-hero-title2" v-model="form.hero.title2" :disabled="saving" placeholder="Ellesmere setup." />
              <p class="admin-field__hint" :class="counterClass(form.hero.title2?.length || 0, 30)">
                {{ form.hero.title2?.length || 0 }}/30
              </p>
            </div>
          </div>
          <div class="admin-field">
            <label for="home-hero-description" class="admin-field__label">Subtitle</label>
            <TipTapEditor id="home-hero-description" v-model="form.hero.description" placeholder="Short description..." min-height="80px" />
          </div>
          <div class="admin-field">
            <label for="home-hero-eyebrow" class="admin-field__label">Eyebrow label</label>
            <UInput id="home-hero-eyebrow" v-model="form.hero.eyebrow" :disabled="saving" data-testid="home-hero-eyebrow" :placeholder="HOME_HERO_EXTRA_DEFAULTS.eyebrow" />
          </div>
          <div v-for="n in [1, 2, 3]" :key="`step-${n}`" class="admin-field">
            <label :for="`home-hero-step-${n}`" class="admin-field__label">Install step {{ n }}</label>
            <TipTapEditor :id="`home-hero-step-${n}`" v-model="form.hero[`step_${n}`]" placeholder="Step text..." min-height="48px" />
          </div>
        </div>
      </AdminPanel>

      <!-- Section labels -->
      <AdminPanel title="Section headings" description="Labels above the addons and features sections on the homepage." icon="i-heroicons-rectangle-group">
        <div class="grid gap-4 md:grid-cols-2">
          <div class="admin-subpanel space-y-3">
            <p class="admin-row__eyebrow">Addons section</p>
            <div class="admin-field">
              <label for="home-addons-title" class="admin-field__label">Title</label>
              <UInput id="home-addons-title" v-model="form.addons.title" :disabled="saving" placeholder="Supported Addons" />
            </div>
            <div class="admin-field">
              <label for="home-addons-subtitle" class="admin-field__label">Subtitle</label>
              <UInput id="home-addons-subtitle" v-model="form.addons.subtitle" :disabled="saving" placeholder="Every external integration is optional" />
            </div>
          </div>
          <div class="admin-subpanel space-y-3">
            <p class="admin-row__eyebrow">Features section</p>
            <div class="admin-field">
              <label for="home-features-title" class="admin-field__label">Title</label>
              <UInput id="home-features-title" v-model="form.features_heading.title" :disabled="saving" placeholder="The module" />
            </div>
            <div class="admin-field">
              <label for="home-features-subtitle" class="admin-field__label">Subtitle</label>
              <UInput id="home-features-subtitle" v-model="form.features_heading.subtitle" :disabled="saving" placeholder="A complete setup without forced dependencies" />
            </div>
          </div>
        </div>
      </AdminPanel>

      <!-- Feature cards -->
      <AdminPanel title="Feature cards" description="Three cards below the features heading. Keep each one sharp." icon="i-heroicons-squares-2x2">
        <div class="space-y-3">
          <div v-for="index in featureIndices" :key="index"
            class="admin-subpanel flex flex-col gap-4 sm:flex-row sm:items-start">
            <!-- Icon -->
            <div class="flex shrink-0 items-center gap-3 sm:w-20 sm:flex-col sm:text-center">
              <div class="flex h-11 w-11 items-center justify-center rounded-xl text-xl"
                :class="isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'">
                {{ featureEmoji(index) || "?" }}
              </div>
              <UInput
                v-model="form.features[`feature_${index}_emoji`]"
                :disabled="saving"
                maxlength="2"
                placeholder="🎯"
                class="w-14 text-center text-lg"
              />
            </div>
            <!-- Content -->
            <div class="flex-1 space-y-3">
              <div class="admin-field">
                <label :for="`home-feature-${index}-title`" class="admin-field__label">Title</label>
                <UInput :id="`home-feature-${index}-title`" v-model="form.features[`feature_${index}_title`]" :disabled="saving" :placeholder="`Feature ${index}`" />
              </div>
              <div class="admin-field">
                <label :for="`home-feature-${index}-description`" class="admin-field__label">Description</label>
                <TipTapEditor
                  :id="`home-feature-${index}-description`"
                  v-model="form.features[`feature_${index}_text`]"
                  placeholder="Feature description..."
                  min-height="80px"
                />
              </div>
            </div>
          </div>
        </div>
      </AdminPanel>
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
            {{ form.hero.title || "MagguuUI" }}
            <br>
            <span class="text-slate-500 dark:text-slate-400">{{ form.hero.title2 || "Ellesmere setup." }}</span>
          </h2>
          <SafeHtml
            class="prose prose-sm mx-auto mt-4 max-w-2xl dark:prose-invert"
            :html="form.hero.description || '<em>No subtitle set</em>'"
          />
        </div>

        <div class="grid gap-6 xl:grid-cols-2">
          <div class="admin-preview-shell">
            <p class="admin-row__eyebrow">Supported addons</p>
            <h3 class="mt-3 text-xl font-semibold text-slate-950 dark:text-white">
              {{ form.addons.title || "Supported Addons" }}
            </h3>
            <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {{ form.addons.subtitle || "Every external integration is optional — choose only the addons you want" }}
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
              {{ form.features_heading.title || "The module" }}
            </h3>
            <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {{ form.features_heading.subtitle || "A complete setup without forced external dependencies" }}
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
            <SafeHtml
              class="prose prose-sm mt-3 max-w-none text-left dark:prose-invert"
              :html="featureText(index) || '<em>No description</em>'"
            />
          </div>
        </div>
      </div>
    </AdminPanel>
    <AdminContentHistory ref="history" :pages="['home']" label="the homepage" @restored="load" />
  </div>
</template>

<script setup lang="ts">
import { diffContentForms, type ContentForm } from "~/utils/contentChanges"
import { HOME_HERO_EXTRA_DEFAULTS } from "~/utils/pageCopyDefaults"
import type { DraftItem } from "~/utils/contentDrafts"

definePageMeta({ layout: "admin" })

const toast = useToast()
const { apiFetch } = useApi()
const isDark = useIsDark()

const loading = ref(true)
const saving = ref(false)
const tab = ref<"edit" | "preview">("edit")
const draft = useContentDraft(["home"])

const previewAddons = ["EllesmereUI", "BigWigs", "Northern Sky Raid Tools"]
const featureIndices = [1, 2, 3] as const

const form = reactive({
  hero: {
    title: "MagguuUI",
    title2: "Ellesmere setup.",
    ...HOME_HERO_EXTRA_DEFAULTS,
    description: "MagguuUI is a native EllesmereUI module for WoW Retail. Designed for 4K. Download EllesmereUI and MagguuUI from CurseForge, Wago, or WoWInterface, then open /mui and run Apply Magguu profiles.",
  } as Record<string, string>,
  addons: {
    title: "Supported Addons",
    subtitle: "EllesmereUI is required. Everything else is optional.",
  } as Record<string, string>,
  features_heading: {
    title: "The module",
    subtitle: "An EllesmereUI setup with optional raid tools",
  } as Record<string, string>,
  features: {
    feature_1_emoji: "A",
    feature_1_title: "Native Ellesmere setup",
    feature_1_text: "Two sidebar rows: Options (Setup, Skinning, QoL) and Changelog. Gold Apply Magguu profiles, Magguu Settings and Load profiles side by side, required and optional imports, and WowUp copy strings live on Setup.",
    feature_2_emoji: "B",
    feature_2_title: "Current Retail layouts",
    feature_2_text: "Ellesmere profile MagguuUI at scale 0.58 with a fixed tooltip. Class layouts import as Magguu - Class Spec. Optional Magguu profiles for BigWigs, Northern Sky, EXBoss, Whisper Messenger, Waypoint UI, HandyNotes, Talent Tree Tweaks, GTFO, BugSack, Premade Groups Filter, and Smart Reminders.",
    feature_3_emoji: "C",
    feature_3_title: "Skinning and QoL included",
    feature_3_text: "Names and colors, QoL, Smart Tab, Quick Focus, audio device switcher, Boiling Point, and Targeted Spell Bars. Services stay untouched.",
  } as Record<string, string>,
})

const formDefaults = JSON.parse(JSON.stringify(form)) as typeof form

const originalData = ref("")
const reviewOpen = ref(false)
const history = ref<{ load: () => Promise<void> } | null>(null)
const pendingChanges = computed(() => {
  if (!originalData.value) return []
  return diffContentForms(JSON.parse(originalData.value) as ContentForm, JSON.parse(serializeForm()) as ContentForm)
})

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

const sections = ["hero", "addons", "features_heading", "features"] as const

function buildItems(): DraftItem[] {
  return sections.flatMap(section =>
    Object.entries(form[section]).map(([key, value]) => ({ page: "home", section, key, value, locale: "en" })))
}

async function load() {
  loading.value = true
  for (const section of sections) Object.assign(form[section], formDefaults[section])

  try {
    const data = await apiFetch<Record<string, Record<string, Record<string, string>>>>("/api/v1/admin/content/home")
    const source = data?.en || data?.de

    if (source?.hero) Object.assign(form.hero, source.hero)
    if (source?.addons) Object.assign(form.addons, source.addons)
    if (source?.features_heading) Object.assign(form.features_heading, source.features_heading)
    if (source?.features) Object.assign(form.features, source.features)
  } catch {
    // Keep defaults.
  }

  // What the live site shows now; a draft only stores the cells that differ from it.
  draft.setPublished(buildItems())
  for (const item of await draft.fetchDrafts()) {
    if (item.page !== "home" || (item.locale || "en") !== "en") continue
    const target = (form as Record<string, Record<string, string>>)[item.section]
    if (target) target[item.key] = item.value
  }

  loading.value = false
  nextTick(() => snapshotOriginal())
}

async function save() {
  saving.value = true

  try {
    await draft.saveDraft(buildItems())
    toast.add({ title: "Draft saved", description: "Not live yet. Publish to show it to visitors.", color: "success" })
    reviewOpen.value = false
    nextTick(() => snapshotOriginal())
  } catch {
    toast.add({ title: "Error", color: "error" })
  } finally {
    saving.value = false
  }
}

async function publishDraft() {
  saving.value = true
  try {
    if (hasChanges.value) await draft.saveDraft(buildItems())
    const n = await draft.publish()
    toast.add({ title: "Published", description: `${n} ${n === 1 ? "field is" : "fields are"} live now.`, color: "success" })
    reviewOpen.value = false
    await load()
    void history.value?.load()
  } catch {
    toast.add({ title: "Publish failed", color: "error" })
  } finally {
    saving.value = false
  }
}

async function discardDraft() {
  try {
    await draft.discard()
    toast.add({ title: "Draft discarded", color: "success" })
    await load()
  } catch {
    toast.add({ title: "Error", color: "error" })
  }
}

onMounted(load)
</script>
