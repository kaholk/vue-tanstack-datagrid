import { computed, defineComponent, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { getCoreRowModel, useVueTable, type Column, type ColumnFiltersState, type ColumnOrderState, type ColumnPinningState, type ColumnSizingState, type ColumnSort, type PaginationState, type Row, type RowSelectionState } from '@tanstack/vue-table'

import { useDataGridClipboard } from './composables/useDataGridClipboard'
import { useDataGridCellSelection } from './composables/useDataGridCellSelection'
import { useDataGridColumnPicker } from './composables/useDataGridColumnPicker'
import { useDataGridDataLoading } from './composables/useDataGridDataLoading'
import { useDataGridEffectiveConfig } from './composables/useDataGridEffectiveConfig'
import { useDataGridExcelExport } from './composables/useDataGridExcelExport'
import { useDataGridFilters } from './composables/useDataGridFilters'
import { useDataGridOverlayState } from './composables/useDataGridOverlayState'
import { useDataGridRows, type DataGridRequestState } from './composables/useDataGridRows'
import { useDataGridRowSelection } from './composables/useDataGridRowSelection'
import { useDataGridSavedViews } from './composables/useDataGridSavedViews'
import { useDataGridSelectionPanel, useDataGridSelectionPanelSections } from './composables/useDataGridSelectionPanel'
import { useDataGridToolbarState } from './composables/useDataGridToolbarState'
import { useDataGridVirtualization } from './composables/useDataGridVirtualization'
import { buildDataGridRowSelectionColumn, defaultRowSelectionColumnId, defaultRowSelectionPreset } from './composables/useDataGridRowSelectionColumn'
import { dataGridProps } from './DataGrid.props'
import { getDataGridColumnMenuStyle, renderDataGridCell, renderDataGridColumnPickerLabel } from './renderers/dataGridRenderHelpers'
import { renderDataGridMain } from './renderers/dataGridMainRender'
import type { AnyRow } from './types/internal'
import type { DataGridColumn, DataGridExcelExportConfig, DataGridExcelExportMode, DataGridColumnVisibilityState, DataGridInitialState, DataGridRowIdResolver, DataGridRowSelectionConfig } from './types'
import { appendMissingColumnId, appendMissingPinnedColumnId, getFixedColumnSize, normalizeColumnSize } from './utils/columns'
import { cloneColumnFilters, cloneColumnPinningState, cloneViewState } from './utils/clone'
import { toNumber } from './utils/number'
import { createViewId } from './utils/savedViews'

export default defineComponent({
  name: 'DataGrid',
  props: dataGridProps,
  setup(props, { expose, slots }) {
    const {
      localeText,
      effectiveInitialState,
      effectiveMetaItems,
      effectivePageSizeConfig,
      effectiveSelectionPanelConfig,
      effectiveRowSelectionConfig,
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
    } = useDataGridEffectiveConfig(props)
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
    const columnMoveTargetById = ref<Record<string, string>>({})
    const draftColumnFilters = ref<ColumnFiltersState>(
      cloneColumnFilters(mergedInitialState.value.columnFilters ?? []),
    )
    const draftGlobalFilter = ref(mergedInitialState.value.globalFilter ?? '')
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
    let closeFilterMenus = () => {}
    let syncColumnDialogDraftState = () => {}
    let createNewView: (name: string) => void | Promise<void> = () => {}

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

    const {
      openMenuColumnId,
      isColumnPickerOpen,
      isFilterDialogOpen,
      isFilterHelpDialogOpen,
      isViewsMenuOpen,
      isSaveViewDialogOpen,
      newViewName,
      closeOverlayState,
      openSaveViewDialog,
      closeSaveViewDialog,
      saveNewView,
      toggleViewsMenu,
      toggleFilterHelpDialog,
      handleDocumentClick,
      toggleColumnPicker,
      closeColumnPicker,
      toggleFilterDialog,
      closeFilterDialog,
      toggleColumnMenu,
      closeColumnMenu,
    } = useDataGridOverlayState({
      closeFilterMenus: () => closeFilterMenus(),
      syncFilterDialogDraftState,
      syncColumnDialogDraftState: () => syncColumnDialogDraftState(),
      createNewView: (name) => createNewView(name),
    })

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

    const dataGridFilters = useDataGridFilters({
      columnFilters,
      draftColumnFilters,
      pagination,
      resetPageOnFilterChange: () => effectiveResetPageOnFilterChange.value,
      renderColumnPickerLabel,
      onOpenFilterMenu: closeOverlayState,
    })
    closeFilterMenus = dataGridFilters.closeFilterMenus
    const {
      acceptFilterDraftModes,
      clearFilterDraftModes,
      getColumnFilterConfig,
      hasPendingFilterModeChanges,
      isFilterPending,
      resetDraftColumnFilter,
      resetFilterDraftModes,
      renderFilterControl,
    } = dataGridFilters

    const savedViewsState = useDataGridSavedViews({
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
        syncFilterDialogDraftState()
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
    createNewView = savedViewsState.createNewView
    const { activeViewId, savedViews, loadSavedViews, selectSavedView, overwriteActiveView, deleteActiveView } = savedViewsState
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

    function handleOverwriteActiveView() {
      void overwriteActiveView()
    }

    function handleDeleteActiveView() {
      void deleteActiveView()
    }

    function handlePreviousPage() {
      table.previousPage()
    }

    function handleNextPage() {
      table.nextPage()
    }

    function handleSetPageIndex(nextPageIndex: number) {
      table.setPageIndex(nextPageIndex)
    }

    function handlePageSizeChange(pageSize: number) {
      pagination.value = {
        pageIndex: 0,
        pageSize,
      }
    }

    function handleCopyAllSelection(options: { includeHeaders: boolean }) {
      void copyAllSelection(options.includeHeaders)
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

    watch(
      [
        columnOrder,
        columnSizing,
        columnVisibility,
        () => columnPinning.value.left,
        () => columnPinning.value.right,
      ],
      () => {
        scheduleColumnMeasure()
      },
    )

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

    const columnPickerState = useDataGridColumnPicker({
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
    syncColumnDialogDraftState = columnPickerState.syncColumnDialogDraftState
    const { columnPickerColumns, getDraftPinnedSide, getDraftColumnMoveTarget, toggleDraftColumnVisibility, updateDraftColumnSize, setDraftPin, moveDraftColumn, updateDraftColumnMoveTarget, moveDraftColumnRelative, applyColumnDialogChanges, draftColumnVisibility, draftColumnSizing } = columnPickerState

    function applyFilterDialogChanges() {
      resetPageForFilterChange()
      columnFilters.value = cloneColumnFilters(draftColumnFilters.value)
      globalFilter.value = draftGlobalFilter.value
      acceptFilterDraftModes()
      syncFilterDialogDraftState()
      closeFilterDialog()
    }

    function resetFilterDraftChanges() {
      syncFilterDialogDraftState()
      resetFilterDraftModes()
      closeFilterMenus()
    }

    function hasPendingFilterChanges() {
      return (
        JSON.stringify(columnFilters.value) !== JSON.stringify(draftColumnFilters.value) ||
        hasPendingFilterModeChanges()
      )
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
      clearFilterDraftModes()
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

    const columnPickerLabelById = computed(() => {
      const labelsById = new Map<string, string>()
      for (const column of allLeafColumns.value) {
        labelsById.set(column.id, renderColumnPickerLabel(column))
      }
      return labelsById
    })
    const columnMenuStyleById = computed(() => {
      const stylesById = new Map<string, ReturnType<typeof getDataGridColumnMenuStyle>>()
      for (const column of visibleColumns.value) {
        stylesById.set(column.id, getDataGridColumnMenuStyle({
          column,
          visibleColumns,
          visibleColumnIndexById,
          getPinnedSide,
        }))
      }
      return stylesById
    })
    const selectionPanelSelectedCount = computed(() => selectionPanelSections.value.reduce((total, section) => total + section.count, 0))
    const renderCell = renderDataGridCell

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

    return () => renderDataGridMain({
      requestState,
      pagination,
      isAutoHeight,
      showViewsMenu,
      isViewsMenuOpen,
      activeViewId,
      savedViews,
      quickFilterConfigs,
      activeFilterCount,
      hasPendingFilterChanges,
      renderFilterControl,
      toggleViewsMenu,
      selectSavedView,
      openSaveViewDialog,
      overwriteActiveView,
      deleteActiveView,
      toggleFilterDialog,
      toggleFilterHelpDialog,
      refreshData,
      clearAllFilters,
      toggleColumnPicker,
      excelExportActions,
      isExcelExporting,
      localeText,
      handleExportExcel,
      handleOverwriteActiveView,
      handleDeleteActiveView,
      handlePreviousPage,
      handleNextPage,
      handleSetPageIndex,
      handlePageSizeChange,
      handleCopyAllSelection,
      slots,
      effectiveHeight,
      scrollElementRef,
      isLoading,
      mergedLoadingConfig,
      totalWidth,
      totalRowHeight,
      headerSequence,
      getPinnedSide,
      cellStylesByColumnId,
      columnPickerLabelById,
      columnMenuStyleById,
      openMenuColumnId,
      getColumnFilterConfig,
      toggleColumnMenu,
      toggleSorting,
      setSortDesc,
      clearSorting,
      setPin,
      closeColumnMenu,
      virtualRows,
      visibleRows,
      previewSelectionRowIds,
      rowSelectionPreviewMode,
      rowSequence,
      visibleColumnIndexById,
      renderCell,
      isCellSelectionEnabled,
      isCellSelected,
      isCellSelectionHovered,
      getCellSelectionPreviewMode,
      handleCellSelectionPointerEnter,
      handleCellSelectionPointerLeave,
      handleCellSelectionClick,
      mergedSelectionPanelConfig,
      selectionPanelSections,
      selectionPanelPosition,
      selectionPanelFloatingPosition,
      selectionPanelSelectedCount,
      selectionPanelActions,
      selectionPanelSums,
      copyAllSelection,
      clearAllSelection,
      updateSelectionPanelPosition,
      updateSelectionPanelFloatingPosition,
      effectiveMetaItems,
      effectivePageSizeConfig,
      table,
      serverFilterColumns,
      errorMessage,
      isFilterDialogOpen,
      filterDialogSections,
      isFilterPending,
      resetDraftColumnFilter,
      closeFilterDialog,
      applyFilterDialogChanges,
      resetFilterDraftChanges,
      isFilterHelpDialogOpen,
      isColumnPickerOpen,
      columnPickerColumns,
      renderColumnPickerLabel,
      draftColumnVisibility,
      getDraftPinnedSide,
      draftColumnSizing,
      allLeafColumnsById,
      getDraftColumnMoveTarget,
      closeColumnPicker,
      applyColumnDialogChanges,
      toggleDraftColumnVisibility,
      updateDraftColumnSize,
      setDraftPin,
      moveDraftColumn,
      updateDraftColumnMoveTarget,
      moveDraftColumnRelative,
      isSaveViewDialogOpen,
      newViewName,
      closeSaveViewDialog,
      saveNewView,
    })
  },
})
