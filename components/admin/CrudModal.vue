<script setup lang="ts">
defineProps<{
  open: boolean
  title: string
  saving: boolean
  error: string
}>()

defineEmits<{
  'update:open': [value: boolean]
  'save': []
}>()
</script>

<template>
  <UModal :open="open" @update:open="$emit('update:open', $event)">
    <template #content>
      <div class="p-6 space-y-5">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-slate-950 dark:text-white">{{ title }}</h3>
          <UButton icon="i-heroicons-x-mark" variant="ghost" color="neutral" size="xs" @click="$emit('update:open', false)" />
        </div>

        <div v-if="error" class="text-sm text-red-500">{{ error }}</div>

        <div class="space-y-4">
          <slot />
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <UButton color="neutral" variant="ghost" @click="$emit('update:open', false)">Cancel</UButton>
          <UButton :loading="saving" @click="$emit('save')">Save</UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
