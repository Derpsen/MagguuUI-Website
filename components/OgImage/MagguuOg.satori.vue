<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
  description?: string
}>(), {
  title: 'Your WoW Interface, perfected.',
  description: 'Standalone WoW Retail setup. No external addon is required — choose only the integrations you want.',
})
</script>

<template>
  <div style="width: 100%; height: 100%; display: flex; flex-direction: column; padding: 80px; background: linear-gradient(135deg, #0a1628 0%, #142848 60%, #1a3460 100%); color: #e0e6ee; font-family: 'Plus Jakarta Sans', sans-serif; position: relative; overflow: hidden;">
    <div style="position: absolute; display: flex; top: -200px; left: -200px; width: 600px; height: 600px; border-radius: 50%; background: radial-gradient(circle, rgba(59, 139, 255, 0.22), transparent 70%);" />
    <div style="position: absolute; display: flex; bottom: -160px; right: -160px; width: 560px; height: 560px; border-radius: 50%; background: radial-gradient(circle, rgba(99, 102, 241, 0.18), transparent 70%);" />

    <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 48px;">
      <div style="width: 72px; height: 72px; border-radius: 16px; background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b8bff 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 40px; font-weight: 700;">M</div>
      <div style="display: flex; font-size: 40px; font-weight: 700;">
        <span style="color: #3b8bff; display: flex;">Magguu</span><span style="color: #c0c8d4; display: flex;">UI</span>
      </div>
    </div>

    <div style="font-size: 72px; font-weight: 700; line-height: 1.05; letter-spacing: -0.02em; color: #fff; max-width: 1040px; display: flex;">{{ title }}</div>
    <div v-if="description" style="margin-top: 32px; font-size: 30px; line-height: 1.35; color: #8090a4; max-width: 1040px; display: flex;">{{ description }}</div>

    <div style="margin-top: auto; display: flex; align-items: center; gap: 16px; font-size: 22px; color: #64748b; font-family: 'JetBrains Mono', monospace;">
      <span style="display: flex;">ui.magguu.xyz</span>
      <span style="display: flex; color: #3b8bff;">·</span>
      <span style="display: flex;">One-click WoW UI</span>
    </div>
  </div>
</template>
