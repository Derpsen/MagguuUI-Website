<script setup lang="ts">
definePageMeta({ layout: 'admin' })

// Content has no root page — send nav/bookmarks to the homepage editor.
await navigateTo('/admin/content/home', { replace: true })
</script>
