<template>
  <section class="mt-8 border-y py-5" :class="isDark ? 'border-white/10' : 'border-gray-200'" data-testid="forever-coming-soon">
    <p class="font-mono text-[11px] uppercase tracking-[0.16em] mb-2" :class="isDark ? 'text-brand-300' : 'text-brand-700'">Coming soon</p>
    <p class="text-sm leading-relaxed" :class="isDark ? 'text-silver-300' : 'text-gray-700'"><slot /></p>
  </section>
</template>

<script setup lang="ts">
const isDark = useIsDark()
</script>
