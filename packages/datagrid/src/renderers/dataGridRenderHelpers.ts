import type { CSSProperties, Ref } from 'vue'
import type { Cell, Column } from '@tanstack/vue-table'

import type { DataGridColumn } from '../types'
import type { AnyRow, CellRenderProps } from '../types/internal'
import { renderFlexibleContent } from '../utils/render'

export function renderDataGridColumnPickerLabel(column: Column<AnyRow, unknown>) {
  const columnDef = column.columnDef as DataGridColumn<AnyRow>

  if (columnDef.pickerLabel) {
    return columnDef.pickerLabel
  }

  if (typeof column.columnDef.header === 'string') {
    return column.columnDef.header
  }

  return column.id
}

export function renderDataGridCell(cell: Cell<AnyRow, unknown>) {
  const columnDef = cell.column.columnDef as DataGridColumn<AnyRow>
  const context = cell.getContext()
  const renderProps: CellRenderProps = {
    table: context.table,
    column: context.column,
    row: context.row,
    cell: context.cell,
    getValue: context.getValue,
    renderValue: context.renderValue,
    align: columnDef.align ?? 'start',
  }

  return renderFlexibleContent(cell.column.columnDef.cell, renderProps as Record<string, unknown>)
}

export function getDataGridColumnMenuStyle(options: {
  column: Column<AnyRow, unknown>
  visibleColumns: Ref<Column<AnyRow, unknown>[]>
  visibleColumnIndexById: Ref<Map<string, number>>
  getPinnedSide: (columnId: string) => 'left' | 'right' | false
}): CSSProperties {
  const pinnedSide = options.getPinnedSide(options.column.id)

  if (pinnedSide === 'left') {
    return {
      left: '0',
      right: 'auto',
    }
  }

  if (pinnedSide === 'right') {
    return {
      left: 'auto',
      right: '0',
    }
  }

  const columnIndex = options.visibleColumnIndexById.value.get(options.column.id) ?? -1
  const visibleCount = options.visibleColumns.value.length
  const isNearRightEdge = columnIndex >= Math.max(visibleCount - 2, 0)

  if (isNearRightEdge) {
    return {
      left: 'auto',
      right: '0',
    }
  }

  return {
    left: '0',
    right: 'auto',
  }
}
