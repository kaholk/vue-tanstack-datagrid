import type { ColumnOrderState, ColumnPinningState } from '@tanstack/vue-table'

import type { DataGridColumn, DataGridColumnAlign } from '../types'

type AnyRow = Record<string, unknown>

export function normalizeColumnSize<TData extends AnyRow>(column: DataGridColumn<TData>): DataGridColumn<TData> {
  if (typeof column.size !== 'number') {
    return column
  }

  return {
    ...column,
    minSize: column.size,
    maxSize: column.size,
  }
}

export function getFixedColumnSize<TData extends AnyRow>(column?: Partial<DataGridColumn<TData>>): number | null {
  return typeof column?.size === 'number' ? column.size : null
}

export function appendMissingColumnId(columnOrder: ColumnOrderState, columnId: string): ColumnOrderState {
  if (columnOrder.includes(columnId)) {
    return [...columnOrder]
  }

  return [columnId, ...columnOrder]
}

export function appendMissingPinnedColumnId(columnPinning: ColumnPinningState, columnId: string, defaultPin: 'left' | 'right' | false): ColumnPinningState {
  const left = [...(columnPinning.left ?? [])]
  const right = [...(columnPinning.right ?? [])]

  if (left.includes(columnId) || right.includes(columnId) || !defaultPin) {
    return { left, right }
  }

  if (defaultPin === 'left') {
    return {
      left: [columnId, ...left],
      right,
    }
  }

  return {
    left,
    right: [columnId, ...right],
  }
}

export function toJustifyContent(align?: DataGridColumnAlign) {
  if (align === 'center') {
    return 'center'
  }

  if (align === 'end') {
    return 'flex-end'
  }

  return 'flex-start'
}
