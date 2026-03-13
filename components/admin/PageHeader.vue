<template>
  <div v-if="hasContent" class="admin-page-header" :class="!hasMeta ? 'admin-page-header--actions-only' : ''">
    <div v-if="hasMeta" class="admin-page-header__content">
      <div class="admin-page-meta">
        <slot name="badge" />
        <slot name="meta" />
      </div>
    </div>

    <div v-if="hasActions" class="admin-page-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  description?: string
  eyebrow?: string
  icon?: string
}>()

const slots = useSlots()
const hasMeta = computed(() => (slots.badge?.().length || 0) > 0 || (slots.meta?.().length || 0) > 0)
const hasActions = computed(() => (slots.actions?.().length || 0) > 0)
const hasContent = computed(() => hasMeta.value || hasActions.value)
</script>
