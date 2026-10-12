<template>
  <a :href="href" v-bind="$attrs">
    <template v-if="mounted">{{ address }}</template>
    <template v-else>{{ user }}<span aria-hidden="true">&#64;</span>{{ domain }}</template>
  </a>
</template>

<script setup lang="ts">
// Cloudflare Email Obfuscation rewrites any raw address or mailto: in the HTML
// and injects /cdn-cgi/.../email-decode.min.js, which our nonce CSP blocks.
// SSR renders the address split across nodes with no mailto; the real link is
// built after mount.
defineOptions({ inheritAttrs: false })
const props = defineProps<{ address: string }>()
const mounted = ref(false)
onMounted(() => { mounted.value = true })
const user = computed(() => props.address.split('@')[0] || '')
const domain = computed(() => props.address.split('@').slice(1).join('@'))
const href = computed(() => (mounted.value ? `mailto:${props.address}` : undefined))
</script>
