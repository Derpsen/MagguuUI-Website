<template>
  <div
    v-if="count > 0 || dirty"
    class="admin-draftbar"
    role="status"
    data-testid="draft-bar"
  >
    <div class="admin-draftbar__text">
      <p class="admin-draftbar__label">Unpublished changes</p>
      <p class="admin-draftbar__detail" data-testid="draft-status">
        <template v-if="count > 0">
          {{ count }} {{ count === 1 ? 'field differs' : 'fields differ' }} from the live site<span v-if="savedAt">, draft saved {{ savedAt }}</span>.
        </template>
        <template v-else>No draft saved yet.</template>
        <span v-if="dirty"> You have edits that are not saved as a draft.</span>
        Visitors see the live version until you publish.
      </p>
    </div>
    <div class="admin-draftbar__actions">
      <UButton
        size="sm"
        icon="i-heroicons-arrow-up-tray"
        :loading="publishing"
        :disabled="busy || (count === 0 && !dirty)"
        data-testid="draft-publish"
        @click="emit('publish')"
      >
        Publish
      </UButton>
      <UButton
        v-if="!confirming"
        size="sm"
        variant="ghost"
        color="neutral"
        :disabled="busy || count === 0"
        data-testid="draft-discard"
        @click="confirming = true"
      >
        Discard draft
      </UButton>
      <template v-else>
        <UButton
          size="sm"
          color="error"
          variant="soft"
          :loading="discarding"
          data-testid="draft-discard-confirm"
          @click="confirm"
        >
          Discard saved draft
        </UButton>
        <UButton size="sm" variant="ghost" color="neutral" @click="confirming = false">
          Keep
        </UButton>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  count: number
  /** Unix seconds of the last draft save. */
  updatedAt?: number | null
  /** The form holds edits that are not saved as a draft yet. */
  dirty?: boolean
  publishing?: boolean
  discarding?: boolean
}>()

const emit = defineEmits<{ publish: [], discard: [] }>()

const confirming = ref(false)
const busy = computed(() => !!props.publishing || !!props.discarding)
const savedAt = computed(() => {
  if (!props.updatedAt) return ''
  return new Date(props.updatedAt * 1000).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
})

function confirm() {
  confirming.value = false
  emit('discard')
}
</script>
