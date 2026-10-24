<template>
  <span class="string-copy">
    <button type="button" class="string-copy-btn" :class="{ 'is-copied': copied }" @click="emit('copy')">
      {{ copied ? 'Copied' : 'Copy string' }}
    </button>
    <!-- Always in the DOM so screen readers pick up the change politely. -->
    <span class="sr-only" role="status" aria-live="polite">{{ copied ? 'Copied to clipboard' : '' }}</span>
  </span>
</template>

<script setup lang="ts">
defineProps<{ copied: boolean }>()
const emit = defineEmits<{ copy: [] }>()
</script>
