import { computed, onBeforeUnmount, ref, shallowRef, watch, type Ref } from 'vue'
import type { Cell, Column, Row } from '@tanstack/vue-table'

import type { DataGridRowSelectionConfig } from '../types'
import { getCellSelectionKey, parseDataGridCellSelectionKey, type AnyRow, type CellSelectionAnchor, type SelectedCellRow, type SelectionPreviewMode } from '../types/internal'

type UseDataGridCellSelectionOptions = {
  isEnabled: Ref<boolean>
  visibleRows: Ref<Row<AnyRow>[]>
  visibleRowById: Ref<Map<string, Row<AnyRow>>>
  cellSelectionColumns: Ref<Column<AnyRow, unknown>[]>
  rowSelectionConfig: Ref<DataGridRowSelectionConfig<AnyRow> | null>
  getTableRows: () => Row<AnyRow>[]
  setRowSelectionPreview: (rows: Row<AnyRow>[], rowId: string, additive: boolean) => void
  clearRowSelectionPreview: () => void
  toggleRowSelectionRange: (
    rows: Row<AnyRow>[],
    row: Row<AnyRow>,
    checked: boolean,
    event: Pick<MouseEvent, 'shiftKey'>,
  ) => void
}

type CellSelectionPreviewRange = {
  rowStart: number
  rowEnd: number
  columnStart: number
  columnEnd: number
}

function getCellSelectionAnchor(cell: Cell<AnyRow, unknown>): CellSelectionAnchor {
  return {
    rowId: cell.row.id,
    columnId: cell.column.id,
  }
}

function areAllKeysSelected(keys: Iterable<string>, selectedKeys: Set<string>) {
  for (const key of keys) {
    if (!selectedKeys.has(key)) {
      return false
    }
  }

  return true
}

export function useDataGridCellSelection(options: UseDataGridCellSelectionOptions) {
  const selectedCellKeys = shallowRef<Set<string>>(new Set())
  const currentPointerCell = ref<CellSelectionAnchor | null>(null)
  const hoveredCellKey = ref<string | null>(null)
  const previewCellRangeKeys = shallowRef<Set<string>>(new Set())
  const previewCellRange = ref<CellSelectionPreviewRange | null>(null)
  const previewColumnId = ref<string | null>(null)
  const cellSelectionPreviewMode = ref<SelectionPreviewMode>(null)
  const lastSelectedCell = ref<CellSelectionAnchor | null>(null)
  const isCellSelectionCtrlDown = ref(false)
  const isCellSelectionShiftDown = ref(false)

  const visibleRowIndexById = computed(() => {
    const indexById = new Map<string, number>()
    options.visibleRows.value.forEach((row, index) => {
      indexById.set(row.id, index)
    })
    return indexById
  })
  const cellSelectionColumnIdSet = computed(() => new Set(options.cellSelectionColumns.value.map((column) => column.id)))
  const cellSelectionColumnIndexById = computed(() => new Map(options.cellSelectionColumns.value.map((column, index) => [column.id, index])))
  const selectedCellCount = computed(() => selectedCellKeys.value.size)
  const selectedCellIndex = computed(() => {
    const rowIds = options.visibleRowById.value
    const columnIds = cellSelectionColumnIdSet.value
    const selectedColumnIdsByRowId = new Map<string, Set<string>>()
    const selectedCountByColumnId = new Map<string, number>()
    const selectedCellRowsByRowId = new Map<string, SelectedCellRow>()
    const selectedColumnIds: string[] = []

    if (!options.isEnabled.value || selectedCellKeys.value.size === 0) {
      return {
        selectedColumnIdsByRowId,
        selectedCountByColumnId,
        selectedCellRows: [],
        selectedColumnIds,
      }
    }

    for (const key of selectedCellKeys.value) {
      const parsedKey = parseDataGridCellSelectionKey(key)
      if (!parsedKey || !rowIds.has(parsedKey.rowId) || !columnIds.has(parsedKey.columnId)) {
        continue
      }

      let rowColumnIds = selectedColumnIdsByRowId.get(parsedKey.rowId)
      if (!rowColumnIds) {
        rowColumnIds = new Set<string>()
        selectedColumnIdsByRowId.set(parsedKey.rowId, rowColumnIds)
      }

      if (rowColumnIds.has(parsedKey.columnId)) {
        continue
      }

      rowColumnIds.add(parsedKey.columnId)
      selectedCountByColumnId.set(parsedKey.columnId, (selectedCountByColumnId.get(parsedKey.columnId) ?? 0) + 1)
    }

    const rowCount = options.visibleRows.value.length
    if (rowCount > 0) {
      for (const column of options.cellSelectionColumns.value) {
        if ((selectedCountByColumnId.get(column.id) ?? 0) === rowCount) {
          selectedColumnIds.push(column.id)
        }
      }
    }

    for (const row of options.visibleRows.value) {
      const rowColumnIds = selectedColumnIdsByRowId.get(row.id)
      if (rowColumnIds && rowColumnIds.size > 0) {
        selectedCellRowsByRowId.set(row.id, { row, selectedColumnIds: rowColumnIds })
      }
    }

    return {
      selectedColumnIdsByRowId,
      selectedCountByColumnId,
      selectedCellRows: Array.from(selectedCellRowsByRowId.values()),
      selectedColumnIds,
    }
  })
  const selectedColumnIds = computed(() => {
    return selectedCellIndex.value.selectedColumnIds
  })
  const selectedCellRows = computed<SelectedCellRow[]>(() => {
    return selectedCellIndex.value.selectedCellRows
  })

  function isCellSelectionColumn(column: Column<AnyRow, unknown>) {
    if (!options.isEnabled.value) {
      return false
    }

    return cellSelectionColumnIdSet.value.has(column.id)
  }

  function isCellSelectionColumnId(columnId: string) {
    if (!options.isEnabled.value) {
      return false
    }

    return cellSelectionColumnIdSet.value.has(columnId)
  }

  function isCellSelected(cell: Cell<AnyRow, unknown>) {
    return selectedCellKeys.value.has(getCellSelectionKey(cell.row.id, cell.column.id))
  }

  function isCellSelectionHovered(cell: Cell<AnyRow, unknown>) {
    if (!isCellSelectionCtrlDown.value || !isCellSelectionColumn(cell.column)) {
      return false
    }

    if (isCellSelectionShiftDown.value && lastSelectedCell.value?.rowId === cell.row.id && lastSelectedCell.value.columnId === cell.column.id) {
      return false
    }

    return hoveredCellKey.value === getCellSelectionKey(cell.row.id, cell.column.id)
  }

  function getCellSelectionPreviewMode(cell: Cell<AnyRow, unknown>): SelectionPreviewMode {
    if (!currentPointerCell.value) {
      return null
    }

    if (previewColumnId.value) {
      return cell.column.id === previewColumnId.value
        ? cellSelectionPreviewMode.value
        : null
    }

    const range = previewCellRange.value
    if (range) {
      const rowIndex = visibleRowIndexById.value.get(cell.row.id) ?? -1
      const columnIndex = cellSelectionColumnIndexById.value.get(cell.column.id) ?? -1

      return rowIndex >= range.rowStart &&
        rowIndex <= range.rowEnd &&
        columnIndex >= range.columnStart &&
        columnIndex <= range.columnEnd
        ? cellSelectionPreviewMode.value
        : null
    }

    return previewCellRangeKeys.value.has(getCellSelectionKey(cell.row.id, cell.column.id))
      ? cellSelectionPreviewMode.value
      : null
  }

  function replaceSelectedCellKeys(nextKeys: Set<string>) {
    selectedCellKeys.value = new Set(nextKeys)
  }

  function clearCellSelectionPreview() {
    hoveredCellKey.value = null
    previewCellRangeKeys.value = new Set()
    previewCellRange.value = null
    previewColumnId.value = null
    cellSelectionPreviewMode.value = null
  }

  function clearSelectionPreviews() {
    options.clearRowSelectionPreview()
    clearCellSelectionPreview()
  }

  function getCellRangeKeys(target: CellSelectionAnchor) {
    const anchor = lastSelectedCell.value
    if (!anchor) {
      return new Set<string>()
    }

    const rows = options.visibleRows.value
    const columns = options.cellSelectionColumns.value
    const anchorRowIndex = visibleRowIndexById.value.get(anchor.rowId) ?? -1
    const targetRowIndex = visibleRowIndexById.value.get(target.rowId) ?? -1
    const anchorColumnIndex = cellSelectionColumnIndexById.value.get(anchor.columnId) ?? -1
    const targetColumnIndex = cellSelectionColumnIndexById.value.get(target.columnId) ?? -1

    if (anchorRowIndex < 0 || targetRowIndex < 0 || anchorColumnIndex < 0 || targetColumnIndex < 0) {
      return new Set<string>()
    }

    const [rowStart, rowEnd] = anchorRowIndex < targetRowIndex ? [anchorRowIndex, targetRowIndex] : [targetRowIndex, anchorRowIndex]
    const [columnStart, columnEnd] = anchorColumnIndex < targetColumnIndex ? [anchorColumnIndex, targetColumnIndex] : [targetColumnIndex, anchorColumnIndex]
    const keys = new Set<string>()

    for (let rowIndex = rowStart; rowIndex <= rowEnd; rowIndex += 1) {
      const row = rows[rowIndex]
      if (!row) {
        continue
      }

      for (let columnIndex = columnStart; columnIndex <= columnEnd; columnIndex += 1) {
        const column = columns[columnIndex]
        if (column) {
          keys.add(getCellSelectionKey(row.id, column.id))
        }
      }
    }

    return keys
  }

  function getCellRangePreview(target: CellSelectionAnchor): CellSelectionPreviewRange | null {
    const anchor = lastSelectedCell.value
    if (!anchor) {
      return null
    }

    const anchorRowIndex = visibleRowIndexById.value.get(anchor.rowId) ?? -1
    const targetRowIndex = visibleRowIndexById.value.get(target.rowId) ?? -1
    const anchorColumnIndex = cellSelectionColumnIndexById.value.get(anchor.columnId) ?? -1
    const targetColumnIndex = cellSelectionColumnIndexById.value.get(target.columnId) ?? -1

    if (anchorRowIndex < 0 || targetRowIndex < 0 || anchorColumnIndex < 0 || targetColumnIndex < 0) {
      return null
    }

    return {
      rowStart: Math.min(anchorRowIndex, targetRowIndex),
      rowEnd: Math.max(anchorRowIndex, targetRowIndex),
      columnStart: Math.min(anchorColumnIndex, targetColumnIndex),
      columnEnd: Math.max(anchorColumnIndex, targetColumnIndex),
    }
  }

  function isCellRangeTargetSelected(target: CellSelectionAnchor, selectedKeys = selectedCellKeys.value) {
    return selectedKeys.has(getCellSelectionKey(target.rowId, target.columnId))
  }

  function isColumnSelectionFullySelected(columnId: string) {
    if (!isCellSelectionColumnId(columnId)) {
      return false
    }

    const selectedKeys = selectedCellKeys.value
    for (const row of options.visibleRows.value) {
      if (!selectedKeys.has(getCellSelectionKey(row.id, columnId))) {
        return false
      }
    }

    return options.visibleRows.value.length > 0
  }

  function setCellRangeSelectionPreview(target: CellSelectionAnchor) {
    const range = getCellRangePreview(target)

    if (!range) {
      clearCellSelectionPreview()
      return
    }

    previewCellRangeKeys.value = new Set()
    previewColumnId.value = null
    previewCellRange.value = range
    cellSelectionPreviewMode.value = isCellRangeTargetSelected(target)
      ? 'deselect'
      : 'select'
  }

  function selectCellRange(targetCell: Cell<AnyRow, unknown>) {
    const anchor = lastSelectedCell.value
    if (!anchor) {
      const target = getCellSelectionAnchor(targetCell)
      lastSelectedCell.value = target
      replaceSelectedCellKeys(new Set([...selectedCellKeys.value, getCellSelectionKey(target.rowId, target.columnId)]))
      return
    }

    const nextKeys = new Set(selectedCellKeys.value)
    const target = getCellSelectionAnchor(targetCell)
    const rangeKeys = getCellRangeKeys(target)
    const shouldDeselectRange = isCellRangeTargetSelected(target, nextKeys)

    for (const key of rangeKeys) {
      if (shouldDeselectRange) {
        nextKeys.delete(key)
      } else {
        nextKeys.add(key)
      }
    }

    replaceSelectedCellKeys(nextKeys)
  }

  function getColumnSelectionKeys(columnId: string) {
    if (!isCellSelectionColumnId(columnId)) {
      return new Set<string>()
    }

    const keys = new Set<string>()
    for (const row of options.visibleRows.value) {
      keys.add(getCellSelectionKey(row.id, columnId))
    }
    return keys
  }

  function setColumnSelectionPreview(columnId: string) {
    if (!isCellSelectionColumnId(columnId) || options.visibleRows.value.length === 0) {
      clearCellSelectionPreview()
      return
    }

    previewCellRangeKeys.value = new Set()
    previewCellRange.value = null
    previewColumnId.value = columnId
    cellSelectionPreviewMode.value = isColumnSelectionFullySelected(columnId)
      ? 'deselect'
      : 'select'
  }

  function updateSelectionPreviewForCurrentPointer(event: Pick<KeyboardEvent | PointerEvent | MouseEvent, 'ctrlKey' | 'shiftKey' | 'altKey'>) {
    const pointer = currentPointerCell.value
    if (!pointer) {
      clearSelectionPreviews()
      return
    }

    if (event.altKey && options.rowSelectionConfig.value) {
      clearCellSelectionPreview()
      options.setRowSelectionPreview(options.getTableRows(), pointer.rowId, event.shiftKey)
      return
    }

    options.clearRowSelectionPreview()

    if (!isCellSelectionColumnId(pointer.columnId)) {
      clearCellSelectionPreview()
      return
    }

    if (event.ctrlKey) {
      hoveredCellKey.value = getCellSelectionKey(pointer.rowId, pointer.columnId)
      if (event.shiftKey) {
        setCellRangeSelectionPreview(pointer)
      } else {
        previewCellRangeKeys.value = new Set()
        previewCellRange.value = null
        previewColumnId.value = null
        cellSelectionPreviewMode.value = null
      }
      return
    }

    if (event.shiftKey) {
      hoveredCellKey.value = null
      setColumnSelectionPreview(pointer.columnId)
      return
    }

    clearCellSelectionPreview()
  }

  function clearSelectionPreviewIfShiftReleased(event: KeyboardEvent) {
    isCellSelectionCtrlDown.value = event.ctrlKey
    isCellSelectionShiftDown.value = event.shiftKey
    updateSelectionPreviewForCurrentPointer(event)
  }

  function updateCellSelectionModifierState(event: KeyboardEvent) {
    isCellSelectionCtrlDown.value = event.ctrlKey
    isCellSelectionShiftDown.value = event.shiftKey
    updateSelectionPreviewForCurrentPointer(event)
  }

  function clearCellSelectionModifierState() {
    isCellSelectionCtrlDown.value = false
    isCellSelectionShiftDown.value = false
    currentPointerCell.value = null
    clearSelectionPreviews()
  }

  let areCellSelectionListenersAttached = false

  function attachCellSelectionListeners() {
    if (typeof window === 'undefined' || areCellSelectionListenersAttached) {
      return
    }

    window.addEventListener('keydown', updateCellSelectionModifierState)
    window.addEventListener('keyup', clearSelectionPreviewIfShiftReleased)
    window.addEventListener('blur', clearCellSelectionModifierState)
    areCellSelectionListenersAttached = true
  }

  function detachCellSelectionListeners() {
    if (typeof window === 'undefined' || !areCellSelectionListenersAttached) {
      return
    }

    window.removeEventListener('keydown', updateCellSelectionModifierState)
    window.removeEventListener('keyup', clearSelectionPreviewIfShiftReleased)
    window.removeEventListener('blur', clearCellSelectionModifierState)
    areCellSelectionListenersAttached = false
  }

  function handleCellSelectionPointerEnter(cell: Cell<AnyRow, unknown>, event: PointerEvent) {
    isCellSelectionCtrlDown.value = event.ctrlKey
    isCellSelectionShiftDown.value = event.shiftKey

    if (!isCellSelectionColumn(cell.column)) {
      currentPointerCell.value = null
      clearSelectionPreviews()
      return
    }

    const target = getCellSelectionAnchor(cell)
    currentPointerCell.value = target
    updateSelectionPreviewForCurrentPointer(event)
  }

  function handleCellSelectionPointerLeave(cell: Cell<AnyRow, unknown>) {
    if (currentPointerCell.value?.rowId === cell.row.id && currentPointerCell.value.columnId === cell.column.id) {
      currentPointerCell.value = null
    }

    if (hoveredCellKey.value === getCellSelectionKey(cell.row.id, cell.column.id)) {
      clearCellSelectionPreview()
    }

    if (currentPointerCell.value === null) {
      clearSelectionPreviews()
    }
  }

  function handleCellSelectionClick(cell: Cell<AnyRow, unknown>, event: MouseEvent) {
    isCellSelectionCtrlDown.value = event.ctrlKey
    isCellSelectionShiftDown.value = event.shiftKey

    if (event.altKey && options.rowSelectionConfig.value) {
      event.preventDefault()
      event.stopPropagation()

      const checked = !cell.row.getIsSelected()
      options.toggleRowSelectionRange(options.getTableRows(), cell.row, checked, event)
      options.clearRowSelectionPreview()
      return true
    }

    if (event.shiftKey && !event.ctrlKey && isCellSelectionColumn(cell.column)) {
      event.preventDefault()
      event.stopPropagation()
      clearCellSelectionPreview()
      toggleColumnSelection(cell.column)
      return true
    }

    if (!event.ctrlKey || !isCellSelectionColumn(cell.column)) {
      return false
    }

    event.preventDefault()
    event.stopPropagation()

    if (event.shiftKey) {
      selectCellRange(cell)
      updateSelectionPreviewForCurrentPointer(event)
      return true
    }

    const anchor = getCellSelectionAnchor(cell)
    const key = getCellSelectionKey(anchor.rowId, anchor.columnId)
    const nextKeys = new Set(selectedCellKeys.value)

    if (nextKeys.has(key)) {
      nextKeys.delete(key)
    } else {
      nextKeys.add(key)
    }

    lastSelectedCell.value = anchor
    clearCellSelectionPreview()
    replaceSelectedCellKeys(nextKeys)
    return true
  }

  function toggleColumnSelection(column: Column<AnyRow, unknown>) {
    if (!isCellSelectionColumn(column)) {
      return
    }

    const columnKeys = getColumnSelectionKeys(column.id)

    if (columnKeys.size === 0) {
      return
    }

    const nextKeys = new Set(selectedCellKeys.value)
    const isFullySelected = areAllKeysSelected(columnKeys, nextKeys)

    for (const key of columnKeys) {
      if (isFullySelected) {
        nextKeys.delete(key)
      } else {
        nextKeys.add(key)
      }
    }

    const firstRow = options.visibleRows.value[0]
    if (firstRow) {
      lastSelectedCell.value = {
        rowId: firstRow.id,
        columnId: column.id,
      }
    }

    replaceSelectedCellKeys(nextKeys)
  }

  watch(
    options.isEnabled,
    (enabled) => {
      if (enabled) {
        attachCellSelectionListeners()
        return
      }

      detachCellSelectionListeners()
      clearCellSelectionModifierState()
    },
    { immediate: true },
  )

  watch(
    [options.visibleRows, options.cellSelectionColumns],
    ([rows, columns]) => {
      if (!options.isEnabled.value || selectedCellKeys.value.size === 0) {
        return
      }

      const availableRowIds = new Set<string>()
      for (const row of rows) {
        availableRowIds.add(row.id)
      }
      const availableColumnIds = new Set(columns.map((column) => column.id))

      const nextKeys = new Set<string>()
      for (const key of selectedCellKeys.value) {
        const parsedKey = parseDataGridCellSelectionKey(key)
        if (parsedKey && availableRowIds.has(parsedKey.rowId) && availableColumnIds.has(parsedKey.columnId)) {
          nextKeys.add(key)
        }
      }

      if (nextKeys.size !== selectedCellKeys.value.size) {
        selectedCellKeys.value = nextKeys
      }

      if (
        lastSelectedCell.value &&
        (!availableRowIds.has(lastSelectedCell.value.rowId) ||
          !availableColumnIds.has(lastSelectedCell.value.columnId))
      ) {
        lastSelectedCell.value = null
      }
    },
    { flush: 'post' },
  )

  onBeforeUnmount(() => {
    detachCellSelectionListeners()
  })

  return {
    selectedCellKeys,
    currentPointerCell,
    hoveredCellKey,
    previewCellRangeKeys,
    lastSelectedCell,
    isCellSelectionCtrlDown,
    isCellSelectionShiftDown,
    selectedCellCount,
    selectedColumnIds,
    selectedCellRows,
    getCellSelectionKey,
    isCellSelected,
    isCellSelectionHovered,
    getCellSelectionPreviewMode,
    handleCellSelectionPointerEnter,
    handleCellSelectionPointerLeave,
    handleCellSelectionClick,
    clearCellSelectionModifierState,
  }
}
