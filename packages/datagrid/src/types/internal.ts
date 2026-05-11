import type { Cell } from '@tanstack/vue-table'

import type { DataGridColumnAlign, DataGridCopyFormat, DataGridFilterConfig } from '../types'

export type AnyRow = Record<string, unknown>

export type FilterDialogSection = {
  id: string
  label: string
  items: DataGridFilterConfig[]
}

export type CellRenderProps = {
  table: ReturnType<Cell<AnyRow, unknown>['getContext']>['table']
  column: ReturnType<Cell<AnyRow, unknown>['getContext']>['column']
  row: ReturnType<Cell<AnyRow, unknown>['getContext']>['row']
  cell: ReturnType<Cell<AnyRow, unknown>['getContext']>['cell']
  getValue: ReturnType<Cell<AnyRow, unknown>['getContext']>['getValue']
  renderValue: ReturnType<Cell<AnyRow, unknown>['getContext']>['renderValue']
  align: DataGridColumnAlign
}

export type CellSelectionAnchor = {
  rowId: string
  columnId: string
}

export function getCellSelectionKey(rowId: string, columnId: string) {
  return `${rowId}::${columnId}`
}

export function parseDataGridCellSelectionKey(key: string) {
  const separatorIndex = key.lastIndexOf('::')
  if (separatorIndex < 0) {
    return null
  }

  const rowId = key.slice(0, separatorIndex)
  const columnId = key.slice(separatorIndex + 2)
  if (!rowId || !columnId) {
    return null
  }

  return { rowId, columnId }
}

export type SelectionPreviewMode = 'select' | 'deselect' | 'toggle' | null

export type SelectionPanelSection = {
  id: string
  label: string
  count: number
  copyLabel: string
  clearLabel: string
  onCopy: (options: { includeHeaders: boolean; format: DataGridCopyFormat }) => void | Promise<void>
  onClear: () => void
}

export type SelectedCellRow = {
  row: import('@tanstack/vue-table').Row<AnyRow>
  selectedColumnIds: Set<string>
}
