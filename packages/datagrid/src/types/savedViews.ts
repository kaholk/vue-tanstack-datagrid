import type { ColumnFiltersState, ColumnOrderState, ColumnPinningState, ColumnSizingState, PaginationState } from '@tanstack/vue-table'

import type { DataGridColumnVisibilityState } from './core'

export type DataGridSavedViewState = {
  pagination?: PaginationState
  columnOrder: ColumnOrderState
  columnSizing: ColumnSizingState
  columnVisibility: DataGridColumnVisibilityState
  columnPinning: ColumnPinningState
  columnFilters: ColumnFiltersState
  globalFilter: string
}

export type DataGridSavedView = {
  id: string
  name: string
  state: DataGridSavedViewState
  createdAt: string
  updatedAt: string
}

export type DataGridSavedViewsSerialize = (views: DataGridSavedView[]) => unknown
export type DataGridSavedViewsDeserialize = (payload: unknown) => DataGridSavedView[]

export type DataGridSavedViewsPersistence = {
  load: () => Promise<unknown>
  save: (payload: unknown, views: DataGridSavedView[]) => Promise<void>
  loadLastSelectedViewId?: () => Promise<string | null | undefined>
  saveLastSelectedViewId?: (viewId: string) => Promise<void>
  serialize?: DataGridSavedViewsSerialize
  deserialize?: DataGridSavedViewsDeserialize
}
