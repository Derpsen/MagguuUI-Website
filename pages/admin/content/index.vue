<template>
  <div class="space-y-6">
    <AdminPageHeader
      icon="i-heroicons-document-text"
      eyebrow="Content"
      title="Content"
      description="Pick a public page to edit. Changes publish to the live MagguuUI site."
    />

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <NuxtLink
        v-for="card in cards"
        :key="card.to"
        :to="card.to"
        class="admin-content-hub-card group"
      >
        <span class="admin-content-hub-card__icon" aria-hidden="true">
          <UIcon :name="card.icon" class="h-5 w-5" />
        </span>
        <div class="min-w-0">
          <p class="admin-content-hub-card__label">{{ card.label }}</p>
          <p class="admin-content-hub-card__hint">{{ card.hint }}</p>
        </div>
        <UIcon
          name="i-heroicons-arrow-right"
          class="ml-auto h-4 w-4 shrink-0 opacity-40 transition group-hover:opacity-80 group-hover:translate-x-0.5"
        />
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const cards = [
  {
    to: '/admin/content/home',
    label: 'Homepage',
    hint: 'Hero, section labels, feature cards',
    icon: 'i-heroicons-home-modern',
  },
  {
    to: '/admin/content/guide',
    label: 'Guide',
    hint: 'Install steps and onboarding copy',
    icon: 'i-heroicons-book-open',
  },
  {
    to: '/admin/content/faq',
    label: 'FAQ',
    hint: 'Support answers players search for',
    icon: 'i-heroicons-question-mark-circle',
  },
  {
    to: '/admin/content/changelog',
    label: 'Updates',
    hint: 'Public release notes',
    icon: 'i-heroicons-document-text',
  },
]
</script>
