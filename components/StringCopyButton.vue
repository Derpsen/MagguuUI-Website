<template>
  <span class="string-copy">
    <button type="button" class="string-copy-btn" :class="{ 'is-copied': copied }" :aria-label="label" @click="emit('copy')">
      {{ copied ? 'Copied' : (text || 'Copy string') }}
    </button>
    <!-- Always in the DOM so screen readers pick up the change politely. -->
    <span class="sr-only" role="status" aria-live="polite">{{ copied ? 'Copied to clipboard' : '' }}</span>
  </span>
</template>

<script setup lang="ts">
/** `text` changes the idle caption, `label` gives repeated buttons a distinct accessible name. */
defineProps<{ copied: boolean, text?: string, label?: string }>()
const emit = defineEmits<{ copy: [] }>()
</script>
