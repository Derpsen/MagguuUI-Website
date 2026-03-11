<template>
  <div class="admin-empty-state">
    <div class="admin-empty-state__icon">
      <UIcon :name="icon" class="h-6 w-6" />
    </div>

    <div class="space-y-2">
      <h3 class="admin-empty-state__title">{{ title }}</h3>
      <p class="admin-empty-state__description">{{ description }}</p>
    </div>

    <div v-if="$slots.actions" class="admin-empty-state__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  icon: string
  title: string
  description: string
}>()
</script>
