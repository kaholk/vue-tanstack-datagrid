import type { Cell, ColumnDef, ColumnFiltersState, HeaderContext, Row, RowData } from '@tanstack/vue-table'

import type { DataGridColumnAlign, DataGridExcelExportFormat, DataGridHeaderMode } from './core'

export type DataGridLocalKind = 'computed' | 'action'
export type DataGridFilterVariant = 'text' | 'select' | 'radio'
export type DataGridFilterOptionValue = string | number | null
export type DataGridFilterOption = {
  label: string
  value: DataGridFilterOptionValue
}

export type DataGridFilterOptionsResolver = (context: { columnFilters: ColumnFiltersState; draftColumnFilters: ColumnFiltersState }) => DataGridFilterOption[]

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

export type DataGridRowActionContext<TData extends RowData = RowData> = {
  row: TData
  event: MouseEvent
}

export type DataGridRowAction<TData extends RowData = RowData> = {
  id: string
  title: string
  ariaLabel?: string
  icon: (context: Omit<DataGridRowActionContext<TData>, 'event'>) => unknown
  class?: string | Array<string | Record<string, boolean>> | Record<string, boolean> | ((context: Omit<DataGridRowActionContext<TData>, 'event'>) => string | Array<string | Record<string, boolean>> | Record<string, boolean>)
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
  exportable?: boolean
  exportHeader?: string
  exportValue?: (context: DataGridValueContext<TData>) => unknown
  exportFormat?: DataGridExcelExportFormat
  exportWidth?: number
  exportAlign?: DataGridColumnAlign
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
