import { computed, type Ref } from 'vue'
import type { Column, ColumnFiltersState } from '@tanstack/vue-table'

import type {
  DataGridColumn,
  DataGridExcelExportConfig,
  DataGridExcelExportMode,
  DataGridFilterConfig,
  DataGridLocaleText,
  DataGridQuickFilterConfig,
} from '../types'
import type { AnyRow, FilterDialogSection } from '../types/internal'
import { toFilterGroupId } from '../utils/filters'

type UseDataGridToolbarStateOptions = {
  allLeafColumns: Ref<Column<AnyRow, unknown>[]>
  visibleColumns: Ref<Column<AnyRow, unknown>[]>
  columnFilters: Ref<ColumnFiltersState>
  globalFilter: Ref<string>
  excelExportConfig: Ref<DataGridExcelExportConfig<AnyRow>>
  localeText: Ref<Required<DataGridLocaleText>>
  toolbarFilters: () => DataGridFilterConfig[]
  quickFilters: () => DataGridQuickFilterConfig[]
  viewStorageKey: () => string
  hasSavedViewsPersistence: () => boolean
  getColumnFilterConfig: (column: Column<AnyRow, unknown>) => DataGridFilterConfig
}

const defaultExcelExportModes: DataGridExcelExportMode[] = [
  'view-all-rows',
  'view-current-page',
  'all-columns-all-rows',
  'all-columns-current-page',
]

export function useDataGridToolbarState(options: UseDataGridToolbarStateOptions) {
  const showViewsMenu = computed(() => Boolean(options.viewStorageKey()) || options.hasSavedViewsPersistence())
  const serverFilterColumns = computed(() =>
    options.allLeafColumns.value.filter((column) =>
      Boolean((column.columnDef as DataGridColumn<AnyRow>).serverField),
    ),
  )
  const toolbarFilterConfigs = computed(() => {
    const columnConfigs = options.allLeafColumns.value
      .filter((column) => {
        const columnDef = column.columnDef as DataGridColumn<AnyRow>
        const isServerColumn = Boolean(columnDef.serverField)
        return columnDef.showFilter ?? isServerColumn
      })
      .map((column) => options.getColumnFilterConfig(column))

    return [
      ...columnConfigs,
      ...options.toolbarFilters().map((config) => ({
        ...config,
        group: config.group ?? options.localeText.value.extraFiltersGroupLabel,
      })),
    ]
  })
  const filterDialogSections = computed<FilterDialogSection[]>(() => {
    const sectionMap = new Map<string, FilterDialogSection>()

    for (const config of toolbarFilterConfigs.value) {
      const groupLabel = config.group?.trim() || options.localeText.value.columnFiltersGroupLabel
      const groupId = toFilterGroupId(groupLabel)
      const section = sectionMap.get(groupId)

      if (section) {
        section.items.push(config)
        continue
      }

      sectionMap.set(groupId, {
        id: groupId,
        label: groupLabel,
        items: [config],
      })
    }

    return Array.from(sectionMap.values())
  })
  const quickFilterConfigs = computed(() => {
    const quickFilters = options.quickFilters()
    if (quickFilters.length === 0) {
      return []
    }

    const configById = new Map(toolbarFilterConfigs.value.map((config) => [config.id, config]))

    return quickFilters
      .map((quickFilter) => {
        const config = configById.get(quickFilter.id)

        if (!config) {
          return null
        }

        return {
          ...quickFilter,
          config,
        }
      })
      .filter(
        (
          quickFilter,
        ): quickFilter is DataGridQuickFilterConfig & {
          config: DataGridFilterConfig
        } => Boolean(quickFilter),
      )
  })
  const activeFilterCount = computed(() => {
    const searchFilterCount = options.globalFilter.value.trim() ? 1 : 0
    return options.columnFilters.value.length + searchFilterCount
  })
  const isExcelExportEnabled = computed(() => options.excelExportConfig.value.enabled ?? true)
  const excelExportActions = computed(() => {
    if (!isExcelExportEnabled.value) {
      return []
    }

    const labels: Record<DataGridExcelExportMode, string> = {
      'view-all-rows': options.localeText.value.exportExcelViewAllRowsLabel,
      'view-current-page': options.localeText.value.exportExcelViewCurrentPageLabel,
      'all-columns-all-rows': options.localeText.value.exportExcelAllColumnsAllRowsLabel,
      'all-columns-current-page': options.localeText.value.exportExcelAllColumnsCurrentPageLabel,
    }

    return (
      options.excelExportConfig.value.modes && options.excelExportConfig.value.modes.length > 0
        ? options.excelExportConfig.value.modes
        : defaultExcelExportModes
    ).map((mode) => ({
      mode,
      label: labels[mode],
    }))
  })
  const requestedServerColumns = computed(() => {
    const requested = new Set<string>(['id'])

    for (const column of options.visibleColumns.value) {
      const columnDef = column.columnDef as DataGridColumn<AnyRow>

      if (columnDef.serverField) {
        requested.add(columnDef.serverField)
      }

      for (const field of columnDef.requiredServerFields ?? []) {
        requested.add(field)
      }
    }

    return Array.from(requested).sort()
  })
  const requestedServerColumnsKey = computed(() => requestedServerColumns.value.join('|'))

  return {
    showViewsMenu,
    serverFilterColumns,
    toolbarFilterConfigs,
    filterDialogSections,
    quickFilterConfigs,
    activeFilterCount,
    isExcelExportEnabled,
    excelExportActions,
    requestedServerColumns,
    requestedServerColumnsKey,
  }
}
