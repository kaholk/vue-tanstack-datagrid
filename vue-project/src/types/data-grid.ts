import type {
  ColumnDef,
  ColumnFiltersState,
  ColumnPinningState,
  ColumnSort,
  PaginationState,
  RowData,
} from '@tanstack/vue-table'

export type DataGridLocalKind = 'computed' | 'action'
export type DataGridColumnVisibilityState = Record<string, boolean>
export type DataGridColumnAlign = 'start' | 'center' | 'end'
export type DataGridHeaderMode = 'default' | 'custom'

export type DataGridColumn<TData extends RowData> = ColumnDef<TData, unknown> & {
  id: string
  serverField?: string
  localKind?: DataGridLocalKind
  requiredServerFields?: string[]
  align?: DataGridColumnAlign
  headerMode?: DataGridHeaderMode
  showFilter?: boolean
  pickerLabel?: string
}

export type DataGridFetchParams = {
  pageIndex: number
  pageSize: number
  sorting: ColumnSort[]
  filters: ColumnFiltersState
  search?: string
  include_columns?: string[]
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
  columnVisibility?: DataGridColumnVisibilityState
  columnPinning?: ColumnPinningState
  columnFilters?: ColumnFiltersState
  globalFilter?: string
}
