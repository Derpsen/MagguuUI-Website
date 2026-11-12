<!-- Copy / stamp / preview card for an import string on /strings. Tokens only (assets/css/setup.css). -->
<template>
  <div class="string-card">
    <slot />
    <div class="string-card__bar">
      <StringCopyButton :copied="copied" @copy="emit('copy')" />
      <button v-if="isLoggedIn" type="button" class="string-card__edit"
        :aria-label="editAriaLabel"
        @click="emit('edit')">
        <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
      </button>
      <kbd class="string-card__kbd">{{ isMac ? '⌘' : 'Ctrl' }}+C</kbd>
    </div>
    <div class="string-card__meta">
      <span v-if="stampLabel" data-testid="string-stamp" :title="stampTitle">{{ stampLabel }}</span>
      <span>{{ sizeLabel }}</span>
    </div>
    <div class="string-preview string-preview-fade max-h-28" tabindex="0" role="region" aria-label="String preview">
      <p>{{ preview }}{{ showEllipsis ? '...' : '' }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  copied: boolean
  editAriaLabel: string
  stampLabel: string
  stampTitle: string
  sizeLabel: string
  preview: string
  showEllipsis: boolean
  isMac: boolean
}>()

const emit = defineEmits<{
  copy: []
  edit: []
}>()

const { isLoggedIn } = useAuth()
</script>
