<!--
  TipTap Rich Text Editor Component
  Usage: <TipTapEditor v-model="content" placeholder="Enter content..." />
-->

<template>
  <div class="tiptap-editor rounded-lg overflow-hidden border transition-colors"
    :class="isDark ? 'border-[hsl(240,3.7%,22%)] bg-[hsl(222.34,10.43%,12.27%)]' : 'border-slate-200 bg-white'">

    <!-- Toolbar -->
    <div v-if="editor" class="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b transition-colors"
      :class="isDark ? 'border-[hsl(240,3.7%,22%)] bg-[hsl(220,13.06%,11%)]' : 'border-slate-200 bg-slate-50'">

      <!-- Text Style -->
      <div class="flex items-center gap-0.5">
        <button
          v-for="heading in [1, 2, 3]" :key="heading"
          class="toolbar-btn"
          :class="[editor.isActive('heading', { level: heading }) ? activeClass : inactiveClass]"
          :title="`Heading ${heading}`"
          :aria-label="`Toggle Heading ${heading}`"
          :aria-pressed="editor.isActive('heading', { level: heading })"
          @click="editor.chain().focus().toggleHeading({ level: heading }).run()"
        >
          H{{ heading }}
        </button>
      </div>

      <div class="toolbar-divider" :class="isDark ? 'bg-white/8' : 'bg-slate-200'" />

      <!-- Format -->
      <div class="flex items-center gap-0.5">
        <button class="toolbar-btn" :class="[editor.isActive('bold') ? activeClass : inactiveClass]" title="Bold (Ctrl+B)" aria-label="Toggle Bold" :aria-pressed="editor.isActive('bold')" @click="editor.chain().focus().toggleBold().run()">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z"/><path d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z"/></svg>
        </button>
        <button class="toolbar-btn" :class="[editor.isActive('italic') ? activeClass : inactiveClass]" title="Italic (Ctrl+I)" aria-label="Toggle Italic" :aria-pressed="editor.isActive('italic')" @click="editor.chain().focus().toggleItalic().run()">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>
        </button>
        <button class="toolbar-btn" :class="[editor.isActive('underline') ? activeClass : inactiveClass]" title="Underline (Ctrl+U)" aria-label="Toggle Underline" :aria-pressed="editor.isActive('underline')" @click="editor.chain().focus().toggleUnderline().run()">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 3v7a6 6 0 006 6 6 6 0 006-6V3"/><line x1="4" y1="21" x2="20" y2="21"/></svg>
        </button>
        <button class="toolbar-btn" :class="[editor.isActive('strike') ? activeClass : inactiveClass]" title="Strikethrough" aria-label="Toggle Strikethrough" :aria-pressed="editor.isActive('strike')" @click="editor.chain().focus().toggleStrike().run()">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="4" y1="12" x2="20" y2="12"/><path d="M17.5 7.5c0-2-1.5-3.5-4-3.5H8c-2.5 0-4 1.5-4 3.5S5.5 11 8 12h4.5"/><path d="M6 17c0 2 1.5 3 4 3h3.5c2.5 0 4-1.5 4-3.5S16 13 13.5 12"/></svg>
        </button>
        <button class="toolbar-btn" :class="[editor.isActive('code') ? activeClass : inactiveClass]" title="Inline Code" aria-label="Toggle Inline Code" :aria-pressed="editor.isActive('code')" @click="editor.chain().focus().toggleCode().run()">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="16,18 22,12 16,6"/><polyline points="8,6 2,12 8,18"/></svg>
        </button>
      </div>

      <div class="toolbar-divider" :class="isDark ? 'bg-white/8' : 'bg-slate-200'" />

      <!-- Lists -->
      <div class="flex items-center gap-0.5">
        <button class="toolbar-btn" :class="[editor.isActive('bulletList') ? activeClass : inactiveClass]" title="Bullet List" aria-label="Toggle Bullet List" :aria-pressed="editor.isActive('bulletList')" @click="editor.chain().focus().toggleBulletList().run()">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1.5" fill="currentColor"/><circle cx="4" cy="12" r="1.5" fill="currentColor"/><circle cx="4" cy="18" r="1.5" fill="currentColor"/></svg>
        </button>
        <button class="toolbar-btn" :class="[editor.isActive('orderedList') ? activeClass : inactiveClass]" title="Numbered List" aria-label="Toggle Numbered List" :aria-pressed="editor.isActive('orderedList')" @click="editor.chain().focus().toggleOrderedList().run()">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><text x="2" y="8" font-size="8" fill="currentColor" stroke="none">1</text><text x="2" y="14" font-size="8" fill="currentColor" stroke="none">2</text><text x="2" y="20" font-size="8" fill="currentColor" stroke="none">3</text></svg>
        </button>
      </div>

      <div class="toolbar-divider" :class="isDark ? 'bg-white/8' : 'bg-slate-200'" />

      <!-- Block -->
      <div class="flex items-center gap-0.5">
        <button class="toolbar-btn" :class="[editor.isActive('blockquote') ? activeClass : inactiveClass]" title="Blockquote" aria-label="Toggle Blockquote" :aria-pressed="editor.isActive('blockquote')" @click="editor.chain().focus().toggleBlockquote().run()">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311C9.591 11.69 11 13.173 11 15c0 1.933-1.567 3.5-3.5 3.5-1.288 0-2.379-.595-2.917-1.679zM14.583 17.321C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311C19.591 11.69 21 13.173 21 15c0 1.933-1.567 3.5-3.5 3.5-1.288 0-2.379-.595-2.917-1.679z"/></svg>
        </button>
        <button class="toolbar-btn" :class="[editor.isActive('codeBlock') ? activeClass : inactiveClass]" title="Code Block" aria-label="Toggle Code Block" :aria-pressed="editor.isActive('codeBlock')" @click="editor.chain().focus().toggleCodeBlock().run()">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="9,8 5,12 9,16"/><polyline points="15,8 19,12 15,16"/></svg>
        </button>
        <button class="toolbar-btn" :class="inactiveClass" title="Horizontal Rule" aria-label="Insert Horizontal Rule" @click="editor.chain().focus().setHorizontalRule().run()">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"/></svg>
        </button>
      </div>

      <div class="toolbar-divider" :class="isDark ? 'bg-white/8' : 'bg-slate-200'" />

      <!-- Link -->
      <div class="flex items-center gap-0.5">
        <button class="toolbar-btn" :class="[editor.isActive('link') ? activeClass : inactiveClass]" title="Insert Link" aria-label="Insert Link" :aria-pressed="editor.isActive('link')" @click="setLink">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
        </button>
        <button v-if="editor.isActive('link')" class="toolbar-btn" :class="inactiveClass" title="Remove Link" aria-label="Remove Link" @click="editor.chain().focus().unsetLink().run()">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/><line x1="4" y1="20" x2="20" y2="4" stroke-width="2"/></svg>
        </button>
      </div>

      <div class="toolbar-divider" :class="isDark ? 'bg-white/8' : 'bg-slate-200'" />

      <!-- Undo/Redo -->
      <div class="flex items-center gap-0.5">
        <button class="toolbar-btn" :class="inactiveClass" title="Undo (Ctrl+Z)" aria-label="Undo" @click="editor.chain().focus().undo().run()" :disabled="!editor.can().undo()">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="1,4 1,10 7,10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
        </button>
        <button class="toolbar-btn" :class="inactiveClass" title="Redo (Ctrl+Y)" aria-label="Redo" @click="editor.chain().focus().redo().run()" :disabled="!editor.can().redo()">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="23,4 23,10 17,10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
        </button>
      </div>
    </div>

    <!-- Editor Content -->
    <EditorContent :editor="editor" class="tiptap-content" />
  </div>
</template>

<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'

const props = defineProps<{
  modelValue: string
  placeholder?: string
  minHeight?: string
}>()

const emit = defineEmits(['update:modelValue'])

const isDark = useIsDark()

const activeClass = computed(() => isDark.value
  ? 'bg-white/10 text-white'
  : 'bg-slate-200 text-slate-900'
)
const inactiveClass = computed(() => isDark.value
  ? 'text-white/50 hover:text-white hover:bg-white/8'
  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
)

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
    }),
    Underline,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { class: 'text-brand-400 underline' },
    }),
    Placeholder.configure({
      placeholder: props.placeholder || 'Enter content...',
    }),
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
  ],
  editorProps: {
    attributes: {
      class: 'prose prose-sm max-w-none focus:outline-none',
      style: `min-height: ${props.minHeight || '200px'}; padding: 1rem;`,
    },
  },
  onUpdate: ({ editor }) => {
    emit('update:modelValue', editor.getHTML())
  },
})

// Sync external changes
watch(() => props.modelValue, (val) => {
  if (editor.value && editor.value.getHTML() !== val) {
    editor.value.commands.setContent(val, { emitUpdate: false })
  }
})

function setLink() {
  if (!editor.value) return
  const previousUrl = editor.value.getAttributes('link').href
  const url = window.prompt('Enter URL:', previousUrl || 'https://')
  if (url === null) return
  if (url === '') { editor.value.chain().focus().extendMarkRange('link').unsetLink().run(); return }
  editor.value.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
}

onBeforeUnmount(() => { editor.value?.destroy() })
</script>

<style>
/* TipTap Editor Styles */
.tiptap-content .ProseMirror {
  outline: none;
}

.tiptap-content .ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
  color: #6b7280;
}

/* Dark mode prose */
.dark .tiptap-content .ProseMirror {
  color: hsl(0 0% 85%);
}
.dark .tiptap-content .ProseMirror h1,
.dark .tiptap-content .ProseMirror h2,
.dark .tiptap-content .ProseMirror h3 {
  color: hsl(0 0% 95%);
}
.dark .tiptap-content .ProseMirror a {
  color: hsl(212 100% 60%);
}
.dark .tiptap-content .ProseMirror code {
  background: hsl(0 0% 100% / 0.08);
  color: hsl(212 80% 72%);
  padding: 0.15em 0.3em;
  border-radius: 4px;
  font-size: 0.85em;
}
.dark .tiptap-content .ProseMirror pre {
  background: hsl(0 0% 0% / 0.25);
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
}
.dark .tiptap-content .ProseMirror pre code {
  background: none;
  padding: 0;
}
.dark .tiptap-content .ProseMirror blockquote {
  border-left: 3px solid hsl(240 3.7% 28%);
  padding-left: 1rem;
  color: hsl(240 5% 64.9%);
}
.dark .tiptap-content .ProseMirror hr {
  border-color: hsl(240 3.7% 22%);
}

/* Light mode prose */
.light .tiptap-content .ProseMirror {
  color: #374151;
}
.light .tiptap-content .ProseMirror h1,
.light .tiptap-content .ProseMirror h2,
.light .tiptap-content .ProseMirror h3 {
  color: #111827;
}
.light .tiptap-content .ProseMirror a {
  color: #2563EB;
}
.light .tiptap-content .ProseMirror code {
  background: #f3f4f6;
  color: #6366f1;
  padding: 0.15em 0.3em;
  border-radius: 4px;
  font-size: 0.85em;
}
.light .tiptap-content .ProseMirror pre {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
}
.light .tiptap-content .ProseMirror pre code {
  background: none;
  padding: 0;
}
.light .tiptap-content .ProseMirror blockquote {
  border-left: 3px solid #d1d5db;
  padding-left: 1rem;
  color: #6b7280;
}

/* Toolbar button base */
.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  transition: all 0.15s;
  cursor: pointer;
  border: none;
  background: none;
}
.toolbar-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.toolbar-divider {
  width: 1px;
  height: 20px;
  margin: 0 4px;
}
</style>
