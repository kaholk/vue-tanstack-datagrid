import type {
  ColumnDef,
  ColumnFiltersState,
  ColumnOrderState,
  ColumnPinningState,
  ColumnSizingState,
  ColumnSort,
  Cell,
  HeaderContext,
  PaginationState,
  Row,
  RowData,
} from '@tanstack/vue-table'

export type DataGridLocalKind = 'computed' | 'action'
export type DataGridColumnVisibilityState = Record<string, boolean>
export type DataGridColumnAlign = 'start' | 'center' | 'end'
export type DataGridHeaderMode = 'default' | 'custom'
export type DataGridFilterVariant = 'text' | 'select' | 'radio'
export type DataGridFilterOptionValue = string | number | null
export type DataGridFilterOption = {
  label: string
  value: DataGridFilterOptionValue
}

export type DataGridFilterOptionsResolver = (context: {
  columnFilters: ColumnFiltersState
  draftColumnFilters: ColumnFiltersState
}) => DataGridFilterOption[]

export type DataGridCellContext<TData extends RowData> = {
  cell: Cell<TData, unknown>
  row: Row<TData>
  event: MouseEvent
}

export type DataGridValueContext<TData extends RowData> = Omit<DataGridCellContext<TData>, 'event'>

export type DataGridFilterConfig = {
  id: string
  label: string
  group?: string
  variant?: DataGridFilterVariant
  textFallback?: boolean
  valueSeparator?: string
  options?: DataGridFilterOption[]
  optionsResolver?: DataGridFilterOptionsResolver
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

export type DataGridHeight = number | 'fill'

export type DataGridLoadingVariant = 'none' | 'overlay'

export type DataGridLoadingConfig = {
  variant?: DataGridLoadingVariant
  label?: string
}

export type DataGridInlineEditStatusState = 'pending' | 'error'

export type DataGridSelectionPanelPosition =
  | 'bottom-left'
  | 'bottom-right'
  | 'top-left'
  | 'top-right'
  | 'floating'

export type DataGridFloatingPosition = {
  x: number
  y: number
}

export type DataGridSelectionPanelSumConfig = {
  columnId: string
  label?: string
  formatValue?: (value: number) => string
}

export type DataGridSelectionPanelActionContext<TData extends RowData = RowData> = {
  selectedRows: TData[]
  selectedRowIds: DataGridRowId[]
  clearSelection: () => void
}

export type DataGridSelectionPanelAction<TData extends RowData = RowData> = {
  id: string
  label: string
  title?: string
  hidden?: boolean | ((context: DataGridSelectionPanelActionContext<TData>) => boolean)
  disabled?: boolean | ((context: DataGridSelectionPanelActionContext<TData>) => boolean)
  onClick: (context: DataGridSelectionPanelActionContext<TData>) => void | Promise<void>
}

export type DataGridSelectionPanelConfig<TData extends RowData = RowData> = {
  position?: DataGridSelectionPanelPosition
  sumColumns?: DataGridSelectionPanelSumConfig[]
  actions?: DataGridSelectionPanelAction<TData>[]
  copyColumnIds?: string[]
  copyIncludeHeaders?: boolean
  selectedRowsLabel?: string
  copyWithHeadersLabel?: string
  copyWithoutHeadersLabel?: string
  allowPositionChange?: boolean
  positionStorageKey?: string
  floatingPosition?: DataGridFloatingPosition
}

export type DataGridLocaleText = {
  rowsLabel?: string
  fetchedLabel?: string
  datasetLabel?: string
  pageSizeLabel?: string
  selectedRowsLabel?: string
  selectedRowsTotalLabel?: string
  selectedColumnsLabel?: string
  selectedCellsLabel?: string
  copyRowsLabel?: string
  copyColumnsLabel?: string
  copyCellsLabel?: string
  copyAllLabel?: string
  copyWithHeadersLabel?: string
  copyWithoutHeadersLabel?: string
  loadingLabel?: string
  fetchErrorMessage?: string
  columnFiltersGroupLabel?: string
  extraFiltersGroupLabel?: string
  filterPlaceholder?: string
  noFilterableColumnsMessage?: string
}

export type DataGridRowSelectionConfig<TData extends RowData> = {
  enabled?: boolean
  preset?: 'default' | 'compact-left' | 'compact-right'
  columnId?: string
  defaultPin?: 'left' | 'right' | false
  column?: Partial<DataGridColumn<TData>>
}

export type DataGridRowActionContext<TData extends RowData = RowData> = {
  row: TData
  event: MouseEvent
}

export type DataGridRowAction<TData extends RowData = RowData> = {
  id: string
  title: string
  ariaLabel?: string
  icon: (context: Omit<DataGridRowActionContext<TData>, 'event'>) => unknown
  class?: string | Array<string | Record<string, boolean>> | Record<string, boolean>
  disabled?: boolean | ((context: Omit<DataGridRowActionContext<TData>, 'event'>) => boolean)
  onClick: (context: DataGridRowActionContext<TData>) => void | Promise<void>
}

export type DataGridStepQuantityEditorLocaleText = {
  doneLabel?: string
  noneLabel?: string
  blockedLabel?: string
  quantityLabel?: string
  cancelLabel?: string
  saveQuantityLabel?: string
}

export type DataGridColumn<TData extends RowData> = ColumnDef<TData, unknown> & {
  id: string
  serverField?: string
  localKind?: DataGridLocalKind
  requiredServerFields?: string[]
  clipboardValue?: (context: DataGridValueContext<TData>) => unknown
  clipboardFormat?: (value: unknown, context: DataGridValueContext<TData>) => string
  sumValue?: (context: DataGridValueContext<TData>) => unknown
  align?: DataGridColumnAlign
  headerMode?: DataGridHeaderMode
  showFilter?: boolean
  pickerLabel?: string
  headerControl?: (context: HeaderContext<TData, unknown>) => unknown
  filterVariant?: DataGridFilterVariant
  filterTextFallback?: boolean
  filterValueSeparator?: string
  filterGroup?: string
  filterOptions?: DataGridFilterOption[] | DataGridFilterOptionsResolver
  filterIncludeEmptyOption?: boolean
  filterEmptyOptionLabel?: string
  filterPlaceholder?: string
  cellClass?: string | ((context: Omit<DataGridCellContext<TData>, 'event'>) => string)
  onCellClick?: (context: DataGridCellContext<TData>) => void
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

export type DataGridRowId = string | number

export type DataGridInstance<TData extends RowData = RowData> = {
  refreshData: () => void
  patchRow: (rowId: DataGridRowId, patch: Partial<TData>) => void
  replaceRow: (rowId: DataGridRowId, row: TData) => void
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
