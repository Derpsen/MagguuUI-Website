<!--
  PublicSearch — Ctrl/Cmd+K full-text search over Guide, Changelog, FAQ and Strings.
  Loaded lazily (LazyPublicSearch) the first time search opens; the index is
  fetched once from /api/v1/search-index.
-->
<template>
  <UModal v-model:open="open" title="Search" description="Search the guide, changelog, FAQ and import strings." :ui="{ content: 'max-w-xl max-h-[80vh] overflow-y-auto' }">
    <template #content>
      <UCommandPalette
        v-model:search-term="term"
        :groups="groups"
        :loading="pending"
        placeholder="Search guide, changelog, FAQ, strings…"
        :input="{ 'aria-label': 'Search guide, changelog, FAQ and strings' }"
        :ui="{ viewport: 'overflow-visible', itemLabelSuffix: 'text-muted', itemDescription: 'text-muted', label: 'text-muted' }"
        data-testid="public-search"
        @update:model-value="go"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { searchEntries, type MatchableEntry } from '~/utils/searchMatch'

type SearchEntry = MatchableEntry

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

// Matching is done here (utils/searchMatch.ts), so the palette's own filter is
// switched off per group; hits carry a body snippet when only the full text matched.
const groups = computed(() => {
  const hits = searchEntries(entries.value, term.value)
  return (['Guide', 'Changelog', 'FAQ', 'Strings'] as const).map(id => ({
    id,
    label: id,
    ignoreFilter: true,
    items: hits.filter(h => h.entry.group === id).map(h => ({ id: h.entry.id, label: h.entry.label, suffix: h.snippet, to: h.entry.to })),
  }))
})

function go(item: unknown) {
  const to = (item as { to?: string } | null)?.to
  if (!to) return
  open.value = false
  void navigateTo(to)
}
</script>
