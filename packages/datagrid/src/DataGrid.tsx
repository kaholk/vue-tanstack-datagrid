import { computed, defineComponent, onBeforeUnmount, onMounted, ref, shallowRef, watch, type CSSProperties, type PropType } from 'vue'
import { getCoreRowModel, useVueTable, type Cell, type Column, type ColumnFiltersState, type ColumnOrderState, type ColumnPinningState, type ColumnSizingState, type ColumnSort, type PaginationState, type Row, type RowSelectionState } from '@tanstack/vue-table'

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
import { useDataGridColumnPicker } from './composables/useDataGridColumnPicker'
import { useDataGridDataLoading } from './composables/useDataGridDataLoading'
import { useDataGridExcelExport } from './composables/useDataGridExcelExport'
import { useDataGridFilters } from './composables/useDataGridFilters'
import { useDataGridRows, type DataGridRequestState } from './composables/useDataGridRows'
import { useDataGridSavedViews } from './composables/useDataGridSavedViews'
import { useDataGridVirtualization } from './composables/useDataGridVirtualization'
import { buildDataGridRowSelectionColumn, defaultRowSelectionColumnId, defaultRowSelectionPreset } from './composables/useDataGridRowSelectionColumn'
import { resolveDataGridLocaleText } from './locales'
import type { DataGridCellSelectionConfig, DataGridColumn, DataGridColumnAlign, DataGridExcelExportConfig, DataGridExcelExportMode, DataGridFilterConfig, DataGridQuickFilterConfig, DataGridColumnVisibilityState, DataGridFetchParams, DataGridFetchResult, DataGridFloatingPosition, DataGridInitialState, DataGridHeight, DataGridLoadingConfig, DataGridLocale, DataGridMetaConfig, DataGridPageSizeConfig, DataGridPreset, DataGridRowIdResolver, DataGridRowSelectionConfig, DataGridSavedViewsPersistence, DataGridSelectionPanelConfig, DataGridSelectionPanelActionContext, DataGridSelectionPanelSumConfig, DataGridSelectionPanelPosition, DataGridSavedViewState, DataGridLocaleText } from './types'
import { appendMissingColumnId, appendMissingPinnedColumnId, getFixedColumnSize, normalizeColumnSize } from './utils/columns'
import { cloneColumnFilters, cloneColumnPinningState, cloneViewState } from './utils/clone'
import { toFilterGroupId } from './utils/filters'
import { toNumber } from './utils/number'
import { buildPaginationItems } from './utils/pagination'
import { renderFlexibleContent } from './utils/render'
import { createViewId } from './utils/savedViews'

type AnyRow = Record<string, unknown>

type FilterDialogSection = {
  id: string
  label: string
  items: DataGridFilterConfig[]
}

type CellRenderProps = {
  table: ReturnType<Cell<AnyRow, unknown>['getContext']>['table']
  column: ReturnType<Cell<AnyRow, unknown>['getContext']>['column']
  row: ReturnType<Cell<AnyRow, unknown>['getContext']>['row']
  cell: ReturnType<Cell<AnyRow, unknown>['getContext']>['cell']
  getValue: ReturnType<Cell<AnyRow, unknown>['getContext']>['getValue']
  renderValue: ReturnType<Cell<AnyRow, unknown>['getContext']>['renderValue']
  align: DataGridColumnAlign
}

type CellSelectionAnchor = {
  rowId: string
  columnId: string
}
type SelectionPreviewMode = 'select' | 'deselect' | 'toggle' | null

type SelectionPanelSection = {
  id: string
  label: string
  count: number
  copyLabel: string
  clearLabel: string
  onCopy: (options: { includeHeaders: boolean }) => void | Promise<void>
  onClear: () => void
}

const headerHeight = 92
const defaultMetaItems: DataGridMetaConfig[] = [
  { key: 'rows', label: 'Rows' },
  { key: 'fetched', label: 'Fetched' },
  { key: 'datasetSize', label: 'Dataset' },
]
const defaultPageSizeConfig: DataGridPageSizeConfig = {
  label: 'Rows',
  options: [50, 100, 250, 500],
}
const defaultSelectionPanelConfig: DataGridSelectionPanelConfig = {
  position: 'bottom-right',
  sumColumns: [],
  copyColumnIds: undefined,
  copyIncludeHeaders: true,
  selectedRowsLabel: 'Zaznaczone wiersze',
  copyWithHeadersLabel: 'Kopiuj z naglowkami',
  copyWithoutHeadersLabel: 'Kopiuj bez naglowkow',
  allowPositionChange: true,
  positionStorageKey: '',
  floatingPosition: { x: 16, y: 16 },
}
const defaultLoadingConfig: DataGridLoadingConfig = {
  variant: 'overlay',
  label: undefined,
}

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
      type: Object as PropType<DataGridSelectionPanelConfig<AnyRow> | undefined>,
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
      const items = props.metaItems ?? preset.value.metaItems ?? defaultMetaItems
      return items.map((item) => ({ ...item }))
    })
    const effectivePageSizeConfig = computed<DataGridPageSizeConfig>(() => ({
      ...defaultPageSizeConfig,
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
    const effectiveHeight = computed<DataGridHeight | -1>(() => props.height ?? preset.value.height ?? 560)
    const effectiveRowHeight = computed(() => props.rowHeight ?? preset.value.rowHeight ?? 42)
    const effectiveOverscanRows = computed(() => props.overscanRows ?? preset.value.overscanRows ?? 10)
    const effectiveOverscanColumns = computed(() => props.overscanColumns ?? preset.value.overscanColumns ?? 3)
    const effectiveFetchDebounceMs = computed(() => props.fetchDebounceMs ?? preset.value.fetchDebounceMs ?? 180)
    const effectiveResetPageOnFilterChange = computed(() => props.resetPageOnFilterChange ?? preset.value.resetPageOnFilterChange ?? true)
    const mergedLoadingConfig = computed<DataGridLoadingConfig>(() => ({
      variant: effectiveLoadingConfigInput.value.variant ?? defaultLoadingConfig.variant,
      label: effectiveLoadingConfigInput.value.label ?? localeText.value.loadingLabel,
    }))
    const isCellSelectionEnabled = computed(() => effectiveCellSelectionConfig.value?.enabled ?? true)
    const lastSelectedRowId = ref<string | null>(null)
    const previewSelectionRowIds = shallowRef<Set<string>>(new Set())
    const rowSelectionPreviewMode = ref<SelectionPreviewMode>(null)
    const selectionPanelPosition = ref<DataGridSelectionPanelPosition>(effectiveSelectionPanelConfig.value?.position ?? defaultSelectionPanelConfig.position ?? 'bottom-right')
    const selectionPanelFloatingPosition = ref<DataGridFloatingPosition>(effectiveSelectionPanelConfig.value?.floatingPosition ?? defaultSelectionPanelConfig.floatingPosition ?? { x: 16, y: 16 })
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
            lastSelectedRowId.value = null
            previewSelectionRowIds.value = new Set()
            rowSelectionPreviewMode.value = null
          },
          onToggleRow: (checked, context, event) => {
            const rows = context.table.getRowModel().rows
            const currentIndex = rows.findIndex((row) => row.id === context.row.id)
            const anchorIndex = rows.findIndex((row) => row.id === lastSelectedRowId.value)

            if (event.shiftKey && currentIndex >= 0 && anchorIndex >= 0) {
              const [start, end] = currentIndex < anchorIndex ? [currentIndex, anchorIndex] : [anchorIndex, currentIndex]

              for (let index = start; index <= end; index += 1) {
                rows[index]?.toggleSelected(checked)
              }
            } else {
              context.row.toggleSelected(checked)
            }

            lastSelectedRowId.value = context.row.id
            previewSelectionRowIds.value = new Set()
            rowSelectionPreviewMode.value = null
          },
          onPreviewRowSelection: (context, event) => {
            if (event.shiftKey) {
              setRowSelectionPreview(context.row.id, true)
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
    const selectedCellKeys = shallowRef<Set<string>>(new Set())
    const currentPointerCell = ref<CellSelectionAnchor | null>(null)
    const hoveredCellKey = ref<string | null>(null)
    const previewCellRangeKeys = shallowRef<Set<string>>(new Set())
    const cellSelectionPreviewMode = ref<SelectionPreviewMode>(null)
    const lastSelectedCell = ref<CellSelectionAnchor | null>(null)
    const isCellSelectionCtrlDown = ref(false)
    const isCellSelectionShiftDown = ref(false)
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

    function updateSelectionPanelPosition(position: DataGridSelectionPanelPosition) {
      selectionPanelPosition.value = position
    }

    function updateSelectionPanelFloatingPosition(position: DataGridFloatingPosition) {
      selectionPanelFloatingPosition.value = position
    }

    function clearRowSelectionPreview() {
      previewSelectionRowIds.value = new Set()
      rowSelectionPreviewMode.value = null
    }

    function clearCellSelectionPreview() {
      hoveredCellKey.value = null
      previewCellRangeKeys.value = new Set()
      cellSelectionPreviewMode.value = null
    }

    function clearSelectionPreviews() {
      clearRowSelectionPreview()
      clearCellSelectionPreview()
    }

    function updateSelectionPreviewForCurrentPointer(event: Pick<KeyboardEvent | PointerEvent | MouseEvent, 'ctrlKey' | 'shiftKey' | 'altKey'>) {
      const pointer = currentPointerCell.value
      if (!pointer) {
        clearSelectionPreviews()
        return
      }

      if (event.altKey && mergedRowSelectionConfig.value) {
        clearCellSelectionPreview()
        setRowSelectionPreview(pointer.rowId, event.shiftKey)
        return
      }

      clearRowSelectionPreview()

      if (!isCellSelectionColumnId(pointer.columnId)) {
        clearCellSelectionPreview()
        return
      }

      if (event.ctrlKey) {
        hoveredCellKey.value = getCellSelectionKey(pointer.rowId, pointer.columnId)
        if (event.shiftKey) {
          setCellRangeSelectionPreview(pointer)
        } else {
          previewCellRangeKeys.value = new Set()
          cellSelectionPreviewMode.value = null
        }
        return
      }

      if (event.shiftKey) {
        hoveredCellKey.value = null
        setColumnSelectionPreview(pointer.columnId)
        return
      }

      clearCellSelectionPreview()
    }

    function clearSelectionPreviewIfShiftReleased(event: KeyboardEvent) {
      isCellSelectionCtrlDown.value = event.ctrlKey
      isCellSelectionShiftDown.value = event.shiftKey
      updateSelectionPreviewForCurrentPointer(event)
    }

    function updateCellSelectionModifierState(event: KeyboardEvent) {
      isCellSelectionCtrlDown.value = event.ctrlKey
      isCellSelectionShiftDown.value = event.shiftKey
      updateSelectionPreviewForCurrentPointer(event)
    }

    function clearCellSelectionModifierState() {
      isCellSelectionCtrlDown.value = false
      isCellSelectionShiftDown.value = false
      currentPointerCell.value = null
      clearSelectionPreviews()
    }

    onMounted(() => {
      if (typeof window === 'undefined') {
        return
      }

      window.addEventListener('keydown', updateCellSelectionModifierState)
      window.addEventListener('keyup', clearSelectionPreviewIfShiftReleased)
      window.addEventListener('blur', clearCellSelectionModifierState)

      const storageKey = selectionPanelPositionStorageKey.value
      if (!storageKey) {
        return
      }

      const storedPosition = window.localStorage.getItem(storageKey) as DataGridSelectionPanelPosition | null

      if (storedPosition === 'bottom-left' || storedPosition === 'bottom-right' || storedPosition === 'top-left' || storedPosition === 'top-right' || storedPosition === 'floating') {
        selectionPanelPosition.value = storedPosition
      }

      const storedFloatingPosition = window.localStorage.getItem(`${storageKey}:floating`)
      if (storedFloatingPosition) {
        try {
          const parsed = JSON.parse(storedFloatingPosition) as Partial<DataGridFloatingPosition>
          if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
            selectionPanelFloatingPosition.value = { x: parsed.x, y: parsed.y }
          }
        } catch {
          // Ignore invalid storage payloads.
        }
      }
    })

    watch(selectionPanelPosition, (position) => {
      const storageKey = selectionPanelPositionStorageKey.value
      if (!storageKey || typeof window === 'undefined') {
        return
      }

      window.localStorage.setItem(storageKey, position)
    })
    watch(selectionPanelFloatingPosition, (position) => {
      const storageKey = selectionPanelPositionStorageKey.value
      if (!storageKey || typeof window === 'undefined') {
        return
      }

      window.localStorage.setItem(`${storageKey}:floating`, JSON.stringify(position))
    })
    onBeforeUnmount(() => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', updateCellSelectionModifierState)
        window.removeEventListener('keyup', clearSelectionPreviewIfShiftReleased)
        window.removeEventListener('blur', clearCellSelectionModifierState)
      }
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
    const totalWidth = computed(() => table.getTotalSize())
    const visibleRowIndexByKey = rowIndexByKey
    const selectionPanelPositionStorageKey = computed(() => {
      if (effectiveSelectionPanelConfig.value?.positionStorageKey) {
        return effectiveSelectionPanelConfig.value.positionStorageKey
      }

      if (props.viewStorageKey) {
        return `${props.viewStorageKey}:selection-panel-position`
      }

      return ''
    })
    const visibleColumnIndexById = computed(() => new Map(visibleColumns.value.map((column, index) => [column.id, index])))
    const mergedSelectionPanelConfig = computed<DataGridSelectionPanelConfig<AnyRow> | null>(() => {
      const config = effectiveSelectionPanelConfig.value
      if (!config) {
        return null
      }

      return {
        position: selectionPanelPosition.value ?? config.position ?? defaultSelectionPanelConfig.position,
        sumColumns: config.sumColumns ?? defaultSelectionPanelConfig.sumColumns,
        actions: config.actions ?? defaultSelectionPanelConfig.actions,
        copyColumnIds: config.copyColumnIds ?? defaultSelectionPanelConfig.copyColumnIds,
        copyIncludeHeaders: config.copyIncludeHeaders ?? defaultSelectionPanelConfig.copyIncludeHeaders,
        selectedRowsLabel: config.selectedRowsLabel ?? localeText.value.selectedRowsLabel,
        copyWithHeadersLabel: config.copyWithHeadersLabel ?? localeText.value.copyWithHeadersLabel,
        copyWithoutHeadersLabel: config.copyWithoutHeadersLabel ?? localeText.value.copyWithoutHeadersLabel,
        allowPositionChange: config.allowPositionChange ?? defaultSelectionPanelConfig.allowPositionChange,
        positionStorageKey: config.positionStorageKey ?? defaultSelectionPanelConfig.positionStorageKey,
        floatingPosition: selectionPanelFloatingPosition.value ?? config.floatingPosition ?? defaultSelectionPanelConfig.floatingPosition,
      }
    })
    const selectedRows = computed(() => {
      if (!mergedSelectionPanelConfig.value || Object.keys(rowSelection.value).length === 0) {
        return []
      }

      return visibleRows.value.filter((row) => row.getIsSelected())
    })
    const rowSelectionColumnId = computed(() => mergedRowSelectionConfig.value?.columnId ?? defaultRowSelectionColumnId)
    const cellSelectionColumns = computed(() => {
      return visibleColumns.value.filter((column) => {
        const columnDef = column.columnDef as DataGridColumn<AnyRow>
        return column.id !== rowSelectionColumnId.value && columnDef.localKind !== 'action'
      })
    })
    const visibleRowIndexById = computed(() => new Map(visibleRows.value.map((row, index) => [row.id, index])))
    const cellSelectionColumnIdSet = computed(() => new Set(cellSelectionColumns.value.map((column) => column.id)))
    const cellSelectionColumnIndexById = computed(() => new Map(cellSelectionColumns.value.map((column, index) => [column.id, index])))
    const selectedCellCount = computed(() => selectedCellKeys.value.size)
    const selectedColumnIds = computed(() => {
      if (!isCellSelectionEnabled.value || selectedCellKeys.value.size === 0) {
        return []
      }

      const columns: string[] = []

      for (const column of cellSelectionColumns.value) {
        if (visibleRows.value.length > 0 && visibleRows.value.every((row) => selectedCellKeys.value.has(getCellSelectionKey(row.id, column.id)))) {
          columns.push(column.id)
        }
      }

      return columns
    })
    const selectedCellRows = computed(() => {
      if (!isCellSelectionEnabled.value || selectedCellKeys.value.size === 0) {
        return []
      }

      const columns = cellSelectionColumns.value
      return visibleRows.value
        .map((row) => {
          const selectedColumnIds = columns.filter((column) => selectedCellKeys.value.has(getCellSelectionKey(row.id, column.id))).map((column) => column.id)

          return selectedColumnIds.length > 0 ? { row, selectedColumnIds } : null
        })
        .filter(
          (
            item,
          ): item is {
            row: (typeof visibleRows.value)[number]
            selectedColumnIds: string[]
          } => Boolean(item),
        )
    })

    function renderColumnPickerLabel(column: Column<AnyRow, unknown>) {
      const columnDef = column.columnDef as DataGridColumn<AnyRow>

      if (columnDef.pickerLabel) {
        return columnDef.pickerLabel
      }

      if (typeof column.columnDef.header === 'string') {
        return column.columnDef.header
      }

      return column.id
    }

    function getCellSelectionKey(rowId: string, columnId: string) {
      return `${rowId}::${columnId}`
    }

    function isCellSelectionColumn(column: Column<AnyRow, unknown>) {
      if (!isCellSelectionEnabled.value) {
        return false
      }

      return cellSelectionColumnIdSet.value.has(column.id)
    }

    function isCellSelectionColumnId(columnId: string) {
      if (!isCellSelectionEnabled.value) {
        return false
      }

      return cellSelectionColumnIdSet.value.has(columnId)
    }

    function getCellSelectionAnchor(cell: Cell<AnyRow, unknown>): CellSelectionAnchor {
      return {
        rowId: cell.row.id,
        columnId: cell.column.id,
      }
    }

    function isCellSelected(cell: Cell<AnyRow, unknown>) {
      return selectedCellKeys.value.has(getCellSelectionKey(cell.row.id, cell.column.id))
    }

    function isCellSelectionHovered(cell: Cell<AnyRow, unknown>) {
      if (!isCellSelectionCtrlDown.value || !isCellSelectionColumn(cell.column)) {
        return false
      }

      if (isCellSelectionShiftDown.value && lastSelectedCell.value?.rowId === cell.row.id && lastSelectedCell.value.columnId === cell.column.id) {
        return false
      }

      return hoveredCellKey.value === getCellSelectionKey(cell.row.id, cell.column.id)
    }

    function getCellSelectionPreviewMode(cell: Cell<AnyRow, unknown>): SelectionPreviewMode {
      return previewCellRangeKeys.value.has(getCellSelectionKey(cell.row.id, cell.column.id))
        ? cellSelectionPreviewMode.value
        : null
    }

    function replaceSelectedCellKeys(nextKeys: Set<string>) {
      selectedCellKeys.value = new Set(nextKeys)
    }

    function getCellRangeKeys(target: CellSelectionAnchor) {
      const anchor = lastSelectedCell.value
      if (!anchor) {
        return new Set<string>()
      }

      const rows = visibleRows.value
      const columns = cellSelectionColumns.value
      const anchorRowIndex = visibleRowIndexById.value.get(anchor.rowId) ?? -1
      const targetRowIndex = visibleRowIndexById.value.get(target.rowId) ?? -1
      const anchorColumnIndex = cellSelectionColumnIndexById.value.get(anchor.columnId) ?? -1
      const targetColumnIndex = cellSelectionColumnIndexById.value.get(target.columnId) ?? -1

      if (anchorRowIndex < 0 || targetRowIndex < 0 || anchorColumnIndex < 0 || targetColumnIndex < 0) {
        return new Set<string>()
      }

      const [rowStart, rowEnd] = anchorRowIndex < targetRowIndex ? [anchorRowIndex, targetRowIndex] : [targetRowIndex, anchorRowIndex]
      const [columnStart, columnEnd] = anchorColumnIndex < targetColumnIndex ? [anchorColumnIndex, targetColumnIndex] : [targetColumnIndex, anchorColumnIndex]
      const keys = new Set<string>()

      for (let rowIndex = rowStart; rowIndex <= rowEnd; rowIndex += 1) {
        const row = rows[rowIndex]
        if (!row) {
          continue
        }

        for (let columnIndex = columnStart; columnIndex <= columnEnd; columnIndex += 1) {
          const column = columns[columnIndex]
          if (column) {
            keys.add(getCellSelectionKey(row.id, column.id))
          }
        }
      }

      return keys
    }

    function getCellRangePreviewKeys(target: CellSelectionAnchor) {
      return getCellRangeKeys(target)
    }

    function setCellRangeSelectionPreview(target: CellSelectionAnchor) {
      const rangeKeys = getCellRangePreviewKeys(target)

      if (rangeKeys.size === 0) {
        clearCellSelectionPreview()
        return
      }

      previewCellRangeKeys.value = rangeKeys
      cellSelectionPreviewMode.value = Array.from(rangeKeys).every((key) => selectedCellKeys.value.has(key))
        ? 'deselect'
        : 'select'
    }

    function selectCellRange(targetCell: Cell<AnyRow, unknown>) {
      const anchor = lastSelectedCell.value
      if (!anchor) {
        const target = getCellSelectionAnchor(targetCell)
        lastSelectedCell.value = target
        replaceSelectedCellKeys(new Set([...selectedCellKeys.value, getCellSelectionKey(target.rowId, target.columnId)]))
        return
      }

      const nextKeys = new Set(selectedCellKeys.value)
      const rangeKeys = getCellRangeKeys(getCellSelectionAnchor(targetCell))
      const shouldDeselectRange = Array.from(rangeKeys).every((key) => nextKeys.has(key))

      for (const key of rangeKeys) {
        if (shouldDeselectRange) {
          nextKeys.delete(key)
        } else {
          nextKeys.add(key)
        }
      }

      replaceSelectedCellKeys(nextKeys)
    }

    function setRowSelectionPreview(rowId: string, useRange: boolean) {
      const rows = table.getRowModel().rows
      const currentIndex = rows.findIndex((row) => row.id === rowId)

      if (currentIndex < 0) {
        clearRowSelectionPreview()
        return
      }

      const targetRow = rows[currentIndex]
      const anchorIndex = rows.findIndex((row) => row.id === lastSelectedRowId.value)

      if (useRange && anchorIndex >= 0) {
        const [start, end] = currentIndex < anchorIndex ? [currentIndex, anchorIndex] : [anchorIndex, currentIndex]
        previewSelectionRowIds.value = new Set(rows.slice(start, end + 1).map((row) => row.id))
      } else {
        previewSelectionRowIds.value = new Set([rowId])
      }

      rowSelectionPreviewMode.value = targetRow?.getIsSelected() ? 'deselect' : 'select'
    }

    function getColumnSelectionKeys(columnId: string) {
      if (!isCellSelectionColumnId(columnId)) {
        return []
      }

      return visibleRows.value.map((row) => getCellSelectionKey(row.id, columnId))
    }

    function setColumnSelectionPreview(columnId: string) {
      const columnKeys = getColumnSelectionKeys(columnId)

      if (columnKeys.length === 0) {
        clearCellSelectionPreview()
        return
      }

      previewCellRangeKeys.value = new Set(columnKeys)
      cellSelectionPreviewMode.value = columnKeys.every((key) => selectedCellKeys.value.has(key))
        ? 'deselect'
        : 'select'
    }

    function handleCellSelectionPointerEnter(cell: Cell<AnyRow, unknown>, event: PointerEvent) {
      isCellSelectionCtrlDown.value = event.ctrlKey
      isCellSelectionShiftDown.value = event.shiftKey

      if (!isCellSelectionColumn(cell.column)) {
        currentPointerCell.value = null
        clearSelectionPreviews()
        return
      }

      const target = getCellSelectionAnchor(cell)
      currentPointerCell.value = target
      updateSelectionPreviewForCurrentPointer(event)
    }

    function handleCellSelectionPointerLeave(cell: Cell<AnyRow, unknown>) {
      if (currentPointerCell.value?.rowId === cell.row.id && currentPointerCell.value.columnId === cell.column.id) {
        currentPointerCell.value = null
      }

      if (hoveredCellKey.value === getCellSelectionKey(cell.row.id, cell.column.id)) {
        clearCellSelectionPreview()
      }

      if (currentPointerCell.value === null) {
        clearSelectionPreviews()
      }
    }

    function handleCellSelectionClick(cell: Cell<AnyRow, unknown>, event: MouseEvent) {
      isCellSelectionCtrlDown.value = event.ctrlKey
      isCellSelectionShiftDown.value = event.shiftKey

      if (event.altKey && mergedRowSelectionConfig.value) {
        event.preventDefault()
        event.stopPropagation()

        const checked = !cell.row.getIsSelected()
        const rows = table.getRowModel().rows
        const currentIndex = rows.findIndex((row) => row.id === cell.row.id)
        const anchorIndex = rows.findIndex((row) => row.id === lastSelectedRowId.value)

        if (event.shiftKey && currentIndex >= 0 && anchorIndex >= 0) {
          const [start, end] = currentIndex < anchorIndex ? [currentIndex, anchorIndex] : [anchorIndex, currentIndex]

          for (let index = start; index <= end; index += 1) {
            rows[index]?.toggleSelected(checked)
          }
        } else {
          cell.row.toggleSelected(checked)
        }

        lastSelectedRowId.value = cell.row.id
        clearRowSelectionPreview()
        return true
      }

      if (event.shiftKey && !event.ctrlKey && isCellSelectionColumn(cell.column)) {
        event.preventDefault()
        event.stopPropagation()
        clearCellSelectionPreview()
        toggleColumnSelection(cell.column)
        return true
      }

      if (!event.ctrlKey || !isCellSelectionColumn(cell.column)) {
        return false
      }

      event.preventDefault()
      event.stopPropagation()

      if (event.shiftKey) {
        selectCellRange(cell)
        updateSelectionPreviewForCurrentPointer(event)
        return true
      }

      const anchor = getCellSelectionAnchor(cell)
      const key = getCellSelectionKey(anchor.rowId, anchor.columnId)
      const nextKeys = new Set(selectedCellKeys.value)

      if (nextKeys.has(key)) {
        nextKeys.delete(key)
      } else {
        nextKeys.add(key)
      }

      lastSelectedCell.value = anchor
      clearCellSelectionPreview()
      replaceSelectedCellKeys(nextKeys)
      return true
    }

    function toggleColumnSelection(column: Column<AnyRow, unknown>) {
      if (!isCellSelectionColumn(column)) {
        return
      }

      const columnKeys = visibleRows.value.map((row) => getCellSelectionKey(row.id, column.id))

      if (columnKeys.length === 0) {
        return
      }

      const nextKeys = new Set(selectedCellKeys.value)
      const isFullySelected = columnKeys.every((key) => nextKeys.has(key))

      for (const key of columnKeys) {
        if (isFullySelected) {
          nextKeys.delete(key)
        } else {
          nextKeys.add(key)
        }
      }

      const firstRow = visibleRows.value[0]
      if (firstRow) {
        lastSelectedCell.value = {
          rowId: firstRow.id,
          columnId: column.id,
        }
      }

      replaceSelectedCellKeys(nextKeys)
    }

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
    const showViewsMenu = computed(() => Boolean(props.viewStorageKey) || Boolean(props.savedViewsPersistence))
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

    const serverFilterColumns = computed(() => allLeafColumns.value.filter((column) => Boolean((column.columnDef as DataGridColumn<AnyRow>).serverField)))
    const toolbarFilterConfigs = computed(() => {
      const columnConfigs = allLeafColumns.value
        .filter((column) => {
          const columnDef = column.columnDef as DataGridColumn<AnyRow>
          const isServerColumn = Boolean(columnDef.serverField)
          return columnDef.showFilter ?? isServerColumn
        })
        .map((column) => getColumnFilterConfig(column))

      return [
        ...columnConfigs,
        ...props.toolbarFilters.map((config) => ({
          ...config,
          group: config.group ?? localeText.value.extraFiltersGroupLabel,
        })),
      ]
    })
    const filterDialogSections = computed<FilterDialogSection[]>(() => {
      const sectionMap = new Map<string, FilterDialogSection>()

      for (const config of toolbarFilterConfigs.value) {
        const groupLabel = config.group?.trim() || localeText.value.columnFiltersGroupLabel
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
      if (props.quickFilters.length === 0) {
        return []
      }

      const configById = new Map(toolbarFilterConfigs.value.map((config) => [config.id, config]))

      return props.quickFilters
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
      const searchFilterCount = globalFilter.value.trim() ? 1 : 0
      return columnFilters.value.length + searchFilterCount
    })
    const excelExportConfig = computed<DataGridExcelExportConfig<AnyRow>>(() => (effectiveExcelExportInput.value === false ? { enabled: false } : (effectiveExcelExportInput.value ?? {})))
    const isExcelExportEnabled = computed(() => excelExportConfig.value.enabled ?? true)
    const defaultExcelExportModes: DataGridExcelExportMode[] = ['view-all-rows', 'view-current-page', 'all-columns-all-rows', 'all-columns-current-page']
    const excelExportActions = computed(() => {
      if (!isExcelExportEnabled.value) {
        return []
      }

      const labels: Record<DataGridExcelExportMode, string> = {
        'view-all-rows': localeText.value.exportExcelViewAllRowsLabel,
        'view-current-page': localeText.value.exportExcelViewCurrentPageLabel,
        'all-columns-all-rows': localeText.value.exportExcelAllColumnsAllRowsLabel,
        'all-columns-current-page': localeText.value.exportExcelAllColumnsCurrentPageLabel,
      }

      return (excelExportConfig.value.modes && excelExportConfig.value.modes.length > 0 ? excelExportConfig.value.modes : defaultExcelExportModes).map((mode) => ({
        mode,
        label: labels[mode],
      }))
    })

    const requestedServerColumns = computed(() => {
      const requested = new Set<string>(['id'])

      for (const column of visibleColumns.value) {
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

    const { refreshData } = useDataGridDataLoading({
      requestState,
      isLoading,
      errorMessage,
      enabled: isInitialViewLoaded,
      pagination,
      sorting,
      columnFilters,
      globalFilter,
      requestedServerColumnsKey,
      localeText,
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

    watch(
      [visibleRows, cellSelectionColumns],
      ([rows, columns]) => {
        if (!isCellSelectionEnabled.value || selectedCellKeys.value.size === 0) {
          return
        }

        const availableKeys = new Set<string>()
        for (const row of rows) {
          for (const column of columns) {
            availableKeys.add(getCellSelectionKey(row.id, column.id))
          }
        }

        const nextKeys = new Set(Array.from(selectedCellKeys.value).filter((key) => availableKeys.has(key)))

        if (nextKeys.size !== selectedCellKeys.value.size) {
          selectedCellKeys.value = nextKeys
        }

        if (lastSelectedCell.value && !availableKeys.has(getCellSelectionKey(lastSelectedCell.value.rowId, lastSelectedCell.value.columnId))) {
          lastSelectedCell.value = null
        }
      },
      { flush: 'post' },
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

    function getColumnMenuStyle(column: Column<AnyRow, unknown>): CSSProperties {
      const pinnedSide = getPinnedSide(column.id)

      if (pinnedSide === 'left') {
        return {
          left: '0',
          right: 'auto',
        }
      }

      if (pinnedSide === 'right') {
        return {
          left: 'auto',
          right: '0',
        }
      }

      const columnIndex = visibleColumnIndexById.value.get(column.id) ?? -1
      const visibleCount = visibleColumns.value.length
      const isNearRightEdge = columnIndex >= Math.max(visibleCount - 2, 0)

      if (isNearRightEdge) {
        return {
          left: 'auto',
          right: '0',
        }
      }

      return {
        left: '0',
        right: 'auto',
      }
    }

    function renderCell(cell: Cell<AnyRow, unknown>) {
      const columnDef = cell.column.columnDef as DataGridColumn<AnyRow>
      const context = cell.getContext()
      const renderProps: CellRenderProps = {
        table: context.table,
        column: context.column,
        row: context.row,
        cell: context.cell,
        getValue: context.getValue,
        renderValue: context.renderValue,
        align: columnDef.align ?? 'start',
      }

      return renderFlexibleContent(cell.column.columnDef.cell, renderProps as Record<string, unknown>)
    }

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

    return () => {
      const pageCount = requestState.value.pageCount
      const pageIndex = pagination.value.pageIndex
      const paginationItems = buildPaginationItems(pageCount, pageIndex)
      const selectionPanelSections: SelectionPanelSection[] = []

      if (selectedRows.value.length > 0) {
        selectionPanelSections.push({
          id: 'rows',
          label: mergedSelectionPanelConfig.value?.selectedRowsLabel ?? 'Zaznaczone wiersze',
          count: selectedRows.value.length,
          copyLabel: localeText.value.copyRowsLabel,
          clearLabel: 'Wyczysc wiersze',
          onCopy: (options: { includeHeaders: boolean }) => copySelectedRows(options.includeHeaders),
          onClear: clearSelectedRows,
        })
      }

      const selectedRowActionContext: DataGridSelectionPanelActionContext<AnyRow> = {
        selectedRows: selectedRows.value.map((row) => row.original),
        selectedRowIds: selectedRows.value.map((row) => row.original.id as string | number),
        clearSelection: clearSelectedRows,
      }

      const selectionPanelActions =
        mergedSelectionPanelConfig.value?.actions
          ?.filter((action) => {
            const hidden = typeof action.hidden === 'function' ? action.hidden(selectedRowActionContext) : (action.hidden ?? false)
            return !hidden
          })
          .map((action) => ({
            id: action.id,
            label: action.label,
            title: action.title,
            disabled: typeof action.disabled === 'function' ? action.disabled(selectedRowActionContext) : (action.disabled ?? false),
            onClick: () => action.onClick(selectedRowActionContext),
          })) ?? []

      if (selectedColumnIds.value.length > 0) {
        selectionPanelSections.push({
          id: 'columns',
          label: localeText.value.selectedColumnsLabel,
          count: selectedColumnIds.value.length,
          copyLabel: localeText.value.copyColumnsLabel,
          clearLabel: 'Wyczysc kolumny',
          onCopy: (options: { includeHeaders: boolean }) => copySelectedCells(options.includeHeaders),
          onClear: clearSelectedColumns,
        })
      }

      if (selectedCellCount.value > 0) {
        selectionPanelSections.push({
          id: 'cells',
          label: localeText.value.selectedCellsLabel,
          count: selectedCellCount.value,
          copyLabel: localeText.value.copyCellsLabel,
          clearLabel: 'Wyczysc komorki',
          onCopy: (options: { includeHeaders: boolean }) => copySelectedCells(options.includeHeaders),
          onClear: clearSelectedCells,
        })
      }

      return (
        <section
          class={['data-grid', isAutoHeight.value ? 'data-grid--fill-height' : '']}
          style={
            {
              '--app-bg': 'var(--data-grid-bg, #212121)',
              '--app-surface': 'var(--data-grid-surface, #2a2a2a)',
              '--app-surface-muted': 'var(--data-grid-surface-muted, #303030)',
              '--app-surface-soft': 'var(--data-grid-surface-soft, #383838)',
              '--app-surface-strong': 'var(--data-grid-surface-strong, #434343)',
              '--app-text': 'var(--data-grid-text, #f3f4f6)',
              '--app-text-muted': 'var(--data-grid-text-muted, #b6bbc2)',
              '--app-text-soft': 'var(--data-grid-text-soft, #d3d7dd)',
              '--app-border': 'var(--data-grid-border, #3b3b3b)',
              '--app-border-strong': 'var(--data-grid-border-strong, #4a4a4a)',
              '--app-accent': 'var(--data-grid-accent, #7cb8ff)',
              '--app-accent-soft': 'var(--data-grid-accent-soft, rgb(124 184 255 / 0.2))',
              '--app-accent-soft-strong': 'var(--data-grid-accent-soft-strong, rgb(124 184 255 / 0.12))',
              '--app-row-selected': 'var(--data-grid-row-selected, #4b5f7b)',
              '--app-row-selected-hover': 'var(--data-grid-row-selected-hover, #5d7493)',
              '--app-shadow': 'var(--data-grid-shadow, 0 16px 40px -28px rgb(0 0 0 / 0.78))',
              '--app-shadow-soft': 'var(--data-grid-shadow-soft, 0 10px 30px rgb(0 0 0 / 0.4))',
              '--app-shadow-dialog': 'var(--data-grid-shadow-dialog, 0 30px 60px -30px rgb(0 0 0 / 0.9))',
              '--app-overlay': 'var(--data-grid-overlay, rgb(0 0 0 / 0.6))',
              '--app-row-hover': 'var(--data-grid-row-hover, #343434)',
              '--app-badge-bg': 'var(--data-grid-badge-bg, #404040)',
              '--app-badge-text': 'var(--data-grid-badge-text, #eef4ff)',
              '--app-pagination-bg': 'var(--data-grid-pagination-bg, #2c2c2c)',
              '--app-pagination-hover': 'var(--data-grid-pagination-hover, #3a3a3a)',
              '--app-pagination-active': 'var(--data-grid-pagination-active, #4a4a4a)',
              '--app-pagination-text': 'var(--data-grid-pagination-text, #f3f4f6)',
              '--app-pagination-muted': 'var(--data-grid-pagination-muted, #a7adb6)',
              '--app-error': 'var(--data-grid-error, #ff8d8d)',
              '--app-header-start': 'var(--data-grid-header-start, #2c2c2c)',
              '--app-header-end': 'var(--data-grid-header-end, #252525)',
              '--app-grid-shadow': 'var(--data-grid-grid-shadow, rgb(0 0 0 / 0.42))',
            } as Record<string, string>
          }
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
                  '--data-grid-header-height': `${headerHeight}px`,
                } as Record<string, string>
              }
            >
              <div ref={scrollElementRef} class={['data-grid__viewport', isLoading.value && mergedLoadingConfig.value.variant === 'overlay' ? 'data-grid__viewport--loading' : '']}>
                <div
                  class="data-grid__inner"
                  style={{
                    width: `${totalWidth.value}px`,
                    height: `${totalRowHeight.value + headerHeight}px`,
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
            {mergedSelectionPanelConfig.value && selectionPanelSections.length > 0 ? (
              <DataGridSelectionPanel
                position={mergedSelectionPanelConfig.value.position ?? selectionPanelPosition.value ?? 'bottom-right'}
                floatingPosition={mergedSelectionPanelConfig.value.floatingPosition ?? selectionPanelFloatingPosition.value ?? null}
                selectedRowsCount={selectionPanelSections.reduce((total, section) => total + section.count, 0)}
                selectedRowsLabel={localeText.value.selectedRowsTotalLabel}
                sections={selectionPanelSections}
                actions={selectionPanelActions}
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
