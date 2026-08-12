<template>
  <!-- eslint-disable-next-line vue/no-v-html -- This is the single audited HTML rendering boundary. -->
  <div v-html="sanitizedHtml" />
</template>

<script setup lang="ts">
import { sanitizeRichHtml } from '~/utils/richText'

const props = defineProps<{
  html: string
}>()

const sanitizedHtml = computed(() => sanitizeRichHtml(props.html))
</script>
