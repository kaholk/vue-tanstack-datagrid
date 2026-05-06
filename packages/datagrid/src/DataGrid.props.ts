import type { PropType } from 'vue'

import type {
  DataGridCellSelectionConfig,
  DataGridColumn,
  DataGridExcelExportConfig,
  DataGridFetchParams,
  DataGridFetchResult,
  DataGridFilterConfig,
  DataGridHeight,
  DataGridInitialState,
  DataGridLoadingConfig,
  DataGridLocale,
  DataGridLocaleText,
  DataGridMetaConfig,
  DataGridPageSizeConfig,
  DataGridPreset,
  DataGridQuickFilterConfig,
  DataGridRowIdResolver,
  DataGridRowPatchOptions,
  DataGridRowSelectionConfig,
  DataGridSavedViewsPersistence,
  DataGridSelectionPanelConfig,
} from './types'

export const dataGridProps = {
  columns: {
    type: Array as PropType<DataGridColumn<any>[]>,
    required: true,
  },
  toolbarFilters: {
    type: Array as PropType<DataGridFilterConfig[]>,
    default: () => [],
  },
  quickFilters: {
    type: Array as PropType<DataGridQuickFilterConfig[]>,
    default: () => [],
  },
  fetchPage: {
    type: Function as PropType<(params: DataGridFetchParams, signal?: AbortSignal) => Promise<DataGridFetchResult<any>>>,
    required: true,
  },
  rowId: {
    type: Function as PropType<DataGridRowIdResolver<any> | undefined>,
    default: undefined,
  },
  locale: {
    type: String as PropType<DataGridLocale | undefined>,
    default: undefined,
  },
  preset: {
    type: Object as PropType<DataGridPreset<any> | undefined>,
    default: undefined,
  },
  initialState: {
    type: Object as PropType<DataGridInitialState | undefined>,
    default: undefined,
  },
  rowHeight: {
    type: Number as PropType<number | undefined>,
    default: undefined,
  },
  overscanRows: {
    type: Number as PropType<number | undefined>,
    default: undefined,
  },
  overscanColumns: {
    type: Number as PropType<number | undefined>,
    default: undefined,
  },
  fetchDebounceMs: {
    type: Number as PropType<number | undefined>,
    default: undefined,
  },
  resetPageOnFilterChange: {
    type: Boolean as PropType<boolean | undefined>,
    default: undefined,
  },
  refetchOnVisibleColumnsChange: {
    type: Boolean as PropType<boolean | undefined>,
    default: undefined,
  },
  keepRowsOnError: {
    type: Boolean as PropType<boolean | undefined>,
    default: undefined,
  },
  height: {
    type: [Number, String] as PropType<DataGridHeight | -1 | undefined>,
    default: undefined,
  },
  loadingConfig: {
    type: Object as PropType<DataGridLoadingConfig | undefined>,
    default: undefined,
  },
  localeText: {
    type: Object as PropType<DataGridLocaleText | undefined>,
    default: undefined,
  },
  viewStorageKey: {
    type: String,
    default: '',
  },
  savedViewsPersistence: {
    type: Object as PropType<DataGridSavedViewsPersistence | undefined>,
    default: undefined,
  },
  metaItems: {
    type: Array as PropType<DataGridMetaConfig[] | undefined>,
    default: undefined,
  },
  pageSizeConfig: {
    type: Object as PropType<DataGridPageSizeConfig | undefined>,
    default: undefined,
  },
  selectionPanelConfig: {
    type: Object as PropType<DataGridSelectionPanelConfig<any> | undefined>,
    default: undefined,
  },
  rowSelectionConfig: {
    type: Object as PropType<DataGridRowSelectionConfig<any> | undefined>,
    default: undefined,
  },
  cellSelectionConfig: {
    type: Object as PropType<DataGridCellSelectionConfig | undefined>,
    default: undefined,
  },
  excelExport: {
    type: [Object, Boolean] as PropType<false | DataGridExcelExportConfig<any> | undefined>,
    default: undefined,
  },
  rowPatchConfig: {
    type: Object as PropType<DataGridRowPatchOptions<any> | undefined>,
    default: undefined,
  },
} as const
