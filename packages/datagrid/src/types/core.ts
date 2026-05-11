import type { ColumnFiltersState, ColumnOrderState, ColumnPinningState, ColumnSizingState, ColumnSort, PaginationState, RowData } from '@tanstack/vue-table'

export type DataGridColumnVisibilityState = Record<string, boolean>
export type DataGridColumnAlign = 'start' | 'center' | 'end'
export type DataGridHeaderMode = 'default' | 'custom'
export type DataGridMetaKey = 'rows' | 'fetched' | 'datasetSize'
export type DataGridHeight = number | 'fill'
export type DataGridLocale = 'en' | 'pl'
export type DataGridLoadingVariant = 'none' | 'overlay'
export type DataGridInlineEditStatusState = 'pending' | 'error'
export type DataGridRowId = string | number
export type DataGridRowIdResolver<TData extends RowData = RowData> = (row: TData, index: number) => DataGridRowId
export type DataGridExcelExportMode =
  | 'view-all-rows'
  | 'view-current-page'
  | 'all-columns-all-rows'
  | 'all-columns-current-page'
export type DataGridExcelExportFormat =
  | 'text'
  | 'number'
  | 'accounting'
  | 'date'
  | 'datetime'
  | { numFmt: string }

export type DataGridExcelCellStyle = {
  font?: Record<string, unknown>
  fill?: Record<string, unknown>
  alignment?: Record<string, unknown>
  border?: Record<string, unknown>
}

export type DataGridExcelExportStyles = {
  header?: DataGridExcelCellStyle
  data?: DataGridExcelCellStyle
}

export type DataGridExcelExportContext = {
  mode: DataGridExcelExportMode
  rowCount: number
  columnCount: number
}

export type DataGridExcelExportConfig<TData extends RowData = RowData> = {
  enabled?: boolean
  fileName?: string | ((context: DataGridExcelExportContext) => string)
  sheetName?: string
  pageSize?: number
  maxRows?: number
  useWorker?: boolean
  valueBatchSize?: number
  modes?: DataGridExcelExportMode[]
  styles?: DataGridExcelExportStyles
  autoFilter?: boolean
  freezeHeader?: boolean
  includeActionColumns?: boolean
  onError?: (error: unknown) => void
}

export type DataGridMetaConfig = {
  key: DataGridMetaKey
  label?: string
}

export type DataGridPageSizeConfig = {
  label?: string
  options?: number[]
}

export type DataGridLoadingConfig = {
  variant?: DataGridLoadingVariant
  label?: string
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
  copyFormatLabel?: string
  copyFormatHtmlLabel?: string
  copyFormatTextLabel?: string
  loadingLabel?: string
  fetchErrorMessage?: string
  columnFiltersGroupLabel?: string
  extraFiltersGroupLabel?: string
  filterPlaceholder?: string
  noFilterableColumnsMessage?: string
  exportExcelLabel?: string
  exportExcelViewAllRowsLabel?: string
  exportExcelViewCurrentPageLabel?: string
  exportExcelAllColumnsAllRowsLabel?: string
  exportExcelAllColumnsCurrentPageLabel?: string
  exportExcelErrorMessage?: string
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

export type DataGridRowPatchKeyList<TData extends RowData = RowData> =
  | boolean
  | Array<Extract<keyof TData, string>>

export type DataGridRowPatchOptions<TData extends RowData = RowData> = {
  preserveMissingKeys?: DataGridRowPatchKeyList<TData>
}

export type DataGridInstance<TData extends RowData = RowData> = {
  refreshData: () => void
  exportExcel: (
    mode: DataGridExcelExportMode,
    overrides?: Partial<DataGridExcelExportConfig<TData>>,
  ) => Promise<void>
  patchRow: (
    rowId: DataGridRowId,
    patch: Partial<TData>,
    options?: DataGridRowPatchOptions<TData>,
  ) => TData | null
  patchRows: (
    patches: Array<{ rowId: DataGridRowId; patch: Partial<TData> }>,
    options?: DataGridRowPatchOptions<TData>,
  ) => TData[]
  updateRow: (rowId: DataGridRowId, updater: (row: TData) => TData) => TData | null
  replaceRow: (rowId: DataGridRowId, row: TData) => TData | null
  getRow: (rowId: DataGridRowId) => TData | null
  getVisibleRows: () => TData[]
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
