<template>
  <button
    type="button"
    class="copy-badge inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
    :class="isDark
      ? 'border-white/15 bg-white/5 text-white hover:bg-white/10 focus-visible:outline-brand-300'
      : 'border-gray-300 bg-white text-gray-900 hover:bg-gray-100 focus-visible:outline-brand-700'"
    :aria-label="`Copy ${command}`"
    :data-copied="copied ? 'true' : undefined"
    @click="copy"
  >
    <span>{{ command }}</span>
    <UIcon
      :name="copied ? 'i-heroicons-check' : 'i-heroicons-clipboard-document'"
      class="size-3.5 shrink-0"
      :class="copied ? (isDark ? 'text-emerald-300' : 'text-emerald-700') : (isDark ? 'text-silver-400' : 'text-gray-600')"
      aria-hidden="true"
    />
    <span class="sr-only" aria-live="polite">{{ copied ? 'Copied' : '' }}</span>
  </button>
</template>

<script setup lang="ts">
const props = defineProps<{ command: string }>()
const isDark = useIsDark()
const toast = useToast()
const copied = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

async function copy() {
  try {
    await navigator.clipboard.writeText(props.command)
    copied.value = true
    toast.add({ title: `Copied ${props.command}`, icon: 'i-heroicons-check-circle', color: 'success', duration: 1800 })
    clearTimeout(timer)
    timer = setTimeout(() => { copied.value = false }, 1800)
  } catch {
    toast.add({ title: 'Copy failed', description: `Type ${props.command} in game chat.`, color: 'error', duration: 2500 })
  }
}
onBeforeUnmount(() => clearTimeout(timer))
</script>

<style scoped>
.copy-badge[data-copied] { animation: copy-pop 220ms ease-out; }
@keyframes copy-pop { 50% { transform: scale(1.06); } }
@media (prefers-reduced-motion: reduce) {
  .copy-badge[data-copied] { animation: none; }
}
</style>
