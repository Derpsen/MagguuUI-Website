<template>
  <!-- eslint-disable-next-line vue/no-v-html -- This is the single audited HTML rendering boundary. -->
  <div v-html="sanitizedHtml" />
</template>

<script setup lang="ts">
import { displayRichText } from '~/utils/richText'

const props = defineProps<{
  html: string
  breaks?: boolean
}>()

const sanitizedHtml = computed(() => displayRichText(props.html, { breaks: props.breaks }))
</script>
