import { computed, type Ref, type ShallowRef } from 'vue'
import type { Cell, Column, Row, RowSelectionState } from '@tanstack/vue-table'

import type { DataGridColumn, DataGridSelectionPanelConfig } from '../types'
import { parseDataGridCellSelectionKey, type AnyRow, type CellSelectionAnchor, type SelectedCellRow } from '../types/internal'
import { escapeClipboardCell } from '../utils/clipboard'

type UseDataGridClipboardOptions = {
  visibleColumns: Ref<Column<AnyRow, unknown>[]>
  allLeafColumnsById: Ref<Map<string, Column<AnyRow, unknown>>>
  mergedSelectionPanelConfig: Ref<DataGridSelectionPanelConfig<AnyRow> | null>
  rowSelectionColumnId: Ref<string>
  selectedRows: Ref<Row<AnyRow>[]>
  cellSelectionColumns: Ref<Column<AnyRow, unknown>[]>
  selectedCellRows: Ref<SelectedCellRow[]>
  selectedCellCount: Ref<number>
  selectedColumnIds: Ref<string[]>
  rowSelection: Ref<RowSelectionState>
  selectedCellKeys: ShallowRef<Set<string>>
  previewSelectionRowIds: ShallowRef<Set<string>>
  previewCellRangeKeys: ShallowRef<Set<string>>
  hoveredCellKey: Ref<string | null>
  currentPointerCell: Ref<CellSelectionAnchor | null>
  lastSelectedCell: Ref<CellSelectionAnchor | null>
  lastSelectedRowId: Ref<string | null>
  renderColumnPickerLabel: (column: Column<AnyRow, unknown>) => string
}

async function writeClipboardText(text: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      // Fall back for production/non-secure contexts where Clipboard API is blocked.
    }
  }

  if (typeof document === 'undefined' || !document.body) {
    throw new Error('Clipboard is not available.')
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.top = '-9999px'
  textarea.style.left = '-9999px'
  textarea.style.opacity = '0'

  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()

  try {
    const copied = document.execCommand('copy')
    if (!copied) {
      throw new Error('Clipboard copy failed.')
    }
  } finally {
    document.body.removeChild(textarea)
  }
}

export function useDataGridClipboard(options: UseDataGridClipboardOptions) {
  const selectionPanelColumns = computed(() => {
    const configuredColumnIds = options.mergedSelectionPanelConfig.value?.copyColumnIds

    if (configuredColumnIds && configuredColumnIds.length > 0) {
      const visibleColumnById = new Map(options.visibleColumns.value.map((column) => [column.id, column]))
      return configuredColumnIds.map((columnId) => visibleColumnById.get(columnId)).filter((column): column is Column<AnyRow, unknown> => Boolean(column))
    }

    return options.visibleColumns.value.filter((column) => {
      const columnDef = column.columnDef as DataGridColumn<AnyRow>
      return column.id !== options.rowSelectionColumnId.value && columnDef.localKind !== 'action'
    })
  })

  function getColumnClipboardLabel(column: Column<AnyRow, unknown>) {
    return options.renderColumnPickerLabel(column)
  }

  const cellsByRow = new WeakMap<Row<AnyRow>, Map<string, Cell<AnyRow, unknown>>>()

  function getCellByColumnId(row: Row<AnyRow>, columnId: string) {
    let cellsByColumnId = cellsByRow.get(row)
    if (!cellsByColumnId) {
      cellsByColumnId = new Map(row.getAllCells().map((cell) => [cell.column.id, cell]))
      cellsByRow.set(row, cellsByColumnId)
    }

    return cellsByColumnId.get(columnId)
  }

  function getCustomColumnValue(row: Row<AnyRow>, column: Column<AnyRow, unknown>, kind: 'clipboard' | 'sum') {
    const columnDef = column.columnDef as DataGridColumn<AnyRow>
    const resolver = kind === 'clipboard' ? columnDef.clipboardValue : columnDef.sumValue

    if (!resolver) {
      return row.getValue(column.id)
    }

    const cell = getCellByColumnId(row, column.id)
    if (!cell) {
      return row.getValue(column.id)
    }

    return resolver({ cell, row })
  }

  function getClipboardCellValue(row: Row<AnyRow>, column: Column<AnyRow, unknown>) {
    const rawValue = getCustomColumnValue(row, column, 'clipboard')
    const columnDef = column.columnDef as DataGridColumn<AnyRow>
    const cell = columnDef.clipboardFormat ? getCellByColumnId(row, column.id) : undefined
    if (columnDef.clipboardFormat && cell) {
      return columnDef.clipboardFormat(rawValue, { cell, row })
    }

    if (rawValue === null || rawValue === undefined) {
      return ''
    }

    if (typeof rawValue === 'number' || typeof rawValue === 'boolean') {
      return String(rawValue)
    }

    if (typeof rawValue === 'string') {
      return rawValue
    }

    return JSON.stringify(rawValue)
  }

  function clearSelectedCells() {
    options.selectedCellKeys.value = new Set()
    options.previewCellRangeKeys.value = new Set()
    options.hoveredCellKey.value = null
    options.currentPointerCell.value = null
    options.lastSelectedCell.value = null
  }

  function clearSelectedRows() {
    options.rowSelection.value = {}
    options.previewSelectionRowIds.value = new Set()
    options.lastSelectedRowId.value = null
  }

  function clearAllSelection() {
    clearSelectedRows()
    clearSelectedCells()
  }

  function clearSelectedColumns() {
    if (options.selectedColumnIds.value.length === 0) {
      return
    }

    const columnIds = new Set(options.selectedColumnIds.value)
    options.selectedCellKeys.value = new Set(
      [...options.selectedCellKeys.value].filter((key) => {
        const parsedKey = parseDataGridCellSelectionKey(key)
        return !parsedKey || !columnIds.has(parsedKey.columnId)
      }),
    )
    options.previewCellRangeKeys.value = new Set()
    options.hoveredCellKey.value = null
    options.currentPointerCell.value = null
  }

  async function copySelectedRows(includeHeaders: boolean) {
    const columns = selectionPanelColumns.value
    const rows = options.selectedRows.value

    if (columns.length === 0 || rows.length === 0 || typeof navigator === 'undefined') {
      return
    }

    const lines: string[] = []

    if (includeHeaders) {
      lines.push(columns.map((column) => escapeClipboardCell(getColumnClipboardLabel(column))).join('\t'))
    }

    for (const row of rows) {
      lines.push(columns.map((column) => escapeClipboardCell(getClipboardCellValue(row, column))).join('\t'))
    }

    await writeClipboardText(lines.join('\n'))
  }

  function getSelectedCellColumns(rows: SelectedCellRow[]) {
    const selectedColumnIds = new Set<string>()
    for (const row of rows) {
      for (const columnId of row.selectedColumnIds) {
        selectedColumnIds.add(columnId)
      }
    }
    return options.cellSelectionColumns.value.filter((column) => selectedColumnIds.has(column.id))
  }

  async function copySelectedCells(includeHeaders: boolean) {
    const rows = options.selectedCellRows.value
    const columns = getSelectedCellColumns(rows)

    if (columns.length === 0 || rows.length === 0 || typeof navigator === 'undefined') {
      return
    }

    const lines: string[] = []

    if (includeHeaders) {
      lines.push(columns.map((column) => escapeClipboardCell(getColumnClipboardLabel(column))).join('\t'))
    }

    for (const rowEntry of rows) {
      lines.push(columns.map((column) => (rowEntry.selectedColumnIds.has(column.id) ? escapeClipboardCell(getClipboardCellValue(rowEntry.row, column)) : '')).join('\t'))
    }

    await writeClipboardText(lines.join('\n'))
  }

  async function copyAllSelection(includeHeaders: boolean) {
    const parts: string[] = []

    if (options.selectedRows.value.length > 0) {
      const columns = selectionPanelColumns.value
      const lines: string[] = []

      if (includeHeaders) {
        lines.push(columns.map((column) => escapeClipboardCell(getColumnClipboardLabel(column))).join('\t'))
      }

      for (const row of options.selectedRows.value) {
        lines.push(columns.map((column) => escapeClipboardCell(getClipboardCellValue(row, column))).join('\t'))
      }

      parts.push(lines.join('\n'))
    }

    if (options.selectedCellCount.value > 0) {
      const columns = getSelectedCellColumns(options.selectedCellRows.value)
      const lines: string[] = []

      if (includeHeaders) {
        lines.push(columns.map((column) => escapeClipboardCell(getColumnClipboardLabel(column))).join('\t'))
      }

      for (const rowEntry of options.selectedCellRows.value) {
        lines.push(columns.map((column) => (rowEntry.selectedColumnIds.has(column.id) ? escapeClipboardCell(getClipboardCellValue(rowEntry.row, column)) : '')).join('\t'))
      }

      parts.push(lines.join('\n'))
    }

    if (parts.length > 0) {
      await writeClipboardText(parts.join('\n\n'))
    }
  }

  const selectionPanelSums = computed(() => {
    const sumConfigs = options.mergedSelectionPanelConfig.value?.sumColumns ?? []
    if (!options.mergedSelectionPanelConfig.value || sumConfigs.length === 0 || Object.keys(options.rowSelection.value).length === 0) {
      return []
    }

    const columnsById = new Map<string, Column<AnyRow, unknown>>()
    const totalsById = new Map<string, number>()

    for (const config of sumConfigs) {
      const column = options.allLeafColumnsById.value.get(config.columnId)
      if (!column) {
        continue
      }

      columnsById.set(config.columnId, column)
      totalsById.set(config.columnId, 0)
    }

    if (totalsById.size === 0) {
      return []
    }

    for (const row of options.selectedRows.value) {
      for (const config of sumConfigs) {
        const column = columnsById.get(config.columnId)
        if (!column || !totalsById.has(config.columnId)) {
          continue
        }

        const rawValue = getCustomColumnValue(row, column, 'sum')
        const numericValue = typeof rawValue === 'number' ? rawValue : typeof rawValue === 'string' ? Number(rawValue) : Number.NaN

        if (!Number.isFinite(numericValue)) {
          continue
        }

        totalsById.set(config.columnId, (totalsById.get(config.columnId) ?? 0) + numericValue)
      }
    }

    return sumConfigs
      .map((config) => {
        const column = columnsById.get(config.columnId)
        if (!column) {
          return null
        }
        const sum = totalsById.get(config.columnId) ?? 0

        return {
          columnId: config.columnId,
          label: config.label ?? options.renderColumnPickerLabel(column),
          value: config.formatValue ? config.formatValue(sum) : String(sum),
        }
      })
      .filter(
        (
          item,
        ): item is {
          columnId: string
          label: string
          value: string
        } => Boolean(item),
      )
  })

  return {
    selectionPanelColumns,
    selectionPanelSums,
    clearSelectedCells,
    clearSelectedRows,
    clearAllSelection,
    clearSelectedColumns,
    copySelectedRows,
    copySelectedCells,
    copyAllSelection,
  }
}
