<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
  description?: string
}>(), {
  title: 'MagguuUI',
  description: 'Native overhaul for EllesmereUI. Designed for 4K. Open /mui and run Apply Magguu profiles.',
})

// WoW class colors, in in-game class order.
const classColors = [
  '#C69B6D', '#F48CBA', '#AAD372', '#FFF468', '#FFFFFF', '#C41E3A', '#0070DD',
  '#3FC7EB', '#8788EE', '#00FF98', '#FF7C0A', '#A330C9', '#33937F',
]
const addonIcons = ['magguuui.png', 'ellesmereui.png', 'northern-sky.png', 'exboss.png', 'whisper-messenger.png']
</script>

<template>
  <div style="width: 100%; height: 100%; display: flex; flex-direction: column; background: #0b1118; color: #e6edf3; font-family: 'Plus Jakarta Sans', sans-serif;">
    <div style="display: flex; height: 10px; width: 100%;">
      <div v-for="color in classColors" :key="color" :style="{ flex: 1, height: '10px', background: color }" />
    </div>

    <div style="display: flex; flex-direction: column; flex: 1; padding: 64px 80px; background-image: radial-gradient(circle at 85% 15%, rgba(12, 210, 157, 0.18), transparent 55%);">
      <div style="display: flex; align-items: center; gap: 20px;">
        <img src="/logo-300.png" width="72" height="72" style="width: 72px; height: 72px; border-radius: 16px;">
        <div style="display: flex; font-size: 40px; font-weight: 700;">
          <span style="color: #0CD29D;">Magguu</span><span style="color: #c0c8d4;">UI</span>
        </div>
      </div>

      <div style="display: flex; margin-top: 56px; font-size: 68px; font-weight: 700; line-height: 1.08; letter-spacing: -0.02em; color: #ffffff; max-width: 1040px;">
        {{ title }}
      </div>
      <div v-if="description" style="display: flex; margin-top: 28px; font-size: 30px; line-height: 1.35; color: #8b98a8; max-width: 1000px;">
        {{ description }}
      </div>

      <div style="display: flex; align-items: center; margin-top: auto; gap: 16px;">
        <img
          v-for="icon in addonIcons" :key="icon" :src="`/addon-icons/${icon}`" width="56" height="56"
          style="width: 56px; height: 56px; border-radius: 12px; border: 2px solid rgba(255, 255, 255, 0.12);"
        >
        <div style="display: flex; margin-left: auto; font-size: 24px; color: #64748b; font-family: 'JetBrains Mono', monospace;">
          ui.magguu.xyz
        </div>
      </div>
    </div>
  </div>
</template>
