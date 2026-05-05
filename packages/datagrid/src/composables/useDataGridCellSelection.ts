import { ref, shallowRef } from 'vue'

type CellSelectionAnchor = {
  rowId: string
  columnId: string
}

type UseDataGridCellSelectionOptions = {
  getCellSelectionKey: (rowId: string, columnId: string) => string
  getCellRangePreviewKeys: (target: CellSelectionAnchor) => Set<string>
}

export function useDataGridCellSelection(options: UseDataGridCellSelectionOptions) {
  const selectedCellKeys = shallowRef<Set<string>>(new Set())
  const currentPointerCell = ref<CellSelectionAnchor | null>(null)
  const hoveredCellKey = ref<string | null>(null)
  const previewCellRangeKeys = shallowRef<Set<string>>(new Set())
  const lastSelectedCell = ref<CellSelectionAnchor | null>(null)
  const isCellSelectionCtrlDown = ref(false)
  const isCellSelectionShiftDown = ref(false)

  function clearSelectionPreviewIfShiftReleased(event: KeyboardEvent) {
    if (event.key !== 'Shift') {
      return
    }

    isCellSelectionShiftDown.value = false
    previewCellRangeKeys.value = new Set()
  }

  function updateCellSelectionModifierState(event: KeyboardEvent) {
    isCellSelectionCtrlDown.value = event.ctrlKey
    isCellSelectionShiftDown.value = event.shiftKey

    if (!currentPointerCell.value) {
      return
    }

    if (!event.ctrlKey) {
      hoveredCellKey.value = null
      previewCellRangeKeys.value = new Set()
      return
    }

    hoveredCellKey.value = options.getCellSelectionKey(currentPointerCell.value.rowId, currentPointerCell.value.columnId)
    previewCellRangeKeys.value = event.shiftKey ? options.getCellRangePreviewKeys(currentPointerCell.value) : new Set()
  }

  function clearCellSelectionModifierState() {
    isCellSelectionCtrlDown.value = false
    isCellSelectionShiftDown.value = false
    hoveredCellKey.value = null
    previewCellRangeKeys.value = new Set()
  }

  return {
    selectedCellKeys,
    currentPointerCell,
    hoveredCellKey,
    previewCellRangeKeys,
    lastSelectedCell,
    isCellSelectionCtrlDown,
    isCellSelectionShiftDown,
    clearSelectionPreviewIfShiftReleased,
    updateCellSelectionModifierState,
    clearCellSelectionModifierState,
  }
}
