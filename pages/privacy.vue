<!--
  Privacy Policy Page - Legal requirement for DE/EU (GDPR)
-->

<template>
  <PageViewPrivacy :copy="copy" />
</template>

<script setup lang="ts">
import { PRIVACY_DEFAULTS } from '~/utils/pageCopyDefaults'

const copy = usePageCopy('privacy', PRIVACY_DEFAULTS)

usePublicPageSeo({
  title: 'Privacy Policy',
  description: 'Privacy policy for MagguuUI in accordance with GDPR.',
  path: '/privacy',
  robots: 'noindex, follow',
})
</script>
