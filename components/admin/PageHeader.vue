<template>
  <div
    v-if="hasContent"
    class="admin-page-header"
    :class="!hasMeta && !hasTitleBlock ? 'admin-page-header--actions-only' : ''"
  >
    <div v-if="hasTitleBlock || hasMeta" class="admin-page-header__content">
      <div v-if="hasTitleBlock" class="admin-page-header__title-block min-w-0">
        <div class="flex items-start gap-3 min-w-0">
          <span
            v-if="icon"
            class="admin-page-header__icon inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            aria-hidden="true"
          >
            <UIcon :name="icon" class="h-4.5 w-4.5" />
          </span>
          <div class="min-w-0">
            <p v-if="eyebrow" class="admin-page-header__eyebrow">{{ eyebrow }}</p>
            <h1 class="admin-page-header__title">{{ title }}</h1>
            <p v-if="description" class="admin-page-header__description">{{ description }}</p>
          </div>
        </div>
      </div>

      <div v-if="hasMeta" class="admin-page-meta">
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
const props = defineProps<{
  title: string
  description?: string
  eyebrow?: string
  icon?: string
}>()

const slots = useSlots()
const hasMeta = computed(() => (slots.badge?.().length || 0) > 0 || (slots.meta?.().length || 0) > 0)
const hasActions = computed(() => (slots.actions?.().length || 0) > 0)
const hasTitleBlock = computed(() => Boolean(props.title))
const hasContent = computed(() => hasTitleBlock.value || hasMeta.value || hasActions.value)
</script>
