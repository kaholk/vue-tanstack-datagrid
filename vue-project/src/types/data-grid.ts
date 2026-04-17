import type {
  ColumnDef,
  ColumnFiltersState,
  ColumnPinningState,
  ColumnSort,
  ColumnVisibilityState,
  PaginationState,
  RowData,
} from '@tanstack/vue-table'

export type DataGridLocalKind = 'computed' | 'action'

export type DataGridColumn<TData extends RowData> = ColumnDef<TData, unknown> & {
  id: string
  serverField?: string
  localKind?: DataGridLocalKind
}

export type DataGridFetchParams = {
  pageIndex: number
  pageSize: number
  sorting: ColumnSort[]
  filters: ColumnFiltersState
  search?: string
}

export type DataGridFetchResult<TData> = {
  rows: TData[]
  totalRows: number
  pageCount: number
  meta?: Record<string, unknown>
}

export type DataGridInitialState = {
  pagination?: PaginationState
  sorting?: ColumnSort[]
  columnVisibility?: ColumnVisibilityState
  columnPinning?: ColumnPinningState
  columnFilters?: ColumnFiltersState
  globalFilter?: string
}
