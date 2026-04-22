import { computed, ref, type Ref } from 'vue'
import { type Column, type ColumnOrderState, type ColumnPinningState, type ColumnSizingState } from '@tanstack/vue-table'

import type { DataGridColumnVisibilityState } from '../types'

type AnyRow = Record<string, unknown>

type UseDataGridColumnPickerOptions = {
  allLeafColumns: Ref<Column<AnyRow, unknown>[]>
  allLeafColumnsById: Ref<Map<string, Column<AnyRow, unknown>>>
  columnVisibility: Ref<DataGridColumnVisibilityState>
  columnSizing: Ref<ColumnSizingState>
  columnPinning: Ref<ColumnPinningState>
  columnOrder: Ref<ColumnOrderState>
  columnMoveTargetById: Ref<Record<string, string>>
  cloneColumnPinningState: (state: ColumnPinningState) => ColumnPinningState
  toNumber: (value: string, fallback: number) => number
  onAfterApply: () => void
}

export function useDataGridColumnPicker(options: UseDataGridColumnPickerOptions) {
  const draftColumnVisibility = ref<DataGridColumnVisibilityState>({})
  const draftColumnSizing = ref<ColumnSizingState>({})
  const draftColumnPinning = ref<ColumnPinningState>({
    left: [],
    right: [],
  })
  const draftColumnOrder = ref<ColumnOrderState>([])
  const draftColumnMoveTargetById = ref<Record<string, string>>({})

  function syncColumnDialogDraftState() {
    draftColumnVisibility.value = { ...options.columnVisibility.value }
    draftColumnSizing.value = { ...options.columnSizing.value }
    draftColumnPinning.value = options.cloneColumnPinningState(options.columnPinning.value)
    draftColumnOrder.value = [...options.allLeafColumns.value.map((column) => column.id)]
    draftColumnMoveTargetById.value = { ...options.columnMoveTargetById.value }
  }

  function getOrderedLeafColumns(columnIds: string[]) {
    const columnById = new Map(options.allLeafColumnsById.value)
    const orderedColumns: Column<AnyRow, unknown>[] = []

    for (const columnId of columnIds) {
      const column = columnById.get(columnId)
      if (column) {
        orderedColumns.push(column)
        columnById.delete(columnId)
      }
    }

    return [...orderedColumns, ...columnById.values()]
  }

  const columnPickerColumns = computed(() => getOrderedLeafColumns(draftColumnOrder.value))

  function getDraftPinnedSide(columnId: string): 'left' | 'right' | false {
    if (draftColumnPinning.value.left?.includes(columnId)) {
      return 'left'
    }

    if (draftColumnPinning.value.right?.includes(columnId)) {
      return 'right'
    }

    return false
  }

  function getDraftColumnMoveTarget(columnId: string) {
    const targetColumnId = draftColumnMoveTargetById.value[columnId]

    if (targetColumnId) {
      return targetColumnId
    }

    const fallbackTarget = columnPickerColumns.value.find((column) => column.id !== columnId)?.id
    return fallbackTarget ?? ''
  }

  function toggleDraftColumnVisibility(columnId: string, isVisible: boolean) {
    draftColumnVisibility.value = {
      ...draftColumnVisibility.value,
      [columnId]: isVisible,
    }
  }

  function updateDraftColumnSize(columnId: string, rawValue: string) {
    const column = options.allLeafColumnsById.value.get(columnId)
    if (!column) {
      return
    }

    const nextSize = options.toNumber(rawValue, draftColumnSizing.value[columnId] ?? column.getSize())
    draftColumnSizing.value = {
      ...draftColumnSizing.value,
      [columnId]: Math.max(nextSize, column.columnDef.minSize ?? 80),
    }
  }

  function setDraftPin(columnId: string, side: 'left' | 'right' | false) {
    const leftPinned = (draftColumnPinning.value.left ?? []).filter((id) => id !== columnId)
    const rightPinned = (draftColumnPinning.value.right ?? []).filter((id) => id !== columnId)

    if (side === 'left') {
      draftColumnPinning.value = {
        left: [...leftPinned, columnId],
        right: rightPinned,
      }
      return
    }

    if (side === 'right') {
      draftColumnPinning.value = {
        left: leftPinned,
        right: [...rightPinned, columnId],
      }
      return
    }

    draftColumnPinning.value = {
      left: leftPinned,
      right: rightPinned,
    }
  }

  function moveDraftColumn(columnId: string, direction: -1 | 1) {
    const orderedIds = [...draftColumnOrder.value]
    const currentIndex = orderedIds.indexOf(columnId)
    const nextIndex = currentIndex + direction

    if (currentIndex === -1 || nextIndex < 0 || nextIndex >= orderedIds.length) {
      return
    }

    const nextOrder = [...orderedIds]
    const [movedColumnId] = nextOrder.splice(currentIndex, 1)
    if (!movedColumnId) {
      return
    }

    nextOrder.splice(nextIndex, 0, movedColumnId)
    draftColumnOrder.value = nextOrder
  }

  function updateDraftColumnMoveTarget(columnId: string, targetColumnId: string) {
    draftColumnMoveTargetById.value = {
      ...draftColumnMoveTargetById.value,
      [columnId]: targetColumnId,
    }
  }

  function moveDraftColumnRelative(
    columnId: string,
    targetColumnId: string,
    position: 'before' | 'after',
  ) {
    if (!targetColumnId || targetColumnId === columnId) {
      return
    }

    const orderedIds = [...draftColumnOrder.value]
    const sourceIndex = orderedIds.indexOf(columnId)
    const targetIndex = orderedIds.indexOf(targetColumnId)

    if (sourceIndex === -1 || targetIndex === -1) {
      return
    }

    const nextOrder = [...orderedIds]
    const [movedColumnId] = nextOrder.splice(sourceIndex, 1)
    if (!movedColumnId) {
      return
    }

    const adjustedTargetIndex = nextOrder.indexOf(targetColumnId)
    const insertIndex = position === 'before' ? adjustedTargetIndex : adjustedTargetIndex + 1

    nextOrder.splice(insertIndex, 0, movedColumnId)
    draftColumnOrder.value = nextOrder
  }

  function applyColumnDialogChanges() {
    options.columnVisibility.value = { ...draftColumnVisibility.value }
    options.columnSizing.value = { ...draftColumnSizing.value }
    options.columnPinning.value = options.cloneColumnPinningState(draftColumnPinning.value)
    options.columnOrder.value = [...draftColumnOrder.value]
    options.columnMoveTargetById.value = { ...draftColumnMoveTargetById.value }
    options.onAfterApply()
  }

  return {
    columnPickerColumns,
    syncColumnDialogDraftState,
    getDraftPinnedSide,
    getDraftColumnMoveTarget,
    toggleDraftColumnVisibility,
    updateDraftColumnSize,
    setDraftPin,
    moveDraftColumn,
    updateDraftColumnMoveTarget,
    moveDraftColumnRelative,
    applyColumnDialogChanges,
    draftColumnVisibility,
    draftColumnSizing,
  }
}
