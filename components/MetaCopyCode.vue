<template>
  <div>
    <label :for="inputId" class="mg-kicker">{{ ui.loadoutCode }}</label>
    <div class="mt-1 flex items-stretch gap-2">
      <input
        :id="inputId"
        ref="field"
        :value="code"
        readonly
        spellcheck="false"
        autocomplete="off"
        class="mg-input min-w-0 flex-1 px-2 py-1.5 font-mono text-xs"
        :aria-describedby="hintId"
        @focus="selectAll"
      >
      <button
        v-if="canCopy"
        type="button"
        class="mg-btn mg-btn--secondary mg-btn--sm shrink-0"
        :aria-label="`${label}: ${ariaName}`"
        @click="copy"
      >{{ state === 'copied' ? copiedLabel : label }}</button>
    </div>
    <p :id="hintId" class="mt-1 text-xs" :class="tone.muted.value">{{ ui.copyHint }}</p>
    <p
      role="status"
      aria-live="polite"
      class="mt-1 min-h-[1.25rem] text-xs font-semibold"
      :class="state === 'failed' ? 'text-mg-warn' : tone.label.value"
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
