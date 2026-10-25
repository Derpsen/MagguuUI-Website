<!--
  Legal notice page (route /imprint)
-->

<template>
  <PageViewImprint :copy="copy" :contact-email="contactEmail" />
</template>

<script setup lang="ts">
import { IMPRINT_DEFAULTS } from '~/utils/pageCopyDefaults'

const copy = usePageCopy('imprint', IMPRINT_DEFAULTS)
const siteSettings = usePublicPageSeo({
  title: 'Legal notice',
  description: 'Legal notice for MagguuUI.',
  path: '/imprint',
  robots: 'noindex, follow',
})

const contactEmail = computed(() => siteSettings.value.contact_email || 'contact@magguu.xyz')
</script>
