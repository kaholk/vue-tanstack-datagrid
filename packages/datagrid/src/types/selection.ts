import type { RowData } from '@tanstack/vue-table'

import type { DataGridColumn } from './columns'
import type { DataGridRowId } from './core'

export type DataGridSelectionPanelPosition = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' | 'floating'
export type DataGridCopyFormat = 'html' | 'text'

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
  copyFormat?: DataGridCopyFormat
  selectedRowsLabel?: string
  copyWithHeadersLabel?: string
  copyWithoutHeadersLabel?: string
  allowPositionChange?: boolean
  positionStorageKey?: string
  floatingPosition?: DataGridFloatingPosition
}

export type DataGridRowSelectionConfig<TData extends RowData> = {
  enabled?: boolean
  preset?: 'default' | 'compact-left' | 'compact-right'
  columnId?: string
  defaultPin?: 'left' | 'right' | false
  column?: Partial<DataGridColumn<TData>>
}

export type DataGridCellSelectionConfig = {
  enabled?: boolean
}
