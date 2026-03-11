<!--
  Admin — Homepage Content Editor
  Edits hero section (title, subtitle) and 3 feature cards
  Sticky save bar with change tracking, edit/preview tabs, entrance animations
-->

<template>
  <div class="max-w-5xl mx-auto space-y-6">
    <AdminStickyBar :show="hasChanges" description="Homepage content has changed and can be published now.">
      <template #actions>
        <UButton @click="save" :loading="saving" icon="i-heroicons-check" size="sm">Save</UButton>
      </template>
    </AdminStickyBar>

    <AdminPageHeader
      icon="i-heroicons-home"
      eyebrow="Content"
      title="Homepage"
      description="Hero messaging, supported addons and feature blocks for the landing page."
    >
      <template #actions>
        <div class="flex items-center gap-2">
        <!-- Tab Toggle -->
        <div class="flex items-center gap-0.5 p-0.5 rounded-lg" :class="isDark ? 'bg-white/[0.04]' : 'bg-gray-100'">
          <button @click="tab = 'edit'" class="px-3 py-1.5 text-xs font-medium rounded-md transition-all"
            :class="tab === 'edit'
              ? (isDark ? 'bg-brand-400/15 text-brand-400' : 'bg-white text-brand-600 shadow-sm')
              : (isDark ? 'text-silver-500 hover:text-white' : 'text-gray-500 hover:text-gray-900')">
            Edit
          </button>
          <button @click="tab = 'preview'" class="px-3 py-1.5 text-xs font-medium rounded-md transition-all"
            :class="tab === 'preview'
              ? (isDark ? 'bg-brand-400/15 text-brand-400' : 'bg-white text-brand-600 shadow-sm')
              : (isDark ? 'text-silver-500 hover:text-white' : 'text-gray-500 hover:text-gray-900')">
            Preview
          </button>
        </div>
        <UButton @click="save" :loading="saving" icon="i-heroicons-check" size="sm">Save</UButton>
        </div>
      </template>
    </AdminPageHeader>

    <!-- Loading -->
    <div v-if="loading" class="glass rounded-xl p-12 text-center">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-brand-400 animate-spin mx-auto" />
    </div>

    <!-- EDIT MODE -->
    <div v-else-if="tab === 'edit'" class="space-y-6">
      <!-- Hero Section -->
      <div class="glass rounded-xl p-6 admin-fade-in admin-stagger-2">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
            <UIcon name="i-heroicons-sparkles" class="w-4 h-4 text-purple-400" />
          </div>
          <h2 class="text-lg font-semibold text-gradient-subtle">Hero Section</h2>
        </div>
        <div class="space-y-4">
          <div class="grid sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-1.5" :class="labelClass">Heading Line 1</label>
              <UInput v-model="form.hero.title" :disabled="saving" placeholder="Your WoW Interface," />
              <p class="text-xs mt-1" :class="(form.hero.title?.length || 0) > 40 ? 'text-amber-400' : (isDark ? 'text-silver-600' : 'text-gray-400')">
                {{ form.hero.title?.length || 0 }}<span class="opacity-50"> / 40</span>
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1.5" :class="labelClass">Heading Line 2</label>
              <UInput v-model="form.hero.title2" :disabled="saving" placeholder="perfected." />
              <p class="text-xs mt-1" :class="(form.hero.title2?.length || 0) > 30 ? 'text-amber-400' : (isDark ? 'text-silver-600' : 'text-gray-400')">
                {{ form.hero.title2?.length || 0 }}<span class="opacity-50"> / 30</span>
              </p>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1.5" :class="labelClass">Subtitle</label>
            <TipTapEditor v-model="form.hero.description" placeholder="Short description..." min-height="80px" />
          </div>
        </div>
      </div>

      <!-- Addons Section Heading -->
      <div class="glass rounded-xl p-6 admin-fade-in admin-stagger-3">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
            <UIcon name="i-heroicons-puzzle-piece" class="w-4 h-4 text-cyan-400" />
          </div>
          <h2 class="text-lg font-semibold text-gradient-subtle">Supported Addons Section</h2>
        </div>
        <div class="grid sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium mb-1.5" :class="labelClass">Title</label>
            <UInput v-model="form.addons.title" :disabled="saving" placeholder="Supported Addons" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1.5" :class="labelClass">Subtitle</label>
            <UInput v-model="form.addons.subtitle" :disabled="saving" placeholder="Profiles for the most popular WoW addons" />
          </div>
        </div>
      </div>

      <!-- Features Section Heading -->
      <div class="glass rounded-xl p-6 admin-fade-in admin-stagger-4">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <UIcon name="i-heroicons-star" class="w-4 h-4 text-amber-400" />
          </div>
          <h2 class="text-lg font-semibold text-gradient-subtle">Features Section Heading</h2>
        </div>
        <div class="grid sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium mb-1.5" :class="labelClass">Title</label>
            <UInput v-model="form.features_heading.title" :disabled="saving" placeholder="Why MagguuUI?" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1.5" :class="labelClass">Subtitle</label>
            <UInput v-model="form.features_heading.subtitle" :disabled="saving" placeholder="Everything you need — in one package" />
          </div>
        </div>
      </div>

      <!-- Feature Cards -->
      <div class="admin-fade-in admin-stagger-5">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
            <UIcon name="i-heroicons-squares-2x2" class="w-4 h-4 text-green-400" />
          </div>
          <h2 class="text-lg font-semibold text-gradient-subtle">Features</h2>
        </div>
        <div class="grid lg:grid-cols-3 gap-4">
          <div v-for="i in 3" :key="i" class="glass rounded-xl p-6 group transition-all hover:scale-[1.005]">
            <div class="flex items-center gap-3 mb-4">
              <span class="text-xs font-bold px-2.5 py-1 rounded-lg" :class="isDark ? 'bg-brand-400/10 text-brand-300' : 'bg-blue-50 text-blue-600'">Feature {{ i }}</span>
            </div>
            <div class="space-y-3">
              <div class="grid grid-cols-[80px_1fr] gap-3">
                <div>
                  <label class="block text-xs font-medium mb-1" :class="labelClass">Icon</label>
                  <UInput v-model="form.features[`feature_${i}_emoji`]" :disabled="saving" class="text-center text-xl" maxlength="2" />
                </div>
                <div>
                  <label class="block text-xs font-medium mb-1" :class="labelClass">Title</label>
                  <UInput v-model="form.features[`feature_${i}_title`]" :disabled="saving" />
                </div>
              </div>
              <div>
                <label class="block text-xs font-medium mb-1" :class="labelClass">Description</label>
                <TipTapEditor v-model="form.features[`feature_${i}_text`]" placeholder="Feature description..." min-height="80px" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- PREVIEW MODE -->
    <div v-else-if="tab === 'preview'" class="admin-fade-in admin-stagger-2">
      <div class="glass rounded-xl p-8 lg:p-12">
        <!-- Hero Preview -->
        <div class="text-center mb-10">
          <h1 class="text-4xl lg:text-5xl font-bold mb-3 leading-tight">
            <span class="text-gradient">{{ form.hero.title || 'Your WoW Interface,' }}</span>
            <br />
            <span :class="isDark ? 'text-white' : 'text-gray-900'">{{ form.hero.title2 || 'perfected.' }}</span>
          </h1>
          <div class="prose prose-sm max-w-2xl mx-auto mt-4"
            :class="isDark ? 'prose-invert text-silver-400' : 'text-gray-500'"
            v-html="form.hero.description || '<em class=\'opacity-50\'>No subtitle set</em>'" />
        </div>

        <!-- Addons Section Preview -->
        <div class="text-center mb-8 mt-10 pt-8" :class="isDark ? 'border-t border-brand-400/10' : 'border-t border-gray-200'">
          <h2 class="text-2xl font-bold mb-2"><span class="text-gradient">{{ form.addons.title || 'Supported Addons' }}</span></h2>
          <p :class="isDark ? 'text-silver-500' : 'text-gray-500'">{{ form.addons.subtitle || 'Profiles for the most popular WoW addons' }}</p>
          <div class="flex flex-wrap justify-center gap-2 mt-4">
            <span v-for="n in ['ElvUI', 'Plater', 'BigWigs', 'Details']" :key="n"
              class="px-3 py-1.5 rounded-lg text-xs" :class="isDark ? 'bg-white/5 text-silver-400' : 'bg-gray-100 text-gray-500'">{{ n }}</span>
          </div>
        </div>

        <!-- Features Heading Preview -->
        <div class="text-center mb-6 mt-8 pt-8" :class="isDark ? 'border-t border-brand-400/10' : 'border-t border-gray-200'">
          <h2 class="text-2xl font-bold mb-2"><span class="text-gradient">{{ form.features_heading.title || 'Why MagguuUI?' }}</span></h2>
          <p :class="isDark ? 'text-silver-500' : 'text-gray-500'">{{ form.features_heading.subtitle || 'Everything you need — in one package' }}</p>
        </div>

        <!-- Features Preview -->
        <div class="grid md:grid-cols-3 gap-6">
          <div v-for="i in 3" :key="i"
            class="text-center p-6 rounded-xl transition-all"
            :class="isDark ? 'bg-white/[0.02] border border-brand-400/10' : 'bg-gray-50 border border-gray-200'">
            <div class="text-4xl mb-3">{{ form.features[`feature_${i}_emoji`] || '✨' }}</div>
            <h3 class="font-semibold mb-2" :class="isDark ? 'text-white' : 'text-gray-900'">
              {{ form.features[`feature_${i}_title`] || `Feature ${i}` }}
            </h3>
            <div class="prose prose-sm max-w-none"
              :class="isDark ? 'prose-invert text-silver-400' : 'text-gray-500'"
              v-html="form.features[`feature_${i}_text`] || '<em class=\'opacity-50\'>No description</em>'" />
          </div>
        </div>

        <!-- Preview Note -->
        <div class="mt-8 pt-6 text-center" :class="isDark ? 'border-t border-brand-400/10' : 'border-t border-gray-200'">
          <p class="text-xs" :class="isDark ? 'text-silver-600' : 'text-gray-400'">
            <UIcon name="i-heroicons-information-circle" class="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
            This is an approximate preview. The actual page may look slightly different due to additional styles and layout.
          </p>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })
const toast = useToast()
const { apiFetch } = useApi()
const isDark = useIsDark()
const labelClass = computed(() => isDark.value ? 'text-silver-300' : 'text-gray-700')

const loading = ref(true)
const saving = ref(false)
const tab = ref<'edit' | 'preview'>('edit')

const form = reactive({
  hero: {
    title: 'Your WoW Interface,',
    title2: 'perfected.',
    description: 'High-quality import strings for cooldowns, addon profiles, and more. Simply copy and paste into WoW.',
  } as Record<string, string>,
  addons: {
    title: 'Supported Addons',
    subtitle: 'Profiles for the most popular WoW addons',
  } as Record<string, string>,
  features_heading: {
    title: 'Why MagguuUI?',
    subtitle: 'Everything you need — in one package',
  } as Record<string, string>,
  features: {
    feature_1_emoji: '⚡', feature_1_title: 'Pre-configured Profiles', feature_1_text: 'Pre-configured profiles for ElvUI, Plater, BigWigs, Details, and more. One click — done.',
    feature_2_emoji: '🎯', feature_2_title: 'Class Layouts', feature_2_text: 'Optimized cooldown layouts for every class and specialization. Ready to use immediately.',
    feature_3_emoji: '🔄', feature_3_title: 'Always Up-to-Date', feature_3_text: 'Regular updates with the latest changes and improvements for every addon.',
  } as Record<string, string>,
})

// Change tracking
const originalData = ref('')

function serializeForm(): string {
  return JSON.stringify({ hero: { ...form.hero }, addons: { ...form.addons }, features_heading: { ...form.features_heading }, features: { ...form.features } })
}

const hasChanges = computed(() => {
  if (loading.value || !originalData.value) return false
  return serializeForm() !== originalData.value
})

function snapshotOriginal() {
  originalData.value = serializeForm()
}

async function load() {
  loading.value = true
  try {
    const data = await apiFetch<Record<string, Record<string, Record<string, string>>>>('/api/v1/admin/content/home')
    // Load 'en' first, fallback to 'de' for existing content
    const src = data?.en || data?.de
    if (src?.hero) Object.assign(form.hero, src.hero)
    if (src?.addons) Object.assign(form.addons, src.addons)
    if (src?.features_heading) Object.assign(form.features_heading, src.features_heading)
    if (src?.features) Object.assign(form.features, src.features)
  } catch {}
  finally {
    loading.value = false
    nextTick(() => snapshotOriginal())
  }
}
onMounted(load)

async function save() {
  saving.value = true
  const items: any[] = []
  for (const [k, v] of Object.entries(form.hero)) items.push({ page: 'home', section: 'hero', key: k, value: v, locale: 'en' })
  for (const [k, v] of Object.entries(form.addons)) items.push({ page: 'home', section: 'addons', key: k, value: v, locale: 'en' })
  for (const [k, v] of Object.entries(form.features_heading)) items.push({ page: 'home', section: 'features_heading', key: k, value: v, locale: 'en' })
  for (const [k, v] of Object.entries(form.features)) items.push({ page: 'home', section: 'features', key: k, value: v, locale: 'en' })
  try {
    await apiFetch('/api/v1/admin/content/bulk', { method: 'POST', body: { items } })
    toast.add({ title: 'Homepage saved', color: 'success' })
    nextTick(() => snapshotOriginal())
  } catch { toast.add({ title: 'Error', color: 'error' }) }
  finally { saving.value = false }
}
</script>
