import { ref, shallowRef } from 'vue'
import type { Row } from '@tanstack/vue-table'

type AnyRow = Record<string, unknown>
type SelectionPreviewMode = 'select' | 'deselect' | 'toggle' | null

export function useDataGridRowSelection() {
  const lastSelectedRowId = ref<string | null>(null)
  const previewSelectionRowIds = shallowRef<Set<string>>(new Set())
  const rowSelectionPreviewMode = ref<SelectionPreviewMode>(null)

  function clearRowSelectionPreview() {
    previewSelectionRowIds.value = new Set()
    rowSelectionPreviewMode.value = null
  }

  function resetRowSelectionAnchor() {
    lastSelectedRowId.value = null
    clearRowSelectionPreview()
  }

  function toggleRowSelectionRange(
    rows: Row<AnyRow>[],
    targetRow: Row<AnyRow>,
    checked: boolean,
    event: Pick<MouseEvent, 'shiftKey'>,
  ) {
    const currentIndex = rows.findIndex((row) => row.id === targetRow.id)
    const anchorIndex = rows.findIndex((row) => row.id === lastSelectedRowId.value)

    if (event.shiftKey && currentIndex >= 0 && anchorIndex >= 0) {
      const [start, end] = currentIndex < anchorIndex ? [currentIndex, anchorIndex] : [anchorIndex, currentIndex]

      for (let index = start; index <= end; index += 1) {
        rows[index]?.toggleSelected(checked)
      }
    } else {
      targetRow.toggleSelected(checked)
    }

    lastSelectedRowId.value = targetRow.id
    clearRowSelectionPreview()
  }

  function setRowSelectionPreview(rows: Row<AnyRow>[], rowId: string, useRange: boolean) {
    const currentIndex = rows.findIndex((row) => row.id === rowId)

    if (currentIndex < 0) {
      clearRowSelectionPreview()
      return
    }

    const targetRow = rows[currentIndex]
    const anchorIndex = rows.findIndex((row) => row.id === lastSelectedRowId.value)

    if (useRange && anchorIndex >= 0) {
      const [start, end] = currentIndex < anchorIndex ? [currentIndex, anchorIndex] : [anchorIndex, currentIndex]
      previewSelectionRowIds.value = new Set(rows.slice(start, end + 1).map((row) => row.id))
    } else {
      previewSelectionRowIds.value = new Set([rowId])
    }

    rowSelectionPreviewMode.value = targetRow?.getIsSelected() ? 'deselect' : 'select'
  }

  return {
    lastSelectedRowId,
    previewSelectionRowIds,
    rowSelectionPreviewMode,
    clearRowSelectionPreview,
    resetRowSelectionAnchor,
    setRowSelectionPreview,
    toggleRowSelectionRange,
  }
}
