import {
  computed,
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type CSSProperties,
  type PropType,
} from 'vue'
import {
  FlexRender,
  getCoreRowModel,
  useVueTable,
  type Cell,
  type Column,
  type ColumnFiltersState,
  type ColumnOrderState,
  type ColumnPinningState,
  type ColumnSizingState,
  type ColumnSort,
  type Header,
  type PaginationState,
  type RowSelectionState,
} from '@tanstack/vue-table'
import { useVirtualizer } from '@tanstack/vue-virtual'

import DataGridBodyRow from './components/DataGridBodyRow'
import DataGridDialog from './components/DataGridDialog'
import DataGridColumnPickerDialog from './components/DataGridColumnPickerDialog'
import DataGridFooter from './components/DataGridFooter'
import DataGridFilterDialog from './components/DataGridFilterDialog'
import DataGridHeaderCell from './components/DataGridHeaderCell'
import DataGridSaveViewDialog from './components/DataGridSaveViewDialog'
import DataGridSelectionPanel from './components/DataGridSelectionPanel'
import DataGridToolbar from './components/DataGridToolbar'
import { useDataGridFilters } from './composables/useDataGridFilters'
import type {
  DataGridColumnAlign,
  DataGridColumn,
  DataGridFilterConfig,
  DataGridQuickFilterConfig,
  DataGridColumnVisibilityState,
  DataGridFetchParams,
  DataGridFetchResult,
  DataGridInitialState,
  DataGridMetaConfig,
  DataGridPageSizeConfig,
  DataGridSelectionPanelConfig,
  DataGridSelectionPanelSumConfig,
  DataGridSavedView,
  DataGridSavedViewState,
} from './types'

type AnyRow = Record<string, unknown>

type RequestState<TData extends AnyRow> = {
  rows: TData[]
  totalRows: number
  pageCount: number
  meta?: Record<string, unknown>
}

type FilterDialogSection = {
  id: string
  label: string
  items: DataGridFilterConfig[]
}

type RenderedSequenceItem<TItem> =
  | { type: 'spacer'; key: string; width: number }
  | { type: 'item'; key: string; item: TItem; column: Column<AnyRow, unknown> }

type PaginationItem =
  | { type: 'page'; value: number }
  | { type: 'ellipsis'; key: string }

type CellRenderProps = {
  table: ReturnType<Cell<AnyRow, unknown>['getContext']>['table']
  column: ReturnType<Cell<AnyRow, unknown>['getContext']>['column']
  row: ReturnType<Cell<AnyRow, unknown>['getContext']>['row']
  cell: ReturnType<Cell<AnyRow, unknown>['getContext']>['cell']
  getValue: ReturnType<Cell<AnyRow, unknown>['getContext']>['getValue']
  renderValue: ReturnType<Cell<AnyRow, unknown>['getContext']>['renderValue']
  align: DataGridColumnAlign
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
  selectedRowsLabel: 'Zaznaczone wiersze',
  copyWithHeadersLabel: 'Kopiuj z naglowkami',
  copyWithoutHeadersLabel: 'Kopiuj bez naglowkow',
}

function toNumber(value: string, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toJustifyContent(align?: DataGridColumnAlign) {
  if (align === 'center') {
    return 'center'
  }

  if (align === 'end') {
    return 'flex-end'
  }

  return 'flex-start'
}

function createViewId() {
  return `view-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function buildPaginationItems(pageCount: number, pageIndex: number): PaginationItem[] {
  if (pageCount <= 0) {
    return []
  }

  if (pageCount <= 8) {
    return Array.from({ length: pageCount }, (_, index) => ({
      type: 'page',
      value: index,
    }))
  }

  const pages = new Set<number>()
  pages.add(0)
  pages.add(pageCount - 1)

  if (pageIndex <= 3) {
    for (let index = 0; index <= 5; index += 1) {
      pages.add(index)
    }
  } else if (pageIndex >= pageCount - 4) {
    for (let index = pageCount - 6; index < pageCount; index += 1) {
      pages.add(index)
    }
  } else {
    for (let index = pageIndex - 2; index <= pageIndex + 2; index += 1) {
      pages.add(index)
    }
  }

  const orderedPages = Array.from(pages).sort((left, right) => left - right)
  const items: PaginationItem[] = []

  for (let index = 0; index < orderedPages.length; index += 1) {
    const page = orderedPages[index]
    if (typeof page !== 'number') {
      continue
    }

    items.push({
      type: 'page',
      value: page,
    })

    const nextPage = orderedPages[index + 1]
    if (typeof nextPage === 'number' && nextPage - page > 1) {
      items.push({
        type: 'ellipsis',
        key: `ellipsis-${page}-${nextPage}`,
      })
    }
  }

  return items
}

function cloneViewState(state: DataGridSavedViewState): DataGridSavedViewState {
  return {
    columnOrder: [...state.columnOrder],
    columnSizing: { ...state.columnSizing },
    columnVisibility: { ...state.columnVisibility },
    columnPinning: {
      left: [...(state.columnPinning.left ?? [])],
      right: [...(state.columnPinning.right ?? [])],
    },
    columnFilters: state.columnFilters.map((filter) => ({
      id: filter.id,
      value: Array.isArray(filter.value) ? [...filter.value] : filter.value,
    })),
    globalFilter: state.globalFilter,
  }
}

function cloneColumnFilters(filters: ColumnFiltersState): ColumnFiltersState {
  return filters.map((filter) => ({
    id: filter.id,
    value: Array.isArray(filter.value) ? [...filter.value] : filter.value,
  }))
}

function cloneColumnPinningState(state: ColumnPinningState): ColumnPinningState {
  return {
    left: [...(state.left ?? [])],
    right: [...(state.right ?? [])],
  }
}

function toFilterGroupId(label: string) {
  return label.trim().toLocaleLowerCase().replace(/\s+/g, '-')
}

function escapeClipboardCell(value: string) {
  if (value.includes('\t') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`
  }

  return value
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
      type: Function as PropType<
        (params: DataGridFetchParams, signal?: AbortSignal) => Promise<DataGridFetchResult<any>>
      >,
      required: true,
    },
    initialState: {
      type: Object as PropType<DataGridInitialState>,
      default: () => ({}),
    },
    rowHeight: {
      type: Number,
      default: 42,
    },
    overscanRows: {
      type: Number,
      default: 10,
    },
    overscanColumns: {
      type: Number,
      default: 3,
    },
    height: {
      type: Number,
      default: 560,
    },
    viewStorageKey: {
      type: String,
      default: '',
    },
    metaItems: {
      type: Array as PropType<DataGridMetaConfig[]>,
      default: () => defaultMetaItems.map((item) => ({ ...item })),
    },
    pageSizeConfig: {
      type: Object as PropType<DataGridPageSizeConfig>,
      default: () => ({
        label: defaultPageSizeConfig.label,
        options: [...(defaultPageSizeConfig.options ?? [])],
      }),
    },
    selectionPanelConfig: {
      type: Object as PropType<DataGridSelectionPanelConfig | undefined>,
      default: undefined,
    },
  },
  setup(props) {
    const scrollElementRef = ref<HTMLDivElement | null>(null)
    const pagination = ref<PaginationState>(
      props.initialState.pagination ?? {
        pageIndex: 0,
        pageSize: 100,
      },
    )
    const sorting = ref<ColumnSort[]>(props.initialState.sorting ?? [])
    const columnOrder = ref<ColumnOrderState>(props.initialState.columnOrder ?? [])
    const columnSizing = ref<ColumnSizingState>(props.initialState.columnSizing ?? {})
    const columnVisibility = ref<DataGridColumnVisibilityState>(
      props.initialState.columnVisibility ?? {},
    )
    const columnPinning = ref<ColumnPinningState>(
      props.initialState.columnPinning ?? {
        left: [],
        right: [],
      },
    )
    const columnFilters = ref<ColumnFiltersState>(props.initialState.columnFilters ?? [])
    const globalFilter = ref(props.initialState.globalFilter ?? '')
    const rowSelection = ref<RowSelectionState>({})
    const openMenuColumnId = ref<string | null>(null)
    const isColumnPickerOpen = ref(false)
    const isFilterDialogOpen = ref(false)
    const isViewsMenuOpen = ref(false)
    const isSaveViewDialogOpen = ref(false)
    const newViewName = ref('')
    const columnMoveTargetById = ref<Record<string, string>>({})
    const draftColumnVisibility = ref<DataGridColumnVisibilityState>({})
    const draftColumnSizing = ref<ColumnSizingState>({})
    const draftColumnPinning = ref<ColumnPinningState>({
      left: [],
      right: [],
    })
    const draftColumnOrder = ref<ColumnOrderState>([])
    const draftColumnMoveTargetById = ref<Record<string, string>>({})
    const draftColumnFilters = ref<ColumnFiltersState>([])
    const draftGlobalFilter = ref('')
    const requestState = ref<RequestState<AnyRow>>({
      rows: [],
      totalRows: 0,
      pageCount: 0,
      meta: undefined,
    })
    const isLoading = ref(false)
    const errorMessage = ref('')
    const savedViews = ref<DataGridSavedView[]>([])
    const activeViewId = ref('')

    let debounceTimer: ReturnType<typeof setTimeout> | undefined
    let activeController: AbortController | null = null
    let measureFrame: number | null = null

    function closeOverlayState(options?: { keepDialogsOpen?: boolean }) {
      openMenuColumnId.value = null
      isViewsMenuOpen.value = false
      isSaveViewDialogOpen.value = false

      if (!options?.keepDialogsOpen) {
        isFilterDialogOpen.value = false
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

    function getCurrentViewState(): DataGridSavedViewState {
      return {
        columnOrder: [...columnOrder.value],
        columnSizing: { ...columnSizing.value },
        columnVisibility: { ...columnVisibility.value },
        columnPinning: {
          left: [...(columnPinning.value.left ?? [])],
          right: [...(columnPinning.value.right ?? [])],
        },
        columnFilters: columnFilters.value.map((filter) => ({
          id: filter.id,
          value: Array.isArray(filter.value) ? [...filter.value] : filter.value,
        })),
        globalFilter: globalFilter.value,
      }
    }

    function applyViewState(state: DataGridSavedViewState) {
      const nextState = cloneViewState(state)
      columnOrder.value = nextState.columnOrder
      columnSizing.value = nextState.columnSizing
      columnVisibility.value = nextState.columnVisibility
      columnPinning.value = nextState.columnPinning
      columnFilters.value = nextState.columnFilters
      globalFilter.value = nextState.globalFilter
      pagination.value = {
        ...pagination.value,
        pageIndex: 0,
      }
      rowSelection.value = {}
      openMenuColumnId.value = null
      closeFilterMenus()
      isViewsMenuOpen.value = false
      isSaveViewDialogOpen.value = false
      columnVirtualizer.value.measure()
    }

    function getDefaultViewState(): DataGridSavedViewState {
      return {
        columnOrder: [...(props.initialState.columnOrder ?? [])],
        columnSizing: { ...(props.initialState.columnSizing ?? {}) },
        columnVisibility: { ...(props.initialState.columnVisibility ?? {}) },
        columnPinning: {
          left: [...(props.initialState.columnPinning?.left ?? [])],
          right: [...(props.initialState.columnPinning?.right ?? [])],
        },
        columnFilters: (props.initialState.columnFilters ?? []).map((filter) => ({
          id: filter.id,
          value: Array.isArray(filter.value) ? [...filter.value] : filter.value,
        })),
        globalFilter: props.initialState.globalFilter ?? '',
      }
    }

    function syncColumnDialogDraftState() {
      draftColumnVisibility.value = { ...columnVisibility.value }
      draftColumnSizing.value = { ...columnSizing.value }
      draftColumnPinning.value = cloneColumnPinningState(columnPinning.value)
      draftColumnOrder.value = [...allLeafColumns.value.map((column) => column.id)]
      draftColumnMoveTargetById.value = { ...columnMoveTargetById.value }
    }

    function syncFilterDialogDraftState() {
      draftColumnFilters.value = cloneColumnFilters(columnFilters.value)
      draftGlobalFilter.value = globalFilter.value
    }

    function loadSavedViews() {
      if (!props.viewStorageKey || typeof window === 'undefined') {
        savedViews.value = []
        return
      }

      try {
        const rawValue = window.localStorage.getItem(props.viewStorageKey)
        if (!rawValue) {
          savedViews.value = []
          return
        }

        const parsed = JSON.parse(rawValue)
        savedViews.value = Array.isArray(parsed) ? (parsed as DataGridSavedView[]) : []
      } catch {
        savedViews.value = []
      }
    }

    function persistSavedViews() {
      if (!props.viewStorageKey || typeof window === 'undefined') {
        return
      }

      window.localStorage.setItem(props.viewStorageKey, JSON.stringify(savedViews.value))
    }

    function selectSavedView(viewId: string) {
      activeViewId.value = viewId

      if (!viewId) {
        applyViewState(getDefaultViewState())
        return
      }

      const selectedView = savedViews.value.find((view) => view.id === viewId)
      if (!selectedView) {
        activeViewId.value = ''
        return
      }

      applyViewState(selectedView.state)
    }

    function createNewView(name: string) {
      const now = new Date().toISOString()
      const nextView: DataGridSavedView = {
        id: createViewId(),
        name,
        state: getCurrentViewState(),
        createdAt: now,
        updatedAt: now,
      }

      savedViews.value = [...savedViews.value, nextView]
      activeViewId.value = nextView.id
      persistSavedViews()
    }

    function openSaveViewDialog() {
      newViewName.value = ''
      isSaveViewDialogOpen.value = true
      isViewsMenuOpen.value = false
      openMenuColumnId.value = null
      closeFilterMenus()
      isColumnPickerOpen.value = false
      isFilterDialogOpen.value = false
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

      createNewView(name)
      closeSaveViewDialog()
    }

    function overwriteActiveView() {
      if (!activeViewId.value) {
        openSaveViewDialog()
        return
      }

      const currentView = savedViews.value.find((view) => view.id === activeViewId.value)
      if (!currentView) {
        activeViewId.value = ''
        openSaveViewDialog()
        return
      }

      savedViews.value = savedViews.value.map((view) =>
        view.id === activeViewId.value
          ? {
              ...view,
              state: getCurrentViewState(),
              updatedAt: new Date().toISOString(),
            }
          : view,
      )
      persistSavedViews()
    }

    function deleteActiveView() {
      if (!activeViewId.value) {
        return
      }

      const currentView = savedViews.value.find((view) => view.id === activeViewId.value)
      if (!currentView) {
        activeViewId.value = ''
        return
      }

      const confirmed = window.confirm(`Usunac widok "${currentView.name}"?`)
      if (!confirmed) {
        return
      }

      savedViews.value = savedViews.value.filter((view) => view.id !== activeViewId.value)
      activeViewId.value = ''
      persistSavedViews()
      selectSavedView('')
    }

    function toggleViewsMenu() {
      isViewsMenuOpen.value = !isViewsMenuOpen.value
      openMenuColumnId.value = null
      closeFilterMenus()
      isColumnPickerOpen.value = false
      isFilterDialogOpen.value = false
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
      isViewsMenuOpen.value = false
      isSaveViewDialogOpen.value = false
    }

    const table = useVueTable({
      get data() {
        return requestState.value.rows
      },
      get columns() {
        return props.columns
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
        columnVisibility.value =
          typeof updater === 'function' ? updater(columnVisibility.value) : updater
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
      getRowId: (row, index) => String((row as { id?: string | number }).id ?? index),
      get pageCount() {
        return requestState.value.pageCount
      },
    })

    const allLeafColumns = computed(() => table.getAllLeafColumns())
    const allLeafColumnsById = computed(
      () => new Map(allLeafColumns.value.map((column) => [column.id, column])),
    )
    const visibleColumns = computed(() => table.getVisibleLeafColumns())
    const visibleHeaders = computed(() => table.getHeaderGroups()[0]?.headers ?? [])
    const visibleRows = computed(() => table.getRowModel().rows)
    const totalWidth = computed(() => table.getTotalSize())
    const leftPinnedColumnIds = computed(() => new Set(columnPinning.value.left ?? []))
    const rightPinnedColumnIds = computed(() => new Set(columnPinning.value.right ?? []))
    const visibleColumnIndexById = computed(
      () => new Map(visibleColumns.value.map((column, index) => [column.id, index])),
    )
    const mergedSelectionPanelConfig = computed<DataGridSelectionPanelConfig | null>(() => {
      if (!props.selectionPanelConfig) {
        return null
      }

      return {
        position: props.selectionPanelConfig.position ?? defaultSelectionPanelConfig.position,
        sumColumns: props.selectionPanelConfig.sumColumns ?? defaultSelectionPanelConfig.sumColumns,
        copyColumnIds:
          props.selectionPanelConfig.copyColumnIds ?? defaultSelectionPanelConfig.copyColumnIds,
        selectedRowsLabel:
          props.selectionPanelConfig.selectedRowsLabel ??
          defaultSelectionPanelConfig.selectedRowsLabel,
        copyWithHeadersLabel:
          props.selectionPanelConfig.copyWithHeadersLabel ??
          defaultSelectionPanelConfig.copyWithHeadersLabel,
        copyWithoutHeadersLabel:
          props.selectionPanelConfig.copyWithoutHeadersLabel ??
          defaultSelectionPanelConfig.copyWithoutHeadersLabel,
      }
    })
    const selectedRows = computed(() => {
      if (!mergedSelectionPanelConfig.value || Object.keys(rowSelection.value).length === 0) {
        return []
      }

      return visibleRows.value.filter((row) => row.getIsSelected())
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

    const { closeFilterMenus, getColumnFilterConfig, renderFilterControl } = useDataGridFilters({
      columnFilters,
      draftColumnFilters,
      pagination,
      renderColumnPickerLabel,
      onOpenFilterMenu: closeOverlayState,
    })

    function getPinnedSide(columnId: string): 'left' | 'right' | false {
      if (leftPinnedColumnIds.value.has(columnId)) {
        return 'left'
      }

      if (rightPinnedColumnIds.value.has(columnId)) {
        return 'right'
      }

      return false
    }

    const nonPinnedColumns = computed(() =>
      visibleColumns.value.filter((column) => !getPinnedSide(column.id)),
    )

    const rowVirtualizer = useVirtualizer<HTMLDivElement, HTMLDivElement>(
      computed(() => ({
        count: visibleRows.value.length,
        getScrollElement: () => scrollElementRef.value,
        estimateSize: () => props.rowHeight,
        overscan: props.overscanRows,
      })),
    )

    const columnVirtualizer = useVirtualizer<HTMLDivElement, HTMLDivElement>(
      computed(() => ({
        horizontal: true,
        count: nonPinnedColumns.value.length,
        getScrollElement: () => scrollElementRef.value,
        estimateSize: (index) => nonPinnedColumns.value[index]?.getSize() ?? 160,
        overscan: props.overscanColumns,
      })),
    )

    const virtualRows = computed(() => rowVirtualizer.value.getVirtualItems())
    const virtualNonPinnedColumns = computed(() => columnVirtualizer.value.getVirtualItems())
    const totalRowHeight = computed(() => rowVirtualizer.value.getTotalSize())
    const renderedNonPinnedIds = computed(
      () =>
        new Set(
          virtualNonPinnedColumns.value
            .map((virtualColumn) => nonPinnedColumns.value[virtualColumn.index]?.id)
            .filter((value): value is string => Boolean(value)),
        ),
    )
    const headerSequence = computed(() =>
      buildRenderedColumnSequence(
        visibleHeaders.value,
        (header) => header.column,
        renderedNonPinnedIds.value,
      ),
    )
    const rowSequence = computed(() =>
      buildRenderedColumnSequence(
        visibleColumns.value,
        (column) => column,
        renderedNonPinnedIds.value,
      ),
    )
    const cellStylesByColumnId = computed(() => {
      const styles = new Map<string, CSSProperties>()
      let leftOffset = 0
      const leftPinnedIds = columnPinning.value.left ?? []
      const rightPinnedIds = columnPinning.value.right ?? []

      for (let index = 0; index < leftPinnedIds.length; index += 1) {
        const columnId = leftPinnedIds[index]
        if (!columnId) {
          continue
        }
        const column = allLeafColumnsById.value.get(columnId)
        if (!column || !visibleColumnIndexById.value.has(columnId)) {
          continue
        }

        styles.set(column.id, {
          width: `${column.getSize()}px`,
          left: `${leftOffset}px`,
          zIndex: `${60 - index}`,
          justifyContent: toJustifyContent((column.columnDef as DataGridColumn<AnyRow>).align),
        })
        leftOffset += column.getSize()
      }

      let rightOffset = 0
      for (let index = rightPinnedIds.length - 1; index >= 0; index -= 1) {
        const columnId = rightPinnedIds[index]
        if (!columnId) {
          continue
        }
        const column = allLeafColumnsById.value.get(columnId)
        if (!column || !visibleColumnIndexById.value.has(columnId)) {
          continue
        }

        styles.set(column.id, {
          width: `${column.getSize()}px`,
          right: `${rightOffset}px`,
          zIndex: `${60 - index}`,
          justifyContent: toJustifyContent((column.columnDef as DataGridColumn<AnyRow>).align),
        })
        rightOffset += column.getSize()
      }

      for (const column of visibleColumns.value) {
        if (styles.has(column.id)) {
          continue
        }

        styles.set(column.id, {
          width: `${column.getSize()}px`,
          justifyContent: toJustifyContent((column.columnDef as DataGridColumn<AnyRow>).align),
        })
      }

      return styles
    })

    const serverFilterColumns = computed(() =>
      allLeafColumns.value.filter(
        (column) => Boolean((column.columnDef as DataGridColumn<AnyRow>).serverField),
      ),
    )
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
          group: config.group ?? 'Dodatkowe filtry',
        })),
      ]
    })
    const filterDialogSections = computed<FilterDialogSection[]>(() => {
      const sectionMap = new Map<string, FilterDialogSection>()

      for (const config of toolbarFilterConfigs.value) {
        const groupLabel = config.group?.trim() || 'Kolumny'
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
          ): quickFilter is DataGridQuickFilterConfig & { config: DataGridFilterConfig } =>
            Boolean(quickFilter),
        )
    })
    const activeFilterCount = computed(() => {
      const searchFilterCount = globalFilter.value.trim() ? 1 : 0
      return columnFilters.value.length + searchFilterCount
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

      return Array.from(requested)
    })

    async function loadData() {
      if (activeController) {
        activeController.abort()
      }

      activeController = new AbortController()
      isLoading.value = true
      errorMessage.value = ''

      try {
        const response = await props.fetchPage(
          {
            pageIndex: pagination.value.pageIndex,
            pageSize: pagination.value.pageSize,
            sorting: sorting.value,
            filters: columnFilters.value,
            search: globalFilter.value.trim() || undefined,
            include_columns: requestedServerColumns.value,
          },
          activeController.signal,
        )

        requestState.value = {
          rows: response.rows,
          totalRows: response.totalRows,
          pageCount: response.pageCount,
          meta: response.meta,
        }

        rowVirtualizer.value.scrollToOffset(0)
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        errorMessage.value = error instanceof Error ? error.message : 'Nie udalo sie pobrac danych.'
        requestState.value = {
          rows: [],
          totalRows: 0,
          pageCount: 0,
          meta: undefined,
        }
      } finally {
        isLoading.value = false
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

    watch(
      [pagination, sorting, columnFilters, globalFilter, requestedServerColumns],
      () => {
        if (debounceTimer) {
          clearTimeout(debounceTimer)
        }

        debounceTimer = setTimeout(() => {
          void loadData()
        }, 180)
      },
      { immediate: true },
    )

    watch(
      () => [columnVisibility.value, columnPinning.value, columnOrder.value, columnSizing.value],
      () => {
        scheduleColumnMeasure()
      },
      { deep: true },
    )

    onBeforeUnmount(() => {
      document.removeEventListener('click', handleDocumentClick)

      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }

      if (activeController) {
        activeController.abort()
      }

      if (measureFrame !== null && typeof window !== 'undefined') {
        window.cancelAnimationFrame(measureFrame)
      }
    })

    onMounted(() => {
      document.addEventListener('click', handleDocumentClick)
      loadSavedViews()
    })

    function getOrderedLeafColumns(columnIds: string[]) {
      const columnById = new Map(allLeafColumnsById.value)
      const orderedColumns: Column<AnyRow, unknown>[] = []

      for (const columnId of columnIds) {
        const column = columnById.get(columnId)
        if (column) {
          orderedColumns.push(column)
          columnById.delete(columnId)
        }
      }

      return [...orderedColumns, ...columnById.values()]
    }

    const columnPickerColumns = computed(() => getOrderedLeafColumns(draftColumnOrder.value))

    function getDraftPinnedSide(columnId: string): 'left' | 'right' | false {
      if (draftColumnPinning.value.left?.includes(columnId)) {
        return 'left'
      }

      if (draftColumnPinning.value.right?.includes(columnId)) {
        return 'right'
      }

      return false
    }

    function getDraftColumnMoveTarget(columnId: string) {
      const targetColumnId = draftColumnMoveTargetById.value[columnId]

      if (targetColumnId) {
        return targetColumnId
      }

      const fallbackTarget = columnPickerColumns.value.find((column) => column.id !== columnId)?.id
      return fallbackTarget ?? ''
    }

    function toggleDraftColumnVisibility(columnId: string, isVisible: boolean) {
      draftColumnVisibility.value = {
        ...draftColumnVisibility.value,
        [columnId]: isVisible,
      }
    }

    function updateDraftColumnSize(columnId: string, rawValue: string) {
      const column = allLeafColumnsById.value.get(columnId)
      if (!column) {
        return
      }

      const nextSize = toNumber(rawValue, draftColumnSizing.value[columnId] ?? column.getSize())
      draftColumnSizing.value = {
        ...draftColumnSizing.value,
        [columnId]: Math.max(nextSize, column.columnDef.minSize ?? 80),
      }
    }

    function setDraftPin(columnId: string, side: 'left' | 'right' | false) {
      const leftPinned = (draftColumnPinning.value.left ?? []).filter((id) => id !== columnId)
      const rightPinned = (draftColumnPinning.value.right ?? []).filter((id) => id !== columnId)

      if (side === 'left') {
        draftColumnPinning.value = {
          left: [...leftPinned, columnId],
          right: rightPinned,
        }
        return
      }

      if (side === 'right') {
        draftColumnPinning.value = {
          left: leftPinned,
          right: [...rightPinned, columnId],
        }
        return
      }

      draftColumnPinning.value = {
        left: leftPinned,
        right: rightPinned,
      }
    }

    function moveDraftColumn(columnId: string, direction: -1 | 1) {
      const orderedIds = [...draftColumnOrder.value]
      const currentIndex = orderedIds.indexOf(columnId)
      const nextIndex = currentIndex + direction

      if (currentIndex === -1 || nextIndex < 0 || nextIndex >= orderedIds.length) {
        return
      }

      const nextOrder = [...orderedIds]
      const [movedColumnId] = nextOrder.splice(currentIndex, 1)
      if (!movedColumnId) {
        return
      }

      nextOrder.splice(nextIndex, 0, movedColumnId)
      draftColumnOrder.value = nextOrder
    }

    function updateDraftColumnMoveTarget(columnId: string, targetColumnId: string) {
      draftColumnMoveTargetById.value = {
        ...draftColumnMoveTargetById.value,
        [columnId]: targetColumnId,
      }
    }

    function moveDraftColumnRelative(
      columnId: string,
      targetColumnId: string,
      position: 'before' | 'after',
    ) {
      if (!targetColumnId || targetColumnId === columnId) {
        return
      }

      const orderedIds = [...draftColumnOrder.value]
      const sourceIndex = orderedIds.indexOf(columnId)
      const targetIndex = orderedIds.indexOf(targetColumnId)

      if (sourceIndex === -1 || targetIndex === -1) {
        return
      }

      const nextOrder = [...orderedIds]
      const [movedColumnId] = nextOrder.splice(sourceIndex, 1)
      if (!movedColumnId) {
        return
      }

      const adjustedTargetIndex = nextOrder.indexOf(targetColumnId)
      const insertIndex = position === 'before' ? adjustedTargetIndex : adjustedTargetIndex + 1

      nextOrder.splice(insertIndex, 0, movedColumnId)
      draftColumnOrder.value = nextOrder
    }

    function applyColumnDialogChanges() {
      columnVisibility.value = { ...draftColumnVisibility.value }
      columnSizing.value = { ...draftColumnSizing.value }
      columnPinning.value = cloneColumnPinningState(draftColumnPinning.value)
      columnOrder.value = [...draftColumnOrder.value]
      columnMoveTargetById.value = { ...draftColumnMoveTargetById.value }
      columnVirtualizer.value.measure()
      closeColumnPicker()
    }

    function applyFilterDialogChanges() {
      pagination.value = {
        ...pagination.value,
        pageIndex: 0,
      }
      columnFilters.value = cloneColumnFilters(draftColumnFilters.value)
      globalFilter.value = draftGlobalFilter.value
      syncFilterDialogDraftState()
      closeFilterDialog()
    }

    function refreshData() {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }

      void loadData()
    }

    function clearAllFilters() {
      pagination.value = {
        ...pagination.value,
        pageIndex: 0,
      }
      columnFilters.value = []
      globalFilter.value = ''
      draftColumnFilters.value = []
      draftGlobalFilter.value = ''
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
      return (
        <DataGridFilterDialog
          isOpen={isFilterDialogOpen.value}
          sections={filterDialogSections.value}
          renderFilterControl={(config) => renderFilterControl(config, { target: 'dialog' })}
          onClose={closeFilterDialog}
          onApply={applyFilterDialogChanges}
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

      return h(FlexRender, {
        render: cell.column.columnDef.cell,
        props: renderProps,
      })
    }

    function closeColumnMenu() {
      openMenuColumnId.value = null
    }

    const selectionPanelColumns = computed(() => {
      const configuredColumnIds = mergedSelectionPanelConfig.value?.copyColumnIds

      if (configuredColumnIds && configuredColumnIds.length > 0) {
        const visibleColumnById = new Map(visibleColumns.value.map((column) => [column.id, column]))
        return configuredColumnIds
          .map((columnId) => visibleColumnById.get(columnId))
          .filter((column): column is Column<AnyRow, unknown> => Boolean(column))
      }

      return visibleColumns.value.filter((column) => {
        const columnDef = column.columnDef as DataGridColumn<AnyRow>
        return column.id !== 'select' && columnDef.localKind !== 'action'
      })
    })

    function getColumnClipboardLabel(column: Column<AnyRow, unknown>) {
      return renderColumnPickerLabel(column)
    }

    function getClipboardCellValue(row: (typeof selectedRows.value)[number], column: Column<AnyRow, unknown>) {
      const rawValue = row.getValue(column.id)

      if (rawValue === null || rawValue === undefined) {
        return ''
      }

      if (typeof rawValue === 'number' || typeof rawValue === 'boolean') {
        return String(rawValue)
      }

      if (typeof rawValue === 'string') {
        return rawValue
      }

      return JSON.stringify(rawValue)
    }

    async function copySelectedRows(includeHeaders: boolean) {
      const columns = selectionPanelColumns.value
      const rows = selectedRows.value

      if (columns.length === 0 || rows.length === 0 || typeof navigator === 'undefined') {
        return
      }

      const lines: string[] = []

      if (includeHeaders) {
        lines.push(columns.map((column) => escapeClipboardCell(getColumnClipboardLabel(column))).join('\t'))
      }

      for (const row of rows) {
        lines.push(
          columns
            .map((column) => escapeClipboardCell(getClipboardCellValue(row, column)))
            .join('\t'),
        )
      }

      await navigator.clipboard.writeText(lines.join('\n'))
    }

    const selectionPanelSums = computed(() => {
      const sumConfigs = mergedSelectionPanelConfig.value?.sumColumns ?? []
      const columnsById = new Map<string, Column<AnyRow, unknown>>()
      const totalsById = new Map<string, number>()

      for (const config of sumConfigs) {
        const column = allLeafColumnsById.value.get(config.columnId)
        if (!column) {
          continue
        }

        columnsById.set(config.columnId, column)
        totalsById.set(config.columnId, 0)
      }

      if (totalsById.size === 0) {
        return []
      }

      for (const row of selectedRows.value) {
        for (const config of sumConfigs) {
          if (!totalsById.has(config.columnId)) {
            continue
          }

          const rawValue = row.getValue(config.columnId)
          const numericValue =
            typeof rawValue === 'number'
              ? rawValue
              : typeof rawValue === 'string'
                ? Number(rawValue)
                : Number.NaN

          if (!Number.isFinite(numericValue)) {
            continue
          }

          totalsById.set(config.columnId, (totalsById.get(config.columnId) ?? 0) + numericValue)
        }
      }

      return sumConfigs
        .map((config) => {
          const column = columnsById.get(config.columnId)
          if (!column) {
            return null
          }
          const sum = totalsById.get(config.columnId) ?? 0

          return {
            columnId: config.columnId,
            label: config.label ?? renderColumnPickerLabel(column),
            value: config.formatValue ? config.formatValue(sum) : String(sum),
          }
        })
        .filter(
          (
            item,
          ): item is {
            columnId: string
            label: string
            value: string
          } => Boolean(item),
        )
    })

    function buildRenderedColumnSequence<TItem extends Column<AnyRow, unknown> | Header<AnyRow, unknown>>(
      orderedItems: TItem[],
      getColumn: (item: TItem) => Column<AnyRow, unknown>,
      renderedNonPinnedIds: Set<string>,
    ): RenderedSequenceItem<TItem>[] {
      const sequence: RenderedSequenceItem<TItem>[] = []
      let spacerWidth = 0
      let spacerIndex = 0

      for (const item of orderedItems) {
        const column = getColumn(item)
        const pinnedSide = getPinnedSide(column.id)

        if (pinnedSide || renderedNonPinnedIds.has(column.id)) {
          if (spacerWidth > 0) {
            sequence.push({
              type: 'spacer',
              key: `spacer-${spacerIndex}`,
              width: spacerWidth,
            })
            spacerWidth = 0
            spacerIndex += 1
          }

          sequence.push({
            type: 'item',
            key: column.id,
            item,
            column,
          })
          continue
        }

        spacerWidth += column.getSize()
      }

      if (spacerWidth > 0) {
        sequence.push({
          type: 'spacer',
          key: `spacer-${spacerIndex}`,
          width: spacerWidth,
        })
      }

      return sequence
    }

    return () => {
      const pageCount = requestState.value.pageCount
      const pageIndex = pagination.value.pageIndex
      const paginationItems = buildPaginationItems(pageCount, pageIndex)

      return (
        <section class="data-grid">
          <div class="data-grid__table-shell">
            <DataGridToolbar
              viewStorageKey={props.viewStorageKey}
              isViewsMenuOpen={isViewsMenuOpen.value}
              activeViewId={activeViewId.value}
              savedViews={savedViews.value}
              quickFilters={quickFilterConfigs.value}
              activeFilterCount={activeFilterCount.value}
              renderFilterControl={renderFilterControl}
              onToggleViewsMenu={toggleViewsMenu}
              onSelectSavedView={selectSavedView}
              onOpenSaveViewDialog={openSaveViewDialog}
              onOverwriteActiveView={overwriteActiveView}
              onDeleteActiveView={deleteActiveView}
              onToggleFilterDialog={toggleFilterDialog}
              onRefresh={refreshData}
              onClearFilters={clearAllFilters}
              onToggleColumnPicker={toggleColumnPicker}
            />

            <div
              ref={scrollElementRef}
              class="data-grid__viewport"
              style={
                {
                  height: `${props.height}px`,
                  '--data-grid-header-height': `${headerHeight}px`,
                } as Record<string, string>
              }
            >
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
                        return (
                          <div
                            key={entry.key}
                            class="data-grid__cell-spacer"
                            style={{ width: `${entry.width}px` }}
                          />
                        )
                      }

                      const pinnedSide = getPinnedSide(entry.column.id)

                      return (
                        <div
                          key={entry.key}
                          class={[
                            'data-grid__cell',
                            'data-grid__cell--header',
                            pinnedSide ? 'data-grid__cell--pinned' : '',
                            pinnedSide ? `data-grid__cell--${pinnedSide}` : '',
                          ]}
                          style={{
                            ...cellStylesByColumnId.value.get(entry.column.id),
                          }}
                        >
                          <DataGridHeaderCell
                            header={entry.item.getContext()}
                            column={entry.column}
                            pickerLabel={renderColumnPickerLabel(entry.column)}
                            justifyContent={
                              (cellStylesByColumnId.value.get(entry.column.id)?.justifyContent as string) ??
                              'flex-start'
                            }
                            menuStyle={getColumnMenuStyle(entry.column)}
                            isMenuOpen={openMenuColumnId.value === entry.column.id}
                            pinnedSide={pinnedSide}
                            renderFilterControl={(config) => renderFilterControl(config)}
                            getColumnFilterConfig={getColumnFilterConfig}
                            onToggleMenu={toggleColumnMenu}
                            onToggleSorting={toggleSorting}
                            onSetSortDesc={setSortDesc}
                            onClearSorting={clearSorting}
                            onSetPin={setPin}
                            onCloseMenu={closeColumnMenu}
                          />
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

                    return (
                      <DataGridBodyRow
                        key={row.id}
                        row={row}
                        rowStart={virtualRow.start}
                        rowSize={virtualRow.size}
                        rowSequence={rowSequence.value}
                        visibleColumnIndexById={visibleColumnIndexById.value}
                        cellStylesByColumnId={cellStylesByColumnId.value}
                        getPinnedSide={getPinnedSide}
                        renderCell={renderCell}
                      />
                    )
                  })}
                </div>
              </div>
            </div>
            {mergedSelectionPanelConfig.value && selectedRows.value.length > 0 ? (
              <DataGridSelectionPanel
                position={mergedSelectionPanelConfig.value.position ?? 'bottom-right'}
                selectedRowsCount={selectedRows.value.length}
                selectedRowsLabel={
                  mergedSelectionPanelConfig.value.selectedRowsLabel ?? 'Zaznaczone wiersze'
                }
                sums={selectionPanelSums.value}
                copyWithHeadersLabel={
                  mergedSelectionPanelConfig.value.copyWithHeadersLabel ??
                  'Kopiuj z naglowkami'
                }
                copyWithoutHeadersLabel={
                  mergedSelectionPanelConfig.value.copyWithoutHeadersLabel ??
                  'Kopiuj bez naglowkow'
                }
                onCopyWithHeaders={() => {
                  void copySelectedRows(true)
                }}
                onCopyWithoutHeaders={() => {
                  void copySelectedRows(false)
                }}
              />
            ) : null}

            <DataGridFooter
              isLoading={isLoading.value}
              totalRows={requestState.value.totalRows}
              fetchedRows={requestState.value.rows.length}
              datasetSize={
                typeof requestState.value.meta?.datasetSize === 'string' ||
                typeof requestState.value.meta?.datasetSize === 'number'
                  ? requestState.value.meta.datasetSize
                  : undefined
              }
              metaItems={props.metaItems}
              pageSizeConfig={props.pageSizeConfig}
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

          {serverFilterColumns.value.length === 0 ? (
            <p class="data-grid__note">Brak backendowych kolumn filtrowalnych.</p>
          ) : null}
          {errorMessage.value ? <p class="data-grid__error">{errorMessage.value}</p> : null}
          {renderFilterDialog()}
          {renderColumnPickerDialog()}
          {renderSaveViewDialog()}
        </section>
      )
    }
  },
})
