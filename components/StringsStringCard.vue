<!-- Copy / stamp / preview card for an import string on /strings. -->
<template>
  <div class="space-y-4 pt-1">
    <slot />
    <div class="flex items-center gap-2">
      <StringCopyButton :copied="copied" @copy="emit('copy')" />
      <button v-if="isLoggedIn" type="button" class="w-8 h-8 rounded-md border transition-colors inline-flex items-center justify-center"
        :class="isDark ? 'border-white/15 text-silver-300 hover:text-white hover:border-white/35' : 'border-gray-300 text-gray-600 hover:text-gray-950 hover:border-gray-400'"
        :aria-label="editAriaLabel"
        @click="emit('edit')">
        <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
      </button>
    </div>
    <div class="flex items-center justify-between text-xs" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
      <div class="flex items-center gap-3">
        <span v-if="stampLabel" data-testid="string-stamp" :title="stampTitle">{{ stampLabel }}</span>
        <kbd class="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono" :class="isDark ? 'bg-white/5 text-silver-600 border border-brand-400/10' : 'bg-gray-100 text-gray-400 border border-gray-200'">{{ isMac ? '⌘' : 'Ctrl' }}+C</kbd>
      </div>
      <span>{{ sizeLabel }}</span>
    </div>
    <div class="string-preview string-preview-fade rounded-xl p-4 max-h-24" tabindex="0" role="region" aria-label="String preview">
      <p class="text-xs font-mono break-all leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
        {{ preview }}{{ showEllipsis ? '...' : '' }}
      </p>
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

const isDark = useIsDark()
const { isLoggedIn } = useAuth()
</script>
