<!--
  About Page - Project information
-->

<template>
  <PageViewAbout :copy="copy" :contact-email="contactEmail" />
</template>

<script setup lang="ts">
import { ABOUT_DEFAULTS } from '~/utils/pageCopyDefaults'

const copy = usePageCopy('about', ABOUT_DEFAULTS)
const siteSettings = usePublicPageSeo({
  title: 'About',
  description: 'MagguuUI is a native overhaul for EllesmereUI. Designed for 4K.',
  path: '/about',
})

const contactEmail = computed(() => siteSettings.value.contact_email || 'contact@magguu.xyz')

</script>
