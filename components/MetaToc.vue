<template>
  <nav :aria-label="ui.onThisPage" class="text-sm">
    <p class="mg-kicker">{{ ui.onThisPage }}</p>
    <ul class="mt-2 flex gap-4 overflow-x-auto whitespace-nowrap lg:flex-col lg:gap-1.5 lg:overflow-visible">
      <li v-for="item in items" :key="item.id">
        <a
          :href="`#${item.id}`"
          :aria-current="item.id === activeId ? 'location' : undefined"
          class="block border-b-2 py-0.5 lg:border-b-0 lg:border-l-2 lg:pl-3"
          :class="item.id === activeId ? activeClass : idleClass"
        >{{ item.label }}</a>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import { META_UI_COPY } from '~/utils/metaUiCopy'

const props = defineProps<{ items: Array<{ id: string, label: string }> }>()

const ui = META_UI_COPY
const activeId = ref(props.items[0]?.id ?? '')
const activeClass = 'border-mg-accent-text text-mg-fg'
const idleClass = 'border-transparent text-mg-fg-muted hover:text-mg-fg'

let observer: IntersectionObserver | null = null
onMounted(() => {
  if (!('IntersectionObserver' in window)) return
  observer = new IntersectionObserver((entries) => {
    const hit = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
    if (hit?.target.id) activeId.value = hit.target.id
  }, { rootMargin: '-15% 0px -70% 0px' })
  for (const item of props.items) {
    const el = document.getElementById(item.id)
    if (el) observer.observe(el)
  }
})
onBeforeUnmount(() => observer?.disconnect())
</script>
