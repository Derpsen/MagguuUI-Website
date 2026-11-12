<template>
  <p class="mt-12 text-sm border-t pt-6" :class="isDark ? 'border-white/10 text-silver-500' : 'border-gray-200 text-gray-500'">
    Also on this site:
    the
    <NuxtLink to="/guide" class="underline underline-offset-4" :class="isDark ? 'text-white' : 'text-gray-950'">Installation Guide</NuxtLink>
    and the
    <NuxtLink to="/meta" class="underline underline-offset-4" :class="isDark ? 'text-white' : 'text-gray-950'">Mythic+ Meta</NuxtLink>.
  </p>
</template>

<script setup lang="ts">
const isDark = useIsDark()
</script>
