import { computed, defineComponent, onBeforeUnmount, onMounted, ref, shallowRef, watch, type PropType } from 'vue'
import { getCoreRowModel, useVueTable, type Column, type ColumnFiltersState, type ColumnOrderState, type ColumnPinningState, type ColumnSizingState, type ColumnSort, type PaginationState, type Row, type RowSelectionState } from '@tanstack/vue-table'

import DataGridBodyRow from './components/DataGridBodyRow'
import DataGridDialog from './components/DataGridDialog'
import DataGridColumnPickerDialog from './components/DataGridColumnPickerDialog'
import DataGridFooter from './components/DataGridFooter'
import DataGridFilterDialog from './components/DataGridFilterDialog'
import DataGridHelpDialog from './components/DataGridHelpDialog'
import DataGridHeaderCell from './components/DataGridHeaderCell'
import DataGridSaveViewDialog from './components/DataGridSaveViewDialog'
import DataGridSelectionPanel from './components/DataGridSelectionPanel'
import DataGridToolbar from './components/DataGridToolbar'
import { useDataGridClipboard } from './composables/useDataGridClipboard'
import { useDataGridCellSelection } from './composables/useDataGridCellSelection'
import { useDataGridColumnPicker } from './composables/useDataGridColumnPicker'
import { useDataGridDataLoading } from './composables/useDataGridDataLoading'
import { useDataGridExcelExport } from './composables/useDataGridExcelExport'
import { useDataGridFilters } from './composables/useDataGridFilters'
import { useDataGridRows, type DataGridRequestState } from './composables/useDataGridRows'
import { useDataGridRowSelection } from './composables/useDataGridRowSelection'
import { useDataGridSavedViews } from './composables/useDataGridSavedViews'
import { useDataGridSelectionPanel, useDataGridSelectionPanelSections } from './composables/useDataGridSelectionPanel'
import { useDataGridToolbarState } from './composables/useDataGridToolbarState'
import { useDataGridVirtualization } from './composables/useDataGridVirtualization'
import { buildDataGridRowSelectionColumn, defaultRowSelectionColumnId, defaultRowSelectionPreset } from './composables/useDataGridRowSelectionColumn'
import { dataGridHeaderHeight, defaultDataGridLoadingConfig, defaultDataGridMetaItems, defaultDataGridPageSizeConfig } from './dataGridDefaults'
import { resolveDataGridLocaleText } from './locales'
import { getDataGridColumnMenuStyle, renderDataGridCell, renderDataGridColumnPickerLabel } from './renderers/dataGridRenderHelpers'
import type { AnyRow } from './types/internal'
import type { DataGridCellSelectionConfig, DataGridColumn, DataGridExcelExportConfig, DataGridExcelExportMode, DataGridFilterConfig, DataGridQuickFilterConfig, DataGridColumnVisibilityState, DataGridFetchParams, DataGridFetchResult, DataGridInitialState, DataGridHeight, DataGridLoadingConfig, DataGridLocale, DataGridMetaConfig, DataGridPageSizeConfig, DataGridPreset, DataGridRowIdResolver, DataGridRowSelectionConfig, DataGridSavedViewsPersistence, DataGridSelectionPanelConfig, DataGridLocaleText, DataGridRowPatchOptions } from './types'
import { appendMissingColumnId, appendMissingPinnedColumnId, getFixedColumnSize, normalizeColumnSize } from './utils/columns'
import { cloneColumnFilters, cloneColumnPinningState, cloneViewState } from './utils/clone'
import { toNumber } from './utils/number'
import { buildPaginationItems } from './utils/pagination'
import { createViewId } from './utils/savedViews'

export default defineComponent({
  name: 'DataGrid',
  props: {
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
  },
  setup(props, { expose, slots }) {
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
    const {
      lastSelectedRowId,
      previewSelectionRowIds,
      rowSelectionPreviewMode,
      clearRowSelectionPreview,
      resetRowSelectionAnchor,
      setRowSelectionPreview,
      toggleRowSelectionRange,
    } = useDataGridRowSelection()
    const mergedRowSelectionConfig = computed<DataGridRowSelectionConfig<AnyRow> | null>(() => {
      const config = effectiveRowSelectionConfig.value
      if (!config?.enabled) {
        return null
      }

      const preset = config.preset ?? defaultRowSelectionPreset

      return {
        enabled: true,
        preset,
        columnId: config.columnId?.trim() || defaultRowSelectionColumnId,
        defaultPin: config.defaultPin ?? (preset === 'compact-left' ? 'left' : preset === 'compact-right' ? 'right' : false),
        column: config.column ?? {},
      }
    })
    const rowSelectionColumnSize = computed(() => getFixedColumnSize(mergedRowSelectionConfig.value?.column))
    const mergedColumns = computed<DataGridColumn<AnyRow>[]>(() => {
      const rowSelectionConfig = mergedRowSelectionConfig.value
      const normalizedColumns = props.columns.map((column) => normalizeColumnSize(column))
      if (!rowSelectionConfig) {
        return normalizedColumns
      }

      const selectionColumn = normalizeColumnSize(
        buildDataGridRowSelectionColumn(rowSelectionConfig, {
          onToggleAll: (checked, context) => {
            context.table.toggleAllPageRowsSelected(checked)
            resetRowSelectionAnchor()
          },
          onToggleRow: (checked, context, event) => {
            const rows = context.table.getRowModel().rows
            toggleRowSelectionRange(rows, context.row, checked, event)
          },
          onPreviewRowSelection: (context, event) => {
            if (event.shiftKey) {
              setRowSelectionPreview(context.table.getRowModel().rows, context.row.id, true)
              return
            }

            clearRowSelectionPreview()
          },
          onClearRowSelectionPreview: () => {
            clearRowSelectionPreview()
          },
        }),
      )
      const remainingColumns = normalizedColumns.filter((column) => column.id !== selectionColumn.id)
      return [selectionColumn, ...remainingColumns]
    })
    const mergedInitialState = computed<DataGridInitialState>(() => {
      const initialState = effectiveInitialState.value
      const rowSelectionConfig = mergedRowSelectionConfig.value

      if (!rowSelectionConfig) {
        return initialState
      }

      const columnId = rowSelectionConfig.columnId ?? defaultRowSelectionColumnId
      const forcedSize = getFixedColumnSize(rowSelectionConfig.column)

      return {
        ...initialState,
        columnOrder: appendMissingColumnId(initialState.columnOrder ?? [], columnId),
        columnSizing:
          typeof forcedSize === 'number'
            ? {
                ...(initialState.columnSizing ?? {}),
                [columnId]: forcedSize,
              }
            : initialState.columnSizing,
        columnPinning: appendMissingPinnedColumnId(
          initialState.columnPinning ?? {
            left: [],
            right: [],
          },
          columnId,
          rowSelectionConfig.defaultPin ?? false,
        ),
      }
    })
    const scrollElementRef = ref<HTMLDivElement | null>(null)
    const pagination = ref<PaginationState>(
      mergedInitialState.value.pagination ?? {
        pageIndex: 0,
        pageSize: 100,
      },
    )
    const sorting = ref<ColumnSort[]>(mergedInitialState.value.sorting ?? [])
    const columnOrder = ref<ColumnOrderState>(mergedInitialState.value.columnOrder ?? [])
    const columnSizing = ref<ColumnSizingState>(mergedInitialState.value.columnSizing ?? {})
    const columnVisibility = ref<DataGridColumnVisibilityState>(mergedInitialState.value.columnVisibility ?? {})
    const columnPinning = ref<ColumnPinningState>(
      mergedInitialState.value.columnPinning ?? {
        left: [],
        right: [],
      },
    )
    const columnFilters = ref<ColumnFiltersState>(mergedInitialState.value.columnFilters ?? [])
    const globalFilter = ref(mergedInitialState.value.globalFilter ?? '')
    const rowSelection = ref<RowSelectionState>({})
    const openMenuColumnId = ref<string | null>(null)
    const isColumnPickerOpen = ref(false)
    const isFilterDialogOpen = ref(false)
    const isFilterHelpDialogOpen = ref(false)
    const isViewsMenuOpen = ref(false)
    const isSaveViewDialogOpen = ref(false)
    const newViewName = ref('')
    const columnMoveTargetById = ref<Record<string, string>>({})
    const draftColumnFilters = ref<ColumnFiltersState>([])
    const draftGlobalFilter = ref('')
    const requestState = shallowRef<DataGridRequestState<AnyRow>>({
      rows: [],
      totalRows: 0,
      pageCount: 0,
      meta: undefined,
    })
    const { getRowKey, rowIndexByKey, patchRow, patchRows, updateRow, replaceRow, getRow, getVisibleRows } = useDataGridRows({
      requestState,
      rowId: () => props.rowId as DataGridRowIdResolver<AnyRow> | undefined,
      defaultPatchOptions: () => effectiveRowPatchConfig.value,
    })
    const isLoading = ref(false)
    const errorMessage = ref('')
    const isInitialViewLoaded = ref(false)

    let measureFrame: number | null = null

    function closeOverlayState(options?: { keepDialogsOpen?: boolean }) {
      openMenuColumnId.value = null
      isViewsMenuOpen.value = false
      isSaveViewDialogOpen.value = false

      if (!options?.keepDialogsOpen) {
        isFilterDialogOpen.value = false
        isFilterHelpDialogOpen.value = false
        isColumnPickerOpen.value = false
      }
    }

    function scheduleColumnMeasure() {
      if (typeof window === 'undefined') {
        columnVirtualizer.value.measure()
        return
      }

      if (measureFrame !== null) {
        window.cancelAnimationFrame(measureFrame)
      }

      measureFrame = window.requestAnimationFrame(() => {
        measureFrame = null
        columnVirtualizer.value.measure()
      })
    }

    function syncFilterDialogDraftState() {
      draftColumnFilters.value = cloneColumnFilters(columnFilters.value)
      draftGlobalFilter.value = globalFilter.value
    }

    function openSaveViewDialog() {
      newViewName.value = ''
      isSaveViewDialogOpen.value = true
      isViewsMenuOpen.value = false
      openMenuColumnId.value = null
      closeFilterMenus()
      isColumnPickerOpen.value = false
      isFilterDialogOpen.value = false
      isFilterHelpDialogOpen.value = false
    }

    function closeSaveViewDialog() {
      isSaveViewDialogOpen.value = false
      newViewName.value = ''
    }

    function saveNewView() {
      const name = newViewName.value.trim()

      if (!name) {
        return
      }

      void createNewView(name)
      closeSaveViewDialog()
    }

    function toggleViewsMenu() {
      isViewsMenuOpen.value = !isViewsMenuOpen.value
      openMenuColumnId.value = null
      closeFilterMenus()
      isColumnPickerOpen.value = false
      isFilterDialogOpen.value = false
      isFilterHelpDialogOpen.value = false
      isSaveViewDialogOpen.value = false
    }

    function toggleFilterHelpDialog() {
      isFilterHelpDialogOpen.value = !isFilterHelpDialogOpen.value
      openMenuColumnId.value = null
      closeFilterMenus()
      isColumnPickerOpen.value = false
      isFilterDialogOpen.value = false
      isViewsMenuOpen.value = false
      isSaveViewDialogOpen.value = false
    }

    function handleDocumentClick(event: MouseEvent) {
      const target = event.target

      if (!(target instanceof HTMLElement)) {
        return
      }

      if (target.closest('[data-grid-menu-root="true"]')) {
        return
      }

      if (target.closest('[data-grid-filter-root="true"]')) {
        return
      }

      if (target.closest('[data-grid-view-root="true"]')) {
        return
      }

      if (target.closest('[data-grid-dialog-root="true"]')) {
        return
      }

      openMenuColumnId.value = null
      closeFilterMenus()
      isColumnPickerOpen.value = false
      isFilterDialogOpen.value = false
      isFilterHelpDialogOpen.value = false
      isViewsMenuOpen.value = false
      isSaveViewDialogOpen.value = false
    }

    watch(
      [mergedRowSelectionConfig, rowSelectionColumnSize, columnSizing],
      ([rowSelectionConfig, forcedSize, sizingState]) => {
        if (!rowSelectionConfig || typeof forcedSize !== 'number') {
          return
        }

        const columnId = rowSelectionConfig.columnId ?? defaultRowSelectionColumnId
        if (sizingState[columnId] === forcedSize) {
          return
        }

        columnSizing.value = {
          ...sizingState,
          [columnId]: forcedSize,
        }
      },
      { immediate: true },
    )

    const table = useVueTable({
      get data() {
        return requestState.value.rows
      },
      get columns() {
        return mergedColumns.value
      },
      state: {
        get pagination() {
          return pagination.value
        },
        get sorting() {
          return sorting.value
        },
        get columnOrder() {
          return columnOrder.value
        },
        get columnSizing() {
          return columnSizing.value
        },
        get columnVisibility() {
          return columnVisibility.value
        },
        get columnFilters() {
          return columnFilters.value
        },
        get globalFilter() {
          return globalFilter.value
        },
        get rowSelection() {
          return rowSelection.value
        },
      },
      getCoreRowModel: getCoreRowModel(),
      enableRowSelection: true,
      manualPagination: true,
      manualSorting: true,
      manualFiltering: true,
      enableHiding: true,
      columnResizeMode: 'onEnd',
      defaultColumn: {
        size: 160,
        minSize: 80,
      },
      onPaginationChange: (updater) => {
        pagination.value = typeof updater === 'function' ? updater(pagination.value) : updater
      },
      onSortingChange: (updater) => {
        sorting.value = typeof updater === 'function' ? updater(sorting.value) : updater
      },
      onColumnOrderChange: (updater) => {
        columnOrder.value = typeof updater === 'function' ? updater(columnOrder.value) : updater
      },
      onColumnSizingChange: (updater) => {
        columnSizing.value = typeof updater === 'function' ? updater(columnSizing.value) : updater
      },
      onColumnVisibilityChange: (updater) => {
        columnVisibility.value = typeof updater === 'function' ? updater(columnVisibility.value) : updater
      },
      onColumnFiltersChange: (updater) => {
        columnFilters.value = typeof updater === 'function' ? updater(columnFilters.value) : updater
      },
      onGlobalFilterChange: (updater) => {
        globalFilter.value = typeof updater === 'function' ? updater(globalFilter.value) : updater
      },
      onRowSelectionChange: (updater) => {
        rowSelection.value = typeof updater === 'function' ? updater(rowSelection.value) : updater
      },
      getRowId: (row, index) => getRowKey(row, index),
      get pageCount() {
        return requestState.value.pageCount
      },
    })

    const allLeafColumns = computed(() => table.getAllLeafColumns())
    const allLeafColumnsById = computed(() => new Map(allLeafColumns.value.map((column) => [column.id, column])))
    const visibleColumns = computed(() => table.getVisibleLeafColumns())
    const visibleHeaders = computed(() => table.getHeaderGroups()[0]?.headers ?? [])
    const visibleRows = computed(() => table.getRowModel().rows)
    const visibleRowById = computed(() => {
      const rowsById = new Map<string, Row<AnyRow>>()
      for (const row of visibleRows.value) {
        rowsById.set(row.id, row)
      }
      return rowsById
    })
    const totalWidth = computed(() => table.getTotalSize())
    const visibleRowIndexByKey = rowIndexByKey
    const visibleColumnIndexById = computed(() => new Map(visibleColumns.value.map((column, index) => [column.id, index])))
    const {
      selectionPanelPosition,
      selectionPanelFloatingPosition,
      mergedSelectionPanelConfig,
      selectedRows,
      updateSelectionPanelPosition,
      updateSelectionPanelFloatingPosition,
    } = useDataGridSelectionPanel({
      effectiveSelectionPanelConfig,
      localeText,
      viewStorageKey: () => props.viewStorageKey,
      rowSelection,
      visibleRowById,
    })
    const rowSelectionColumnId = computed(() => mergedRowSelectionConfig.value?.columnId ?? defaultRowSelectionColumnId)
    const cellSelectionColumns = computed(() => {
      return visibleColumns.value.filter((column) => {
        const columnDef = column.columnDef as DataGridColumn<AnyRow>
        return column.id !== rowSelectionColumnId.value && columnDef.localKind !== 'action'
      })
    })
    const renderColumnPickerLabel = renderDataGridColumnPickerLabel
    const {
      selectedCellKeys,
      currentPointerCell,
      hoveredCellKey,
      previewCellRangeKeys,
      lastSelectedCell,
      selectedCellCount,
      selectedColumnIds,
      selectedCellRows,
      isCellSelected,
      isCellSelectionHovered,
      getCellSelectionPreviewMode,
      handleCellSelectionPointerEnter,
      handleCellSelectionPointerLeave,
      handleCellSelectionClick,
    } = useDataGridCellSelection({
      isEnabled: isCellSelectionEnabled,
      visibleRows,
      visibleRowById,
      cellSelectionColumns,
      rowSelectionConfig: mergedRowSelectionConfig,
      getTableRows: () => table.getRowModel().rows,
      setRowSelectionPreview,
      clearRowSelectionPreview,
      toggleRowSelectionRange,
    })

    const { closeFilterMenus, getColumnFilterConfig, renderFilterControl } = useDataGridFilters({
      columnFilters,
      draftColumnFilters,
      pagination,
      resetPageOnFilterChange: () => effectiveResetPageOnFilterChange.value,
      renderColumnPickerLabel,
      onOpenFilterMenu: closeOverlayState,
    })
    const { activeViewId, savedViews, loadSavedViews, selectSavedView, createNewView, overwriteActiveView, deleteActiveView } = useDataGridSavedViews({
      viewStorageKey: props.viewStorageKey,
      savedViewsPersistence: props.savedViewsPersistence,
      initialState: mergedInitialState.value,
      columnOrder,
      columnSizing,
      columnVisibility,
      columnPinning,
      columnFilters,
      globalFilter,
      pagination,
      rowSelection,
      onAfterApplyViewState: () => {
        openMenuColumnId.value = null
        closeFilterMenus()
        isViewsMenuOpen.value = false
        isSaveViewDialogOpen.value = false
        columnVirtualizer.value.measure()
      },
      onOpenSaveViewDialog: openSaveViewDialog,
      onPersistenceError: (error) => {
        errorMessage.value = error instanceof Error ? error.message : 'Nie udalo sie zapisac widokow gridu.'
      },
      createViewId,
      cloneViewState,
    })
    const isAutoHeight = computed(() => effectiveHeight.value === 'fill' || effectiveHeight.value === -1)

    const { rowVirtualizer, columnVirtualizer, virtualRows, totalRowHeight, headerSequence, rowSequence, cellStylesByColumnId, getPinnedSide } = useDataGridVirtualization({
      scrollElementRef,
      visibleRows,
      visibleColumns,
      visibleHeaders,
      allLeafColumnsById,
      visibleColumnIndexById,
      columnPinning,
      rowHeight: () => effectiveRowHeight.value,
      overscanRows: () => effectiveOverscanRows.value,
      overscanColumns: () => effectiveOverscanColumns.value,
    })

    const excelExportConfig = computed<DataGridExcelExportConfig<AnyRow>>(() => (effectiveExcelExportInput.value === false ? { enabled: false } : (effectiveExcelExportInput.value ?? {})))
    const {
      showViewsMenu,
      serverFilterColumns,
      filterDialogSections,
      quickFilterConfigs,
      activeFilterCount,
      excelExportActions,
      requestedServerColumnsKey,
    } = useDataGridToolbarState({
      allLeafColumns,
      visibleColumns,
      columnFilters,
      globalFilter,
      excelExportConfig,
      localeText,
      toolbarFilters: () => props.toolbarFilters,
      quickFilters: () => props.quickFilters,
      viewStorageKey: () => props.viewStorageKey,
      hasSavedViewsPersistence: () => Boolean(props.savedViewsPersistence),
      getColumnFilterConfig,
    })
    const effectiveRequestedServerColumnsKey = computed(() => (effectiveRefetchOnVisibleColumnsChange.value ? requestedServerColumnsKey.value : ''))

    const { refreshData } = useDataGridDataLoading({
      requestState,
      isLoading,
      errorMessage,
      enabled: isInitialViewLoaded,
      pagination,
      sorting,
      columnFilters,
      globalFilter,
      requestedServerColumnsKey: effectiveRequestedServerColumnsKey,
      localeText,
      keepRowsOnError: () => effectiveKeepRowsOnError.value,
      fetchPage: () => props.fetchPage,
      fetchDebounceMs: () => effectiveFetchDebounceMs.value,
      onLoaded: () => rowVirtualizer.value.scrollToOffset(0),
    })
    const { exporting: isExcelExporting, exportExcel } = useDataGridExcelExport({
      config: excelExportConfig,
      requestState,
      pagination,
      sorting,
      columnFilters,
      globalFilter,
      visibleColumns,
      allLeafColumns,
      visibleRows,
      fetchPage: () => props.fetchPage,
      renderColumnLabel: renderColumnPickerLabel,
    })

    async function handleExportExcel(mode: DataGridExcelExportMode) {
      closeOverlayState()
      errorMessage.value = ''

      try {
        await exportExcel(mode)
      } catch (error) {
        if (!excelExportConfig.value.onError) {
          errorMessage.value = error instanceof Error ? error.message : localeText.value.exportExcelErrorMessage
        }
      }
    }

    function toggleColumnPicker() {
      const nextOpen = !isColumnPickerOpen.value
      isColumnPickerOpen.value = nextOpen
      openMenuColumnId.value = null
      closeFilterMenus()
      isFilterDialogOpen.value = false
      isViewsMenuOpen.value = false
      isSaveViewDialogOpen.value = false

      if (nextOpen) {
        syncColumnDialogDraftState()
      }
    }

    function closeColumnPicker() {
      isColumnPickerOpen.value = false
    }

    function resetDialogFilterDraftState() {
      syncFilterDialogDraftState()
      closeFilterMenus()
    }

    function openFilterDialog() {
      isFilterDialogOpen.value = true
      openMenuColumnId.value = null
      closeFilterMenus()
      isColumnPickerOpen.value = false
      isViewsMenuOpen.value = false
      isSaveViewDialogOpen.value = false
      resetDialogFilterDraftState()
    }

    function toggleFilterDialog() {
      if (isFilterDialogOpen.value) {
        closeFilterDialog()
        return
      }

      openFilterDialog()
    }

    function closeFilterDialog() {
      isFilterDialogOpen.value = false
      resetDialogFilterDraftState()
    }

    function resetPageForFilterChange() {
      if (!effectiveResetPageOnFilterChange.value) {
        return
      }

      pagination.value = {
        ...pagination.value,
        pageIndex: 0,
      }
    }

    const columnMeasureKey = computed(() =>
      [
        columnOrder.value.join('|'),
        Object.entries(columnSizing.value).sort(([a], [b]) => a.localeCompare(b)).map(([id, size]) => `${id}:${size}`).join('|'),
        Object.entries(columnVisibility.value).sort(([a], [b]) => a.localeCompare(b)).map(([id, visible]) => `${id}:${visible ? 1 : 0}`).join('|'),
        (columnPinning.value.left ?? []).join('|'),
        (columnPinning.value.right ?? []).join('|'),
      ].join('::'),
    )

    watch(columnMeasureKey, () => {
      scheduleColumnMeasure()
    })

    onBeforeUnmount(() => {
      document.removeEventListener('click', handleDocumentClick)

      if (measureFrame !== null && typeof window !== 'undefined') {
        window.cancelAnimationFrame(measureFrame)
      }
    })

    onMounted(() => {
      document.addEventListener('click', handleDocumentClick)
      void loadSavedViews().finally(() => {
        isInitialViewLoaded.value = true
      })
    })

    const { columnPickerColumns, syncColumnDialogDraftState, getDraftPinnedSide, getDraftColumnMoveTarget, toggleDraftColumnVisibility, updateDraftColumnSize, setDraftPin, moveDraftColumn, updateDraftColumnMoveTarget, moveDraftColumnRelative, applyColumnDialogChanges, draftColumnVisibility, draftColumnSizing } = useDataGridColumnPicker({
      allLeafColumns,
      allLeafColumnsById,
      columnVisibility,
      columnSizing,
      columnPinning,
      columnOrder,
      columnMoveTargetById,
      cloneColumnPinningState,
      toNumber,
      onAfterApply: () => {
        columnVirtualizer.value.measure()
        closeColumnPicker()
      },
    })

    function applyFilterDialogChanges() {
      resetPageForFilterChange()
      columnFilters.value = cloneColumnFilters(draftColumnFilters.value)
      globalFilter.value = draftGlobalFilter.value
      syncFilterDialogDraftState()
      closeFilterDialog()
    }

    expose({
      refreshData,
      exportExcel,
      patchRow,
      patchRows,
      updateRow,
      replaceRow,
      getRow,
      getVisibleRows,
    })

    function clearAllFilters() {
      resetPageForFilterChange()
      sorting.value = [...(mergedInitialState.value.sorting ?? [])]
      columnFilters.value = cloneColumnFilters(mergedInitialState.value.columnFilters ?? [])
      globalFilter.value = mergedInitialState.value.globalFilter ?? ''
      draftColumnFilters.value = cloneColumnFilters(mergedInitialState.value.columnFilters ?? [])
      draftGlobalFilter.value = mergedInitialState.value.globalFilter ?? ''
      closeFilterMenus()
    }

    function toggleSorting(column: Column<AnyRow, unknown>) {
      if (!(column.columnDef as DataGridColumn<AnyRow>).serverField) {
        return
      }

      column.toggleSorting(column.getIsSorted() === 'asc')
      pagination.value = {
        ...pagination.value,
        pageIndex: 0,
      }
      openMenuColumnId.value = null
    }

    function setSortDesc(column: Column<AnyRow, unknown>) {
      if (!(column.columnDef as DataGridColumn<AnyRow>).serverField) {
        return
      }

      column.toggleSorting(true)
      pagination.value = {
        ...pagination.value,
        pageIndex: 0,
      }
      openMenuColumnId.value = null
    }

    function clearSorting(column: Column<AnyRow, unknown>) {
      sorting.value = sorting.value.filter((item) => item.id !== column.id)
      openMenuColumnId.value = null
    }

    function setPin(column: Column<AnyRow, unknown>, side: 'left' | 'right' | false) {
      const leftPinned = (columnPinning.value.left ?? []).filter((id) => id !== column.id)
      const rightPinned = (columnPinning.value.right ?? []).filter((id) => id !== column.id)

      if (side === 'left') {
        columnPinning.value = {
          left: [...leftPinned, column.id],
          right: rightPinned,
        }
      } else if (side === 'right') {
        columnPinning.value = {
          left: leftPinned,
          right: [...rightPinned, column.id],
        }
      } else {
        columnPinning.value = {
          left: leftPinned,
          right: rightPinned,
        }
      }

      openMenuColumnId.value = null
    }

    function toggleColumnMenu(columnId: string) {
      openMenuColumnId.value = openMenuColumnId.value === columnId ? null : columnId
      closeFilterMenus()
      isColumnPickerOpen.value = false
      isFilterDialogOpen.value = false
    }

    function renderColumnPickerDialog() {
      return (
        <DataGridColumnPickerDialog
          isOpen={isColumnPickerOpen.value}
          columns={columnPickerColumns.value}
          renderColumnLabel={renderColumnPickerLabel}
          getIsColumnVisible={(columnId) => draftColumnVisibility.value[columnId] ?? true}
          getPinnedSide={getDraftPinnedSide}
          getColumnSize={(columnId) => {
            const column = allLeafColumnsById.value.get(columnId)
            return draftColumnSizing.value[columnId] ?? column?.getSize() ?? 160
          }}
          getColumnMoveTarget={getDraftColumnMoveTarget}
          onClose={closeColumnPicker}
          onApply={applyColumnDialogChanges}
          onToggleColumnVisibility={toggleDraftColumnVisibility}
          onUpdateColumnSize={updateDraftColumnSize}
          onSetPin={setDraftPin}
          onMoveColumn={moveDraftColumn}
          onUpdateColumnMoveTarget={updateDraftColumnMoveTarget}
          onMoveColumnRelative={moveDraftColumnRelative}
        />
      )
    }

    function renderFilterDialog() {
      return <DataGridFilterDialog isOpen={isFilterDialogOpen.value} sections={filterDialogSections.value} renderFilterControl={(config) => renderFilterControl(config, { target: 'dialog' })} onClose={closeFilterDialog} onApply={applyFilterDialogChanges} />
    }

    function renderFilterHelpDialog() {
      return (
        <DataGridHelpDialog
          isOpen={isFilterHelpDialogOpen.value}
          onClose={() => {
            isFilterHelpDialogOpen.value = false
          }}
        />
      )
    }

    function renderSaveViewDialog() {
      return (
        <DataGridSaveViewDialog
          isOpen={isSaveViewDialogOpen.value}
          viewName={newViewName.value}
          onClose={closeSaveViewDialog}
          onSave={saveNewView}
          onUpdateViewName={(value) => {
            newViewName.value = value
          }}
        />
      )
    }

    const getColumnMenuStyle = (column: Column<AnyRow, unknown>) =>
      getDataGridColumnMenuStyle({
        column,
        visibleColumns,
        visibleColumnIndexById,
        getPinnedSide,
      })
    const renderCell = renderDataGridCell

    function closeColumnMenu() {
      openMenuColumnId.value = null
    }

    const { selectionPanelSums, clearSelectedCells, clearSelectedRows, clearAllSelection, clearSelectedColumns, copySelectedRows, copySelectedCells, copyAllSelection } = useDataGridClipboard({
      visibleColumns,
      allLeafColumnsById,
      mergedSelectionPanelConfig,
      rowSelectionColumnId,
      selectedRows,
      cellSelectionColumns,
      selectedCellRows,
      selectedCellCount,
      selectedColumnIds,
      rowSelection,
      selectedCellKeys,
      previewSelectionRowIds,
      previewCellRangeKeys,
      hoveredCellKey,
      currentPointerCell,
      lastSelectedCell,
      lastSelectedRowId,
      renderColumnPickerLabel,
    })

    const { selectionPanelSections, selectionPanelActions } = useDataGridSelectionPanelSections({
      mergedSelectionPanelConfig,
      localeText,
      selectedRows,
      selectedColumnIds,
      selectedCellCount,
      clearSelectedRows,
      clearSelectedColumns,
      clearSelectedCells,
      copySelectedRows,
      copySelectedCells,
    })

    return () => {
      const pageCount = requestState.value.pageCount
      const pageIndex = pagination.value.pageIndex
      const paginationItems = buildPaginationItems(pageCount, pageIndex)

      return (
        <section
          class={['data-grid', isAutoHeight.value ? 'data-grid--fill-height' : '']}
        >
          <div class="data-grid__table-shell">
            <div>
              <DataGridToolbar
                showViews={showViewsMenu.value}
                isViewsMenuOpen={isViewsMenuOpen.value}
                activeViewId={activeViewId.value}
                savedViews={savedViews.value}
                quickFilters={quickFilterConfigs.value}
                activeFilterCount={activeFilterCount.value}
                renderFilterControl={renderFilterControl}
                onToggleViewsMenu={toggleViewsMenu}
                onSelectSavedView={selectSavedView}
                onOpenSaveViewDialog={openSaveViewDialog}
                onOverwriteActiveView={() => {
                  void overwriteActiveView()
                }}
                onDeleteActiveView={() => {
                  void deleteActiveView()
                }}
                onToggleFilterDialog={toggleFilterDialog}
                onToggleFilterHelpDialog={toggleFilterHelpDialog}
                onRefresh={refreshData}
                onClearFilters={clearAllFilters}
                onToggleColumnPicker={toggleColumnPicker}
                excelExportActions={excelExportActions.value}
                isExcelExporting={isExcelExporting.value}
                exportExcelLabel={localeText.value.exportExcelLabel}
                onExportExcel={(mode) => {
                  void handleExportExcel(mode)
                }}
                customActions={slots['toolbar-actions']?.()}
              />
            </div>

            <div
              class="data-grid__viewport-shell"
              style={
                {
                  ...(isAutoHeight.value ? {} : { height: `${effectiveHeight.value}px` }),
                  '--data-grid-header-height': `${dataGridHeaderHeight}px`,
                } as Record<string, string>
              }
            >
              <div ref={scrollElementRef} class={['data-grid__viewport', isLoading.value && mergedLoadingConfig.value.variant === 'overlay' ? 'data-grid__viewport--loading' : '']}>
                <div
                  class="data-grid__inner"
                  style={{
                    width: `${totalWidth.value}px`,
                    height: `${totalRowHeight.value + dataGridHeaderHeight}px`,
                  }}
                >
                  <div class="data-grid__header" style={{ width: `${totalWidth.value}px` }}>
                    <div class="data-grid__row data-grid__row--header" style={{ transform: 'translateY(0px)' }}>
                      {headerSequence.value.map((entry) => {
                        if (entry.type === 'spacer') {
                          return <div key={entry.key} class="data-grid__cell-spacer" style={{ width: `${entry.width}px` }} />
                        }

                        const pinnedSide = getPinnedSide(entry.column.id)

                        return (
                          <div
                            key={entry.key}
                            class={['data-grid__cell', 'data-grid__cell--header', pinnedSide ? 'data-grid__cell--pinned' : '', pinnedSide ? `data-grid__cell--${pinnedSide}` : '']}
                            style={{
                              ...cellStylesByColumnId.value.get(entry.column.id),
                            }}
                          >
                            <DataGridHeaderCell header={entry.item.getContext()} column={entry.column} pickerLabel={renderColumnPickerLabel(entry.column)} justifyContent={(cellStylesByColumnId.value.get(entry.column.id)?.justifyContent as string) ?? 'flex-start'} menuStyle={getColumnMenuStyle(entry.column)} isMenuOpen={openMenuColumnId.value === entry.column.id} pinnedSide={pinnedSide} renderFilterControl={(config) => renderFilterControl(config)} getColumnFilterConfig={getColumnFilterConfig} onToggleMenu={toggleColumnMenu} onToggleSorting={toggleSorting} onSetSortDesc={setSortDesc} onClearSorting={clearSorting} onSetPin={setPin} onCloseMenu={closeColumnMenu} />
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div class="data-grid__body" style={{ width: `${totalWidth.value}px` }}>
                    {virtualRows.value.map((virtualRow) => {
                      const row = visibleRows.value[virtualRow.index]
                      if (!row) {
                        return null
                      }

                      const rowPreviewMode = previewSelectionRowIds.value.has(row.id)
                        ? rowSelectionPreviewMode.value
                        : null

                      return (
                        <DataGridBodyRow key={row.id} row={row} rowStart={virtualRow.start} rowSize={virtualRow.size} rowSequence={rowSequence.value} visibleColumnIndexById={visibleColumnIndexById.value} cellStylesByColumnId={cellStylesByColumnId.value} getPinnedSide={getPinnedSide} renderCell={renderCell} isSelectionPreviewed={rowPreviewMode === 'select'} isSelectionRevertPreviewed={rowPreviewMode === 'deselect'} enableCellSelection={isCellSelectionEnabled.value} isCellSelected={isCellSelectionEnabled.value ? isCellSelected : undefined} isCellSelectionHovered={isCellSelectionEnabled.value ? isCellSelectionHovered : undefined} getCellSelectionPreviewMode={isCellSelectionEnabled.value ? getCellSelectionPreviewMode : undefined} onCellSelectionPointerEnter={isCellSelectionEnabled.value ? handleCellSelectionPointerEnter : undefined} onCellSelectionPointerLeave={isCellSelectionEnabled.value ? handleCellSelectionPointerLeave : undefined} onCellSelectionClick={isCellSelectionEnabled.value ? handleCellSelectionClick : undefined} />
                      )
                    })}
                  </div>
                </div>
              </div>
              {isLoading.value && mergedLoadingConfig.value.variant === 'overlay' ? (
                <div class="data-grid__loading-overlay" aria-live="polite">
                  <div class="data-grid__loading-spinner" />
                  <span class="data-grid__loading-label">{mergedLoadingConfig.value.label ?? 'Ladowanie danych'}</span>
                </div>
              ) : null}
            </div>
            {mergedSelectionPanelConfig.value && selectionPanelSections.value.length > 0 ? (
              <DataGridSelectionPanel
                position={mergedSelectionPanelConfig.value.position ?? selectionPanelPosition.value ?? 'bottom-right'}
                floatingPosition={mergedSelectionPanelConfig.value.floatingPosition ?? selectionPanelFloatingPosition.value ?? null}
                selectedRowsCount={selectionPanelSections.value.reduce((total, section) => total + section.count, 0)}
                selectedRowsLabel={localeText.value.selectedRowsTotalLabel}
                sections={selectionPanelSections.value}
                actions={selectionPanelActions.value}
                sums={selectionPanelSums.value}
                copyLabel={localeText.value.copyAllLabel}
                copyIncludeHeaders={mergedSelectionPanelConfig.value.copyIncludeHeaders ?? false}
                copyWithHeadersLabel={mergedSelectionPanelConfig.value.copyWithHeadersLabel ?? localeText.value.copyWithHeadersLabel}
                copyWithoutHeadersLabel={mergedSelectionPanelConfig.value.copyWithoutHeadersLabel ?? localeText.value.copyWithoutHeadersLabel}
                allowPositionChange={mergedSelectionPanelConfig.value.allowPositionChange ?? true}
                onCopy={(options) => {
                  void copyAllSelection(options.includeHeaders)
                }}
                onClearSelection={clearAllSelection}
                onUpdatePosition={updateSelectionPanelPosition}
                onUpdateFloatingPosition={updateSelectionPanelFloatingPosition}
              />
            ) : null}

            <div>
              <DataGridFooter
                isLoading={isLoading.value}
                totalRows={requestState.value.totalRows}
                fetchedRows={requestState.value.rows.length}
                datasetSize={typeof requestState.value.meta?.datasetSize === 'string' || typeof requestState.value.meta?.datasetSize === 'number' ? requestState.value.meta.datasetSize : undefined}
                metaItems={effectiveMetaItems.value}
                pageSizeConfig={effectivePageSizeConfig.value}
                pageIndex={pageIndex}
                pageSize={pagination.value.pageSize}
                paginationItems={paginationItems}
                canPreviousPage={table.getCanPreviousPage()}
                canNextPage={table.getCanNextPage()}
                onPreviousPage={() => table.previousPage()}
                onNextPage={() => table.nextPage()}
                onSetPageIndex={(nextPageIndex) => table.setPageIndex(nextPageIndex)}
                onPageSizeChange={(pageSize) => {
                  pagination.value = {
                    pageIndex: 0,
                    pageSize,
                  }
                }}
              />
            </div>
          </div>

          {serverFilterColumns.value.length === 0 ? <p class="data-grid__note">{localeText.value.noFilterableColumnsMessage}</p> : null}
          {errorMessage.value ? <p class="data-grid__error">{errorMessage.value}</p> : null}
          {renderFilterDialog()}
          {renderFilterHelpDialog()}
          {renderColumnPickerDialog()}
          {renderSaveViewDialog()}
        </section>
      )
    }
  },
})
