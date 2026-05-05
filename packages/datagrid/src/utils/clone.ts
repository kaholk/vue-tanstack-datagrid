import type { ColumnFiltersState, ColumnPinningState } from '@tanstack/vue-table'

import type { DataGridSavedViewState } from '../types'

export function cloneViewState(state: DataGridSavedViewState): DataGridSavedViewState {
  return {
    pagination: state.pagination ? { ...state.pagination } : undefined,
    columnOrder: [...state.columnOrder],
    columnSizing: { ...state.columnSizing },
    columnVisibility: { ...state.columnVisibility },
    columnPinning: {
      left: [...(state.columnPinning.left ?? [])],
      right: [...(state.columnPinning.right ?? [])],
    },
    columnFilters: state.columnFilters.map((filter) => ({
      id: filter.id,
      value: Array.isArray(filter.value) ? [...filter.value] : filter.value,
    })),
    globalFilter: state.globalFilter,
  }
}

export function cloneColumnFilters(filters: ColumnFiltersState): ColumnFiltersState {
  return filters.map((filter) => ({
    id: filter.id,
    value: Array.isArray(filter.value) ? [...filter.value] : filter.value,
  }))
}

export function cloneColumnPinningState(state: ColumnPinningState): ColumnPinningState {
  return {
    left: [...(state.left ?? [])],
    right: [...(state.right ?? [])],
  }
}
