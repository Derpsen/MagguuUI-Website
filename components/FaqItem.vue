<!--
  FaqItem — Single FAQ accordion item with glass-card styling
  Usage: <FaqItem question="..." answer="..." :is-dark="isDark" />
-->

<template>
  <div class="glass-card rounded-2xl transition-all overflow-hidden"
    :class="open ? 'border-brand-400/20' : 'hover:border-brand-400/15'">
    <!-- Question (clickable header) -->
    <button @click="open = !open"
      :aria-expanded="open"
      :aria-controls="`faq-answer-${uid}`"
      class="w-full flex items-center justify-between gap-4 px-6 sm:px-7 py-5 text-left transition-colors"
      :class="isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50/50'">
      <span class="font-medium text-sm sm:text-[0.95rem] leading-snug" :class="isDark ? 'text-white' : 'text-gray-900'">
        {{ question }}
      </span>
      <svg aria-hidden="true" class="w-5 h-5 flex-shrink-0 transition-transform duration-300"
        :class="[open ? 'rotate-180' : '', isDark ? 'text-brand-400' : 'text-brand-500']"
        fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
      </svg>
    </button>

    <!-- Answer (smooth grid-rows accordion) -->
    <div :id="`faq-answer-${uid}`" role="region" class="accordion-body" :class="open ? 'accordion-open' : ''">
      <div class="overflow-hidden">
        <div class="px-6 sm:px-7 pb-6 pt-0">
          <div class="border-t pt-4" :class="isDark ? 'border-brand-400/10' : 'border-gray-200'">
            <div class="faq-answer text-sm leading-relaxed" :class="isDark ? 'text-silver-300' : 'text-gray-600'"
              v-html="safeAnswer" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { renderMarkdownToSafeHtml } from '~/utils/richText'

const props = defineProps<{
  question: string
  answer: string
  isDark: boolean
}>()

// Render answers as Markdown so list items, bold, code, and links get
// proper formatting instead of appearing as one wall of text.
const safeAnswer = computed(() => renderMarkdownToSafeHtml(props.answer))

const uid = useId()
const open = ref(false)
</script>

<style scoped>
.accordion-body {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.3s ease, opacity 0.3s ease;
  opacity: 0;
}
.accordion-body > div {
  min-height: 0;
}
.accordion-open {
  grid-template-rows: 1fr;
  opacity: 1;
}

.faq-answer :deep(p) { margin-bottom: 0.85em; }
.faq-answer :deep(p:last-child) { margin-bottom: 0; }
.faq-answer :deep(strong) { font-weight: 600; color: inherit; }
html.dark .faq-answer :deep(strong) { color: #e2e8f0; }
.faq-answer :deep(a) { color: var(--brand-400, #4e9eff); text-decoration: underline; text-underline-offset: 2px; transition: opacity 0.15s; }
.faq-answer :deep(a:hover) { opacity: 0.75; }
.faq-answer :deep(ul), .faq-answer :deep(ol) { padding-left: 1.4em; margin: 0.85em 0; }
.faq-answer :deep(ul) { list-style: disc; }
.faq-answer :deep(ol) { list-style: decimal; }
.faq-answer :deep(li) { margin-bottom: 0.4em; padding-left: 0.2em; }
.faq-answer :deep(li:last-child) { margin-bottom: 0; }
.faq-answer :deep(li > p) { margin-bottom: 0.3em; }
.faq-answer :deep(code) { padding: 0.15em 0.4em; border-radius: 4px; font-size: 0.85em; font-family: 'JetBrains Mono', ui-monospace, monospace; background: rgba(127, 127, 127, 0.12); }
html.dark .faq-answer :deep(code) { background: rgba(201, 135, 106, 0.12); color: #cbd5e1; }
</style>
