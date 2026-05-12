import type { RowData } from '@tanstack/vue-table'

import type {
  DataGridClearFiltersState,
  DataGridExcelExportConfig,
  DataGridInitialState,
  DataGridLocale,
  DataGridLocaleText,
  DataGridLoadingConfig,
  DataGridMetaConfig,
  DataGridPageSizeConfig,
  DataGridRowPatchOptions,
} from './core'
import type {
  DataGridCellSelectionConfig,
  DataGridRowSelectionConfig,
  DataGridSelectionPanelConfig,
} from './selection'

export type DataGridPreset<TData extends RowData = RowData> = {
  locale?: DataGridLocale
  localeText?: DataGridLocaleText
  initialState?: DataGridInitialState
  clearFiltersState?: DataGridClearFiltersState
  pageSizeConfig?: DataGridPageSizeConfig
  metaItems?: DataGridMetaConfig[]
  loadingConfig?: DataGridLoadingConfig
  selectionPanelConfig?: DataGridSelectionPanelConfig<TData>
  rowSelectionConfig?: DataGridRowSelectionConfig<TData>
  cellSelectionConfig?: DataGridCellSelectionConfig
  excelExport?: false | DataGridExcelExportConfig<TData>
  height?: number | 'fill'
  rowHeight?: number
  overscanRows?: number
  overscanColumns?: number
  fetchDebounceMs?: number
  resetPageOnFilterChange?: boolean
  refetchOnVisibleColumnsChange?: boolean
  keepRowsOnError?: boolean
  rowPatchConfig?: DataGridRowPatchOptions<TData>
}
