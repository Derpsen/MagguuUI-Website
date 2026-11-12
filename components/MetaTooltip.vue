<template>
  <span class="relative inline-block max-w-full">
    <button
      type="button"
      class="meta-tip-trigger max-w-full bg-transparent p-0 text-left font-[inherit] underline decoration-transparent underline-offset-4 hover:decoration-current focus-visible:decoration-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
      :class="triggerClass"
      :aria-describedby="tooltipId"
      :aria-expanded="open ? 'true' : 'false'"
      data-meta-tooltip-trigger
      @mouseenter="show"
      @mouseleave="scheduleHide"
      @focus="show"
      @blur="scheduleHide"
      @keydown.escape.prevent="hide"
    >
      <slot />
    </button>
    <span
      :id="tooltipId"
      role="tooltip"
      data-meta-tooltip
      class="absolute left-0 top-full z-40 mt-1 w-max max-w-xs px-3 py-2 text-left text-xs leading-snug"
      :class="[tone.strong.value, tone.rule.value, panelClass, open ? 'visible opacity-100' : 'invisible opacity-0']"
      @mouseenter="show"
      @mouseleave="scheduleHide"
    >
      <slot name="content" />
    </span>
  </span>
</template>

<script setup lang="ts">
defineProps<{ triggerClass?: string }>()

const tone = useMetaTone()
const tooltipId = `meta-tip-${useId()}`
const open = ref(false)
let hideTimer: ReturnType<typeof setTimeout> | null = null

const panelClass = 'border bg-white shadow-none dark:bg-gray-950'

function show() {
  if (hideTimer) { clearTimeout(hideTimer); hideTimer = null }
  open.value = true
}

function hide() {
  if (hideTimer) { clearTimeout(hideTimer); hideTimer = null }
  open.value = false
}

function scheduleHide() {
  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = setTimeout(() => { hideTimer = null; open.value = false }, 120)
}

onBeforeUnmount(hide)
</script>
