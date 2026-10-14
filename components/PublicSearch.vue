<!--
  PublicSearch — Ctrl/Cmd+K search over Guide, FAQ and Strings.
  Loaded lazily (LazyPublicSearch) the first time search opens; the index is
  fetched once from /api/v1/search-index.
-->
<template>
  <UModal v-model:open="open" title="Search" description="Search the guide, FAQ and import strings." :ui="{ content: 'max-w-xl max-h-[80vh] overflow-y-auto' }">
    <template #content>
      <UCommandPalette
        v-model:search-term="term"
        :groups="groups"
        :loading="pending"
        placeholder="Search guide, FAQ, strings…"
        :fuse="{ resultLimit: 8, fuseOptions: { keys: ['label', 'suffix'], threshold: 0.35, ignoreLocation: true } }"
        :input="{ 'aria-label': 'Search guide, FAQ and strings' }"
        :ui="{ viewport: 'overflow-visible', itemLabelSuffix: 'text-muted', itemDescription: 'text-muted', label: 'text-muted' }"
        data-testid="public-search"
        @update:model-value="go"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
interface SearchEntry { id: string, group: string, label: string, text: string, to: string }

const open = defineModel<boolean>('open', { default: false })
const term = ref('')
const entries = ref<SearchEntry[]>([])
const pending = ref(false)
let loaded = false

async function loadIndex() {
  if (loaded) return
  loaded = true
  pending.value = true
  try {
    const res = await $fetch<{ data: SearchEntry[] }>('/api/v1/search-index')
    entries.value = res.data
  } catch {
    loaded = false
  } finally {
    pending.value = false
  }
}

watch(open, (v) => { if (v) void loadIndex() }, { immediate: true })

// Reka's listbox carries no accessible name of its own; name it for screen readers.
function nameListbox() {
  for (const box of document.querySelectorAll('[data-testid="public-search"] [role="listbox"], [role="listbox"][data-testid="public-search"]')) {
    box.setAttribute('aria-label', 'Search results')
  }
}
watch([open, entries, term], () => { void nextTick(() => requestAnimationFrame(nameListbox)) }, { flush: 'post' })
onMounted(() => requestAnimationFrame(nameListbox))

const groups = computed(() => (['Guide', 'FAQ', 'Strings'] as const).map(id => ({
  id,
  label: id,
  items: entries.value.filter(e => e.group === id).map(e => ({ id: e.id, label: e.label, suffix: e.text, to: e.to })),
})))

function go(item: unknown) {
  const to = (item as { to?: string } | null)?.to
  if (!to) return
  open.value = false
  void navigateTo(to)
}
</script>
