<template>
  <div>
    <label :for="inputId" class="font-mono text-xs uppercase tracking-[0.12em]" :class="tone.label.value">{{ ui.loadoutCode }}</label>
    <div class="mt-1 flex items-stretch gap-2">
      <input
        :id="inputId"
        ref="field"
        :value="code"
        readonly
        spellcheck="false"
        autocomplete="off"
        class="min-w-0 flex-1 border px-2 py-1.5 font-mono text-xs"
        :class="tone.isDark.value ? 'border-white/15 bg-transparent text-silver-200' : 'border-gray-300 bg-transparent text-gray-800'"
        :aria-describedby="hintId"
        @focus="selectAll"
      >
      <button
        v-if="canCopy"
        type="button"
        class="btn-secondary shrink-0 px-3 text-xs"
        :aria-label="`${label}: ${ariaName}`"
        @click="copy"
      >{{ state === 'copied' ? copiedLabel : label }}</button>
    </div>
    <p :id="hintId" class="mt-1 text-xs" :class="tone.muted.value">{{ ui.copyHint }}</p>
    <p
      role="status"
      aria-live="polite"
      class="mt-1 min-h-[1.25rem] text-xs font-medium"
      :class="state === 'failed' ? (tone.isDark.value ? 'text-amber-300' : 'text-amber-800') : tone.label.value"
    >
      <span v-if="state === 'copied'">{{ ui.copiedVisible }} <span class="sr-only">{{ ui.copiedStatus }}</span></span>
      <span v-else-if="state === 'failed'">{{ ui.copyFailed }}</span>
    </p>
  </div>
</template>

<script setup lang="ts">
import { META_COPY } from '~/utils/metaCopy'
import { META_UI_COPY } from '~/utils/metaUiCopy'

const props = withDefaults(defineProps<{
  code: string
  label?: string
  copiedLabel?: string
  ariaName?: string
}>(), {
  label: undefined,
  copiedLabel: undefined,
  ariaName: 'talent loadout code',
})

const copyLabels = META_COPY
const ui = META_UI_COPY
const tone = useMetaTone()
const label = computed(() => props.label ?? copyLabels.copyBuild)
const copiedLabel = computed(() => props.copiedLabel ?? ui.copiedVisible)
const uid = useId()
const inputId = `meta-code-${uid}`
const hintId = `meta-code-hint-${uid}`
const field = ref<HTMLInputElement | null>(null)
const canCopy = ref(false)
const state = ref<'idle' | 'copied' | 'failed'>('idle')
let timer: ReturnType<typeof setTimeout> | undefined

onMounted(() => {
  canCopy.value = typeof navigator !== 'undefined' && !!navigator.clipboard?.writeText
})
onBeforeUnmount(() => clearTimeout(timer))

function selectAll() {
  field.value?.select()
}

async function copy() {
  clearTimeout(timer)
  try {
    await navigator.clipboard.writeText(props.code)
    state.value = 'copied'
  } catch {
    state.value = 'failed'
    selectAll()
  }
  timer = setTimeout(() => { state.value = 'idle' }, 2500)
}
</script>
