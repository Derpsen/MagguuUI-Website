<template>
  <UModal v-model:open="open" title="Review changes" description="What will be published when you save.">
    <template #content>
      <div class="p-6 max-h-[80vh] overflow-y-auto" data-testid="change-preview">
        <h2 class="text-lg font-semibold">Review changes</h2>
        <p class="mt-1 text-sm opacity-80">{{ changes.length }} {{ changes.length === 1 ? 'field' : 'fields' }} changed. Nothing is live until you save.</p>
        <p v-if="!changes.length" class="mt-4 text-sm">No changes.</p>
        <dl v-else class="mt-4 divide-y divide-[var(--admin-border)]">
          <div v-for="c in changes" :key="`${c.section}.${c.key}`" class="py-3 space-y-2">
            <dt class="font-mono text-xs uppercase tracking-[0.14em] text-[var(--admin-label)]">{{ c.section }} · {{ c.key }}</dt>
            <dd class="grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <p class="text-xs opacity-70">Before</p>
                <SafeHtml v-if="isHtml(c.key)" class="prose prose-sm max-w-none dark:prose-invert" :html="c.before || '<p>(default)</p>'" />
                <p v-else class="break-words">{{ c.before || '(default)' }}</p>
              </div>
              <div>
                <p class="text-xs opacity-70">After</p>
                <SafeHtml v-if="isHtml(c.key)" class="prose prose-sm max-w-none dark:prose-invert" :html="c.after || '<p>(default)</p>'" />
                <p v-else class="break-words">{{ c.after || '(default)' }}</p>
              </div>
            </dd>
          </div>
        </dl>
        <div class="mt-6 flex justify-end gap-3">
          <UButton variant="ghost" color="neutral" @click="open = false">Keep editing</UButton>
          <UButton icon="i-heroicons-check" :loading="saving" :disabled="!changes.length" data-testid="change-preview-save" @click="emit('confirm')">Save</UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { ContentChange } from '~/utils/contentChanges'
import { isHtmlCopyKey } from '~/utils/pageCopyDefaults'

defineProps<{ changes: ContentChange[], saving?: boolean }>()
const emit = defineEmits<{ confirm: [] }>()
const open = defineModel<boolean>('open', { default: false })

function isHtml(key: string) {
  return isHtmlCopyKey(key) || /text$/.test(key)
}
</script>
