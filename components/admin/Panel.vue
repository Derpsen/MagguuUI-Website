<template>
  <section class="admin-panel">
    <div v-if="title || description || icon || $slots.actions" class="admin-panel__header">
      <div class="admin-panel__head">
        <div v-if="icon" class="admin-panel__icon">
          <UIcon :name="icon" class="h-4 w-4" />
        </div>

        <div class="min-w-0">
          <h2 v-if="title" class="admin-panel__title">{{ title }}</h2>
          <p v-if="description" class="admin-panel__description">{{ description }}</p>
        </div>
      </div>

      <div v-if="$slots.actions" class="admin-panel__actions">
        <slot name="actions" />
      </div>
    </div>

    <div class="admin-panel__body">
      <slot />
    </div>

    <div v-if="$slots.footer" class="admin-panel__footer">
      <slot name="footer" />
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title?: string
  description?: string
  icon?: string
}>()
</script>
