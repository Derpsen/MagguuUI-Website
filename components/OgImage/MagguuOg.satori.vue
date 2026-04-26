<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
  description?: string
}>(), {
  title: 'Your WoW Interface, perfected.',
  description: 'One-click installer for ElvUI, Plater, BigWigs, Details, Method Raid Tools and 30+ more addons.',
})
</script>

<template>
  <div class="og-root">
    <div class="orb orb-a" />
    <div class="orb orb-b" />

    <div class="brand-row">
      <div class="brand-mark">M</div>
      <div class="brand-name">
        <span class="brand-blue">Magguu</span><span class="brand-silver">UI</span>
      </div>
    </div>

    <div class="og-title">{{ title }}</div>
    <div v-if="description" class="og-desc">{{ description }}</div>

    <div class="og-footer">
      <span>ui.magguu.xyz</span>
      <span class="dot">·</span>
      <span>One-click WoW UI</span>
    </div>
  </div>
</template>

<style>
.og-root {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 80px;
  background: linear-gradient(135deg, #0a1628 0%, #142848 60%, #1a3460 100%);
  color: #E0E6EE;
  font-family: 'Plus Jakarta Sans', sans-serif;
  position: relative;
  overflow: hidden;
}
.orb {
  position: absolute;
  border-radius: 50%;
  display: flex;
}
.orb-a {
  top: -200px;
  left: -200px;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(59, 139, 255, 0.22), transparent 70%);
}
.orb-b {
  bottom: -160px;
  right: -160px;
  width: 560px;
  height: 560px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.18), transparent 70%);
}
.brand-row {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 48px;
}
.brand-mark {
  width: 72px;
  height: 72px;
  border-radius: 16px;
  background: linear-gradient(135deg, #1d4ed8 0%, #2563EB 50%, #3B8BFF 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 40px;
  font-weight: 700;
}
.brand-name {
  display: flex;
  font-size: 40px;
  font-weight: 700;
}
.brand-blue { color: #3B8BFF; display: flex; }
.brand-silver { color: #C0C8D4; display: flex; }
.og-title {
  font-size: 72px;
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.02em;
  color: #ffffff;
  max-width: 1040px;
  display: flex;
}
.og-desc {
  margin-top: 32px;
  font-size: 30px;
  line-height: 1.35;
  color: #8090A4;
  max-width: 1040px;
  display: flex;
}
.og-footer {
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 22px;
  color: #64748b;
  font-family: 'JetBrains Mono', monospace;
}
.og-footer > * { display: flex; }
.og-footer .dot { color: #3B8BFF; }
</style>
