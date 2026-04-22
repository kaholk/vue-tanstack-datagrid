import type {
  ColumnDef,
  ColumnFiltersState,
  ColumnOrderState,
  ColumnPinningState,
  ColumnSizingState,
  ColumnSort,
  HeaderContext,
  PaginationState,
  RowData,
} from '@tanstack/vue-table'

export type DataGridLocalKind = 'computed' | 'action'
export type DataGridColumnVisibilityState = Record<string, boolean>
export type DataGridColumnAlign = 'start' | 'center' | 'end'
export type DataGridHeaderMode = 'default' | 'custom'
export type DataGridFilterVariant = 'text' | 'select'
export type DataGridFilterOptionValue = string | number | null
export type DataGridFilterOption = {
  label: string
  value: DataGridFilterOptionValue
}

export type DataGridFilterConfig = {
  id: string
  label: string
  group?: string
  variant?: DataGridFilterVariant
  options?: DataGridFilterOption[]
  includeEmptyOption?: boolean
  emptyOptionLabel?: string
  placeholder?: string
}

export type DataGridQuickFilterConfig = {
  id: string
  width?: number | string
}

export type DataGridMetaKey = 'rows' | 'fetched' | 'datasetSize'

export type DataGridMetaConfig = {
  key: DataGridMetaKey
  label?: string
}

export type DataGridPageSizeConfig = {
  label?: string
  options?: number[]
}

export type DataGridHeight = number | 'auto'

export type DataGridSelectionPanelPosition =
  | 'bottom-left'
  | 'bottom-right'
  | 'top-left'
  | 'top-right'

export type DataGridSelectionPanelSumConfig = {
  columnId: string
  label?: string
  formatValue?: (value: number) => string
}

export type DataGridSelectionPanelConfig = {
  position?: DataGridSelectionPanelPosition
  sumColumns?: DataGridSelectionPanelSumConfig[]
  copyColumnIds?: string[]
  selectedRowsLabel?: string
  copyWithHeadersLabel?: string
  copyWithoutHeadersLabel?: string
}

export type DataGridColumn<TData extends RowData> = ColumnDef<TData, unknown> & {
  id: string
  serverField?: string
  localKind?: DataGridLocalKind
  requiredServerFields?: string[]
  align?: DataGridColumnAlign
  headerMode?: DataGridHeaderMode
  showFilter?: boolean
  pickerLabel?: string
  headerControl?: (context: HeaderContext<TData, unknown>) => unknown
  filterVariant?: DataGridFilterVariant
  filterGroup?: string
  filterOptions?: DataGridFilterOption[]
  filterIncludeEmptyOption?: boolean
  filterEmptyOptionLabel?: string
  filterPlaceholder?: string
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
  columnOrder?: ColumnOrderState
  columnSizing?: ColumnSizingState
  columnVisibility?: DataGridColumnVisibilityState
  columnPinning?: ColumnPinningState
  columnFilters?: ColumnFiltersState
  globalFilter?: string
}

export type DataGridSavedViewState = {
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
  serialize?: DataGridSavedViewsSerialize
  deserialize?: DataGridSavedViewsDeserialize
}
