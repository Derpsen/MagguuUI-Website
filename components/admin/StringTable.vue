<script setup lang="ts" generic="T extends TableItem">
interface TableItem {
  id: number
  isVisible: boolean
  [key: string]: unknown
}

interface Column {
  key: string
  label: string
  class?: string
}

defineProps<{
  items: T[]
  columns: Column[]
  selected: Set<number>
  dragIdx: number | null
  dragOverIdx: number | null
  allSelected: boolean
  someSelected: boolean
  stringField: string
}>()

defineEmits<{
  'toggle-select': [id: number]
  'toggle-select-all': []
  'drag-start': [event: DragEvent, idx: number]
  'drag-over': [idx: number]
  'drop': [event: DragEvent, idx: number]
  'drag-end': []
  'toggle-visibility': [item: T]
  'edit': [item: T]
  'copy': [item: T]
  'delete': [item: T]
}>()
</script>

<template>
  <div class="admin-table-shell">
    <table class="admin-table">
      <thead>
        <tr>
          <th style="width: 2.5rem"></th>
          <th style="width: 2.5rem">
            <input
              type="checkbox"
              :checked="allSelected"
              :indeterminate="someSelected && !allSelected"
              class="rounded border-slate-300 dark:border-slate-600"
              @change="$emit('toggle-select-all')"
            />
          </th>
          <th v-for="col in columns" :key="col.key" :class="col.class">{{ col.label }}</th>
          <th style="width: 5rem">Visible</th>
          <th style="width: 7rem" class="text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(item, idx) in items"
          :key="item.id"
          class="drag-row"
          :class="{ 'opacity-50': dragIdx === idx, 'border-t-2 border-brand-400': dragOverIdx === idx }"
          draggable="true"
          @dragstart="$emit('drag-start', $event, idx)"
          @dragover.prevent="$emit('drag-over', idx)"
          @drop.prevent="$emit('drop', $event, idx)"
          @dragend="$emit('drag-end')"
        >
          <td><span class="drag-handle cursor-grab">⠿</span></td>
          <td>
            <input
              type="checkbox"
              :checked="selected.has(item.id)"
              class="rounded border-slate-300 dark:border-slate-600"
              @change="$emit('toggle-select', item.id)"
            />
          </td>
          <td v-for="col in columns" :key="col.key" :class="col.class">
            <slot :name="`cell-${col.key}`" :item="item" :value="item[col.key]">
              {{ item[col.key] }}
            </slot>
          </td>
          <td>
            <USwitch :model-value="item.isVisible" size="sm" @update:model-value="$emit('toggle-visibility', item)" />
          </td>
          <td class="text-right">
            <div class="flex items-center justify-end gap-1">
              <UButton icon="i-heroicons-pencil-square" variant="ghost" color="neutral" size="xs" @click="$emit('edit', item)" />
              <UButton icon="i-heroicons-clipboard-document" variant="ghost" color="neutral" size="xs" @click="$emit('copy', item)" />
              <UButton icon="i-heroicons-trash" variant="ghost" color="error" size="xs" @click="$emit('delete', item)" />
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
