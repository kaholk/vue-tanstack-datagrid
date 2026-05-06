import { computed } from 'vue'

import { defaultDataGridLoadingConfig, defaultDataGridMetaItems, defaultDataGridPageSizeConfig } from '../dataGridDefaults'
import { resolveDataGridLocaleText } from '../locales'
import type {
  DataGridCellSelectionConfig,
  DataGridExcelExportConfig,
  DataGridHeight,
  DataGridInitialState,
  DataGridLoadingConfig,
  DataGridLocale,
  DataGridLocaleText,
  DataGridMetaConfig,
  DataGridPageSizeConfig,
  DataGridPreset,
  DataGridRowPatchOptions,
  DataGridRowSelectionConfig,
  DataGridSelectionPanelConfig,
} from '../types'
import type { AnyRow } from '../types/internal'

type DataGridEffectiveConfigProps = {
  locale?: DataGridLocale
  preset?: DataGridPreset<any>
  initialState?: DataGridInitialState
  metaItems?: DataGridMetaConfig[]
  pageSizeConfig?: DataGridPageSizeConfig
  loadingConfig?: DataGridLoadingConfig
  selectionPanelConfig?: DataGridSelectionPanelConfig<any>
  rowSelectionConfig?: DataGridRowSelectionConfig<any>
  cellSelectionConfig?: DataGridCellSelectionConfig
  excelExport?: false | DataGridExcelExportConfig<any>
  rowPatchConfig?: DataGridRowPatchOptions<any>
  height?: DataGridHeight | -1
  rowHeight?: number
  overscanRows?: number
  overscanColumns?: number
  fetchDebounceMs?: number
  resetPageOnFilterChange?: boolean
  refetchOnVisibleColumnsChange?: boolean
  keepRowsOnError?: boolean
  localeText?: DataGridLocaleText
}

export function useDataGridEffectiveConfig(props: DataGridEffectiveConfigProps) {
  const preset = computed<DataGridPreset<AnyRow>>(() => (props.preset ?? {}) as DataGridPreset<AnyRow>)
  const effectiveLocale = computed<DataGridLocale>(() => props.locale ?? preset.value.locale ?? 'en')
  const localeText = computed<Required<DataGridLocaleText>>(() => ({
    ...resolveDataGridLocaleText(effectiveLocale.value, preset.value.localeText),
    ...(props.localeText ?? {}),
  }))
  const effectiveInitialState = computed<DataGridInitialState>(() => ({
    ...(preset.value.initialState ?? {}),
    ...(props.initialState ?? {}),
  }))
  const effectiveMetaItems = computed<DataGridMetaConfig[]>(() => {
    const items = props.metaItems ?? preset.value.metaItems ?? defaultDataGridMetaItems
    return items.map((item) => ({ ...item }))
  })
  const effectivePageSizeConfig = computed<DataGridPageSizeConfig>(() => ({
    ...defaultDataGridPageSizeConfig,
    ...(preset.value.pageSizeConfig ?? {}),
    ...(props.pageSizeConfig ?? {}),
  }))
  const effectiveLoadingConfigInput = computed<DataGridLoadingConfig>(() => ({
    ...(preset.value.loadingConfig ?? {}),
    ...(props.loadingConfig ?? {}),
  }))
  const effectiveSelectionPanelConfig = computed<DataGridSelectionPanelConfig<AnyRow> | undefined>(() =>
    (props.selectionPanelConfig ?? preset.value.selectionPanelConfig) as DataGridSelectionPanelConfig<AnyRow> | undefined,
  )
  const effectiveRowSelectionConfig = computed<DataGridRowSelectionConfig<AnyRow> | undefined>(() =>
    (props.rowSelectionConfig ?? preset.value.rowSelectionConfig) as DataGridRowSelectionConfig<AnyRow> | undefined,
  )
  const effectiveCellSelectionConfig = computed<DataGridCellSelectionConfig | undefined>(() => props.cellSelectionConfig ?? preset.value.cellSelectionConfig)
  const effectiveExcelExportInput = computed<false | DataGridExcelExportConfig<AnyRow> | undefined>(() =>
    (props.excelExport ?? preset.value.excelExport) as false | DataGridExcelExportConfig<AnyRow> | undefined,
  )
  const effectiveRowPatchConfig = computed<DataGridRowPatchOptions<AnyRow>>(() => ({
    ...((preset.value.rowPatchConfig ?? {}) as DataGridRowPatchOptions<AnyRow>),
    ...((props.rowPatchConfig ?? {}) as DataGridRowPatchOptions<AnyRow>),
  }))
  const effectiveHeight = computed<DataGridHeight | -1>(() => props.height ?? preset.value.height ?? 560)
  const effectiveRowHeight = computed(() => props.rowHeight ?? preset.value.rowHeight ?? 42)
  const effectiveOverscanRows = computed(() => props.overscanRows ?? preset.value.overscanRows ?? 10)
  const effectiveOverscanColumns = computed(() => props.overscanColumns ?? preset.value.overscanColumns ?? 3)
  const effectiveFetchDebounceMs = computed(() => props.fetchDebounceMs ?? preset.value.fetchDebounceMs ?? 180)
  const effectiveResetPageOnFilterChange = computed(() => props.resetPageOnFilterChange ?? preset.value.resetPageOnFilterChange ?? true)
  const effectiveRefetchOnVisibleColumnsChange = computed(() => props.refetchOnVisibleColumnsChange ?? preset.value.refetchOnVisibleColumnsChange ?? true)
  const effectiveKeepRowsOnError = computed(() => props.keepRowsOnError ?? preset.value.keepRowsOnError ?? false)
  const mergedLoadingConfig = computed<DataGridLoadingConfig>(() => ({
    variant: effectiveLoadingConfigInput.value.variant ?? defaultDataGridLoadingConfig.variant,
    label: effectiveLoadingConfigInput.value.label ?? localeText.value.loadingLabel,
  }))
  const isCellSelectionEnabled = computed(() => effectiveCellSelectionConfig.value?.enabled ?? true)

  return {
    preset,
    effectiveLocale,
    localeText,
    effectiveInitialState,
    effectiveMetaItems,
    effectivePageSizeConfig,
    effectiveLoadingConfigInput,
    effectiveSelectionPanelConfig,
    effectiveRowSelectionConfig,
    effectiveCellSelectionConfig,
    effectiveExcelExportInput,
    effectiveRowPatchConfig,
    effectiveHeight,
    effectiveRowHeight,
    effectiveOverscanRows,
    effectiveOverscanColumns,
    effectiveFetchDebounceMs,
    effectiveResetPageOnFilterChange,
    effectiveRefetchOnVisibleColumnsChange,
    effectiveKeepRowsOnError,
    mergedLoadingConfig,
    isCellSelectionEnabled,
  }
}
