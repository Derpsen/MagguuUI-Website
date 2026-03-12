<template>
  <Teleport to="#admin-page-header-slot">
    <div class="admin-page-header">
      <div class="admin-page-header__content">
        <div v-if="icon" class="admin-page-header__icon">
          <UIcon :name="icon" class="h-5 w-5" />
        </div>

        <div class="min-w-0">
          <p v-if="eyebrow" class="admin-page-eyebrow">{{ eyebrow }}</p>

          <div class="flex flex-wrap items-center gap-2">
            <h1 class="admin-page-title">{{ title }}</h1>
            <slot name="badge" />
          </div>

          <p v-if="description" class="admin-page-description">{{ description }}</p>

          <div v-if="$slots.meta" class="admin-page-meta">
            <slot name="meta" />
          </div>
        </div>
      </div>

      <div v-if="$slots.actions" class="admin-page-actions">
        <slot name="actions" />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  description?: string
  eyebrow?: string
  icon?: string
}>()
</script>
