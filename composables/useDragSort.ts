/**
 * useDragSort — Native HTML5 drag & drop for list reordering
 *
 * Usage:
 *   const { dragHandlers, isDragging, dragOverIdx } = useDragSort(items, onReorder)
 *
 *   <tr v-for="(item, idx) in items"
 *     v-bind="dragHandlers(idx)"
 *     :class="{ 'opacity-50': isDragging && dragOverIdx === idx }">
 *     <td class="cursor-grab" v-bind="dragHandlers(idx, true)">⠿</td>
 *   </tr>
 */

export function useDragSort<T extends { id: number }>(
  items: Ref<T[]>,
  onReorder: (reordered: { id: number; sortOrder: number }[]) => Promise<void>
) {
  const dragIdx = ref<number | null>(null)
  const dragOverIdx = ref<number | null>(null)
  const isDragging = ref(false)

  function dragHandlers(idx: number, isHandle = false) {
    return {
      draggable: true,
      ondragstart: (e: DragEvent) => {
        dragIdx.value = idx
        isDragging.value = true
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move'
          e.dataTransfer.setData('text/plain', String(idx))
        }
      },
      ondragover: (e: DragEvent) => {
        e.preventDefault()
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
        dragOverIdx.value = idx
      },
      ondragleave: () => {
        if (dragOverIdx.value === idx) dragOverIdx.value = null
      },
      ondrop: async (e: DragEvent) => {
        e.preventDefault()
        const fromIdx = dragIdx.value
        if (fromIdx === null || fromIdx === idx) {
          resetDrag()
          return
        }

        // Reorder array
        const arr = [...items.value]
        const [moved] = arr.splice(fromIdx, 1)
        arr.splice(idx, 0, moved)
        items.value = arr

        // Build reorder payload
        const reordered = arr.map((item, i) => ({ id: item.id, sortOrder: i }))
        resetDrag()

        await onReorder(reordered)
      },
      ondragend: () => resetDrag(),
    }
  }

  function resetDrag() {
    dragIdx.value = null
    dragOverIdx.value = null
    isDragging.value = false
  }

  return { dragHandlers, isDragging, dragOverIdx, dragIdx }
}
