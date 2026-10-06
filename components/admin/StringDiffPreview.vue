<!--
  Import-string Edit / Preview / Diff tabs for admin CRUD modals.
-->
<template>
  <div class="admin-string-diff">
    <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
      <label class="block text-sm font-medium text-slate-700 dark:text-slate-300">{{ label }}</label>
      <div class="admin-segmented">
        <button
          type="button"
          class="admin-segmented__button"
          :class="mode === 'edit' ? 'admin-segmented__button--active' : ''"
          @click="mode = 'edit'"
        >Edit</button>
        <button
          type="button"
          class="admin-segmented__button"
          :class="mode === 'preview' ? 'admin-segmented__button--active' : ''"
          @click="mode = 'preview'"
        >Preview</button>
        <button
          type="button"
          class="admin-segmented__button"
          :class="mode === 'diff' ? 'admin-segmented__button--active' : ''"
          :disabled="!canDiff"
          :title="canDiff ? undefined : 'Diff needs a saved original'"
          @click="mode = 'diff'"
        >Diff</button>
      </div>
    </div>

    <UTextarea
      v-if="mode === 'edit'"
      :model-value="modelValue || ''"
      :rows="rows"
      :disabled="disabled"
      class="font-mono text-xs"
      :placeholder="placeholder"
      @update:model-value="onInput"
    />

    <div v-else-if="mode === 'preview'" class="admin-string-diff__preview rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-3">
      <div class="mb-2 flex flex-wrap gap-2 text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
        <span class="admin-pill">{{ stats.chars.toLocaleString() }} chars</span>
        <span class="admin-pill">{{ stats.lines.toLocaleString() }} lines</span>
        <span class="admin-pill">{{ stats.bytes.toLocaleString() }} bytes</span>
      </div>
      <pre class="max-h-56 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">{{ (modelValue || '') || '—' }}</pre>
    </div>

    <div v-else class="admin-string-diff__diff rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
      <div class="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03]">
        <p class="text-xs text-slate-500 dark:text-slate-400">
          <template v-if="!hasChanges">No changes vs saved string.</template>
          <template v-else>
            <span class="text-emerald-600 dark:text-emerald-400">+{{ added }}</span>
            <span class="mx-1.5 text-slate-300 dark:text-slate-600">/</span>
            <span class="text-red-600 dark:text-red-400">−{{ removed }}</span>
            <span class="ml-2">lines</span>
          </template>
        </p>
      </div>
      <div class="max-h-64 overflow-auto font-mono text-[11px] leading-5">
        <div
          v-for="(line, idx) in lines"
          :key="idx"
          class="admin-string-diff__line grid grid-cols-[2.5rem_2.5rem_1fr] gap-2 px-2 py-0.5"
          :class="{
            'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300': line.op === 'add',
            'bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-300': line.op === 'remove',
            'text-slate-600 dark:text-slate-400': line.op === 'equal',
          }"
        >
          <span class="tabular-nums text-right opacity-50 select-none">{{ line.oldNo ?? '' }}</span>
          <span class="tabular-nums text-right opacity-50 select-none">{{ line.newNo ?? '' }}</span>
          <span class="min-w-0 break-all whitespace-pre-wrap">
            <span class="inline-block w-3 opacity-70 select-none">{{ line.op === 'add' ? '+' : line.op === 'remove' ? '−' : ' ' }}</span>{{ line.text || ' ' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { diffLines, stringStats, type DiffLine } from '~/utils/stringDiff'

const props = withDefaults(defineProps<{
  modelValue?: string | null
  original?: string | null
  label?: string
  placeholder?: string
  rows?: number
  disabled?: boolean
}>(), {
  modelValue: '',
  original: null,
  label: 'Import String *',
  placeholder: 'Import string...',
  rows: 6,
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const mode = ref<'edit' | 'preview' | 'diff'>('edit')

const canDiff = computed(() => props.original != null)
const stats = computed(() => stringStats(props.modelValue || ''))
const lines = computed<DiffLine[]>(() => diffLines(props.original || '', props.modelValue || ''))
const added = computed(() => lines.value.filter(l => l.op === 'add').length)
const removed = computed(() => lines.value.filter(l => l.op === 'remove').length)
const hasChanges = computed(() => added.value > 0 || removed.value > 0)

function onInput(value: string | number) {
  emit('update:modelValue', String(value ?? ''))
}

watch(() => props.original, () => {
  if (mode.value === 'diff' && !canDiff.value) mode.value = 'edit'
})
</script>
