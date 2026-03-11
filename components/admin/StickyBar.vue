<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 -translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 -translate-y-2"
  >
    <div v-if="show" class="admin-savebar">
      <div class="admin-savebar__content">
        <div class="admin-savebar__status">
          <span class="admin-savebar__dot" />
          <div>
            <p class="admin-savebar__title">{{ title }}</p>
            <p v-if="description" class="admin-savebar__description">{{ description }}</p>
          </div>
        </div>

        <div v-if="$slots.actions" class="admin-savebar__actions">
          <slot name="actions" />
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  show: boolean
  title?: string
  description?: string
}>(), {
  title: 'Unsaved changes',
  description: '',
})
</script>
