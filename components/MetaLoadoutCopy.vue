<template>
  <div>
    <pre class="text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap break-all font-mono" :class="isDark ? 'text-silver-300' : 'text-gray-700'">{{ code }}</pre>
    <button
      type="button"
      class="mt-2 text-xs underline underline-offset-4"
      :class="isDark ? 'text-white' : 'text-gray-950'"
      @click="copy"
    >{{ copied ? copyLabelCopied : copyLabel }}</button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ code: string, copyLabel: string, copyLabelCopied: string }>()
const isDark = useIsDark()
const copied = ref(false)

async function copy() {
  try {
    await navigator.clipboard.writeText(props.code)
    copied.value = true
    window.setTimeout(() => { copied.value = false }, 2000)
  } catch {
    copied.value = false
  }
}
</script>
