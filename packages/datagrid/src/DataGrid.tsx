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
  type VNodeChild,
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
  type HeaderContext,
  type PaginationState,
  type RowSelectionState,
} from '@tanstack/vue-table'
import { useVirtualizer } from '@tanstack/vue-virtual'

import DataGridDialog from './components/DataGridDialog'
import DataGridDropdownMenu from './components/DataGridDropdownMenu'
import DataGridFooter from './components/DataGridFooter'
import DataGridHeaderCell from './components/DataGridHeaderCell'
import DataGridToolbar from './components/DataGridToolbar'
import type {
  DataGridColumnAlign,
  DataGridColumn,
  DataGridFilterConfig,
  DataGridFilterOption,
  DataGridQuickFilterConfig,
  DataGridColumnVisibilityState,
  DataGridFetchParams,
  DataGridFetchResult,
  DataGridInitialState,
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

const headerHeight = 92

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

function toFilterOptionKey(value: DataGridFilterOption['value']) {
  return value === null ? '__data_grid_empty__' : String(value)
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

function toFilterGroupId(label: string) {
  return label.trim().toLocaleLowerCase().replace(/\s+/g, '-')
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
    const openHeaderFilterColumnId = ref<string | null>(null)
    const openToolbarFilterColumnId = ref<string | null>(null)
    const isColumnPickerOpen = ref(false)
    const isFilterDialogOpen = ref(false)
    const isViewsMenuOpen = ref(false)
    const isSaveViewDialogOpen = ref(false)
    const newViewName = ref('')
    const columnMoveTargetById = ref<Record<string, string>>({})
    const filterSearchByColumnId = ref<Record<string, string>>({})
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
      openHeaderFilterColumnId.value = null
      openToolbarFilterColumnId.value = null
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
      openHeaderFilterColumnId.value = null
      openToolbarFilterColumnId.value = null
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
      openHeaderFilterColumnId.value = null
      openToolbarFilterColumnId.value = null
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
      openHeaderFilterColumnId.value = null
      openToolbarFilterColumnId.value = null
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
      columnResizeMode: 'onChange',
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

    const visibleColumns = computed(() => table.getVisibleLeafColumns())
    const visibleHeaders = computed(() => table.getHeaderGroups()[0]?.headers ?? [])
    const visibleRows = computed(() => table.getRowModel().rows)
    const totalWidth = computed(() => table.getTotalSize())

    function getPinnedSide(columnId: string): 'left' | 'right' | false {
      if (columnPinning.value.left?.includes(columnId)) {
        return 'left'
      }

      if (columnPinning.value.right?.includes(columnId)) {
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

    const queryKey = computed(() =>
      JSON.stringify({
        pageIndex: pagination.value.pageIndex,
        pageSize: pagination.value.pageSize,
        sorting: sorting.value,
        filters: columnFilters.value,
        search: globalFilter.value,
      }),
    )

    const serverFilterColumns = computed(() =>
      table
        .getAllLeafColumns()
        .filter((column) => Boolean((column.columnDef as DataGridColumn<AnyRow>).serverField)),
    )
    const toolbarFilterConfigs = computed(() => {
      const columnConfigs = table
        .getAllLeafColumns()
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
      isColumnPickerOpen.value = !isColumnPickerOpen.value
      openMenuColumnId.value = null
      openHeaderFilterColumnId.value = null
      openToolbarFilterColumnId.value = null
      isFilterDialogOpen.value = false
      isViewsMenuOpen.value = false
      isSaveViewDialogOpen.value = false
    }

    function closeColumnPicker() {
      isColumnPickerOpen.value = false
    }

    function toggleFilterDialog() {
      isFilterDialogOpen.value = !isFilterDialogOpen.value
      openMenuColumnId.value = null
      openHeaderFilterColumnId.value = null
      openToolbarFilterColumnId.value = null
      isColumnPickerOpen.value = false
      isViewsMenuOpen.value = false
      isSaveViewDialogOpen.value = false
    }

    function closeFilterDialog() {
      isFilterDialogOpen.value = false
    }

    watch(
      queryKey,
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
        columnVirtualizer.value.measure()
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
    })

    onMounted(() => {
      document.addEventListener('click', handleDocumentClick)
      loadSavedViews()
    })

    function updateColumnFilter(columnId: string, value: string) {
      setColumnFilterValue(columnId, value.trim() ? value : undefined)
    }

    function setColumnFilterValue(columnId: string, value: unknown) {
      pagination.value = {
        ...pagination.value,
        pageIndex: 0,
      }

      const hasValue = Array.isArray(value) ? value.length > 0 : value !== undefined && value !== ''

      if (!hasValue) {
        columnFilters.value = columnFilters.value.filter((item) => item.id !== columnId)
        return
      }

      columnFilters.value = [
        ...columnFilters.value.filter((item) => item.id !== columnId),
        {
          id: columnId,
          value,
        },
      ]
    }

    function getFilterRawValue(columnId: string) {
      return columnFilters.value.find((item) => item.id === columnId)?.value
    }

    function getFilterValue(columnId: string) {
      return String(getFilterRawValue(columnId) ?? '')
    }

    function getSelectFilterValues(columnId: string) {
      const rawValue = getFilterRawValue(columnId)

      if (!Array.isArray(rawValue)) {
        return []
      }

      return rawValue as DataGridFilterOption['value'][]
    }

    function toggleFilterMenu(
      columnId: string,
      options?: { keepDialogsOpen?: boolean; target?: 'toolbar' | 'header' },
    ) {
      const target = options?.target ?? 'header'

      if (target === 'toolbar') {
        openToolbarFilterColumnId.value =
          openToolbarFilterColumnId.value === columnId ? null : columnId
        openHeaderFilterColumnId.value = null
      } else {
        openHeaderFilterColumnId.value =
          openHeaderFilterColumnId.value === columnId ? null : columnId
        openToolbarFilterColumnId.value = null
      }

      openMenuColumnId.value = null

      if (!options?.keepDialogsOpen) {
        isFilterDialogOpen.value = false
        isColumnPickerOpen.value = false
      }
    }

    function updateSelectFilterSearch(columnId: string, value: string) {
      filterSearchByColumnId.value = {
        ...filterSearchByColumnId.value,
        [columnId]: value,
      }
    }

    function getSelectFilterSearch(columnId: string) {
      return filterSearchByColumnId.value[columnId] ?? ''
    }

    function getFilterOptions(config: DataGridFilterConfig) {
      const options = [...(config.options ?? [])]

      if (config.includeEmptyOption) {
        options.unshift({
          label: config.emptyOptionLabel ?? 'Puste',
          value: null,
        })
      }

      return options
    }

    function getColumnFilterConfig(column: Column<AnyRow, unknown>): DataGridFilterConfig {
      const columnDef = column.columnDef as DataGridColumn<AnyRow>

      return {
        id: column.id,
        label: renderColumnPickerLabel(column),
        group: columnDef.filterGroup ?? 'Kolumny',
        variant: columnDef.filterVariant,
        options: columnDef.filterOptions,
        includeEmptyOption: columnDef.filterIncludeEmptyOption,
        emptyOptionLabel: columnDef.filterEmptyOptionLabel,
        placeholder: columnDef.filterPlaceholder ?? 'Filtr',
      }
    }

    function getVisibleFilterOptions(config: DataGridFilterConfig) {
      const options = getFilterOptions(config)
      const searchTerm = getSelectFilterSearch(config.id).trim().toLocaleLowerCase()

      if (!searchTerm) {
        return options
      }

      return options.filter((option) => option.label.toLocaleLowerCase().includes(searchTerm))
    }

    function toggleSelectFilterValue(
      columnId: string,
      optionValue: DataGridFilterOption['value'],
      checked: boolean,
    ) {
      const currentValues = getSelectFilterValues(columnId)
      const normalizedValue = toFilterOptionKey(optionValue)
      const nextValues = currentValues.filter((value) => toFilterOptionKey(value) !== normalizedValue)

      if (checked) {
        nextValues.push(optionValue)
      }

      setColumnFilterValue(columnId, nextValues)
    }

    function selectAllFilterOptions(config: DataGridFilterConfig) {
      const options = getFilterOptions(config).map((option) => option.value)
      setColumnFilterValue(config.id, options)
    }

    function clearSelectFilterOptions(filterId: string) {
      setColumnFilterValue(filterId, undefined)
    }

    function getFilterButtonLabel(config: DataGridFilterConfig) {
      if (config.variant !== 'select') {
        return 'Filtr'
      }

      const options = getFilterOptions(config)
      const selectedValues = getSelectFilterValues(config.id)

      if (selectedValues.length === 0) {
        return 'Wybierz'
      }

      if (selectedValues.length === options.length) {
        return 'Wszystkie'
      }

      if (selectedValues.length === 1) {
        const selectedValue = selectedValues[0]

        if (selectedValue === undefined) {
          return '1 wybrana'
        }

        const selectedOption = options.find(
          (option) => toFilterOptionKey(option.value) === toFilterOptionKey(selectedValue),
        )
        return selectedOption?.label ?? '1 wybrana'
      }

      return `${selectedValues.length} wybrane`
    }

    function renderFilterControl(config: DataGridFilterConfig, options?: { toolbar?: boolean }) {
      const filterOptions = getFilterOptions(config)
      const isToolbar = options?.toolbar ?? false

      if (config.variant === 'select' && filterOptions.length > 0) {
        const selectedValues = getSelectFilterValues(config.id)
        const selectedValueKeys = new Set(selectedValues.map((value) => toFilterOptionKey(value)))
        const visibleOptions = getVisibleFilterOptions(config)
        const isOpen = isToolbar
          ? openToolbarFilterColumnId.value === config.id
          : openHeaderFilterColumnId.value === config.id

        return h('div', { class: ['data-grid__filter-select', isToolbar ? 'data-grid__filter-select--toolbar' : ''], 'data-grid-filter-root': 'true' }, [
          h(
            'button',
            {
              type: 'button',
              class: [
                'data-grid__filter-select-trigger',
                selectedValues.length > 0 ? 'data-grid__filter-select-trigger--active' : '',
              ],
              onClick: (event) => {
                event.stopPropagation()
                toggleFilterMenu(config.id, {
                  keepDialogsOpen: isToolbar,
                  target: isToolbar ? 'toolbar' : 'header',
                })
              },
            },
            [
              h('span', { class: 'data-grid__filter-select-label' }, getFilterButtonLabel(config)),
              h(
                'span',
                { class: 'data-grid__filter-select-count' },
                selectedValues.length > 0 ? String(selectedValues.length) : '',
              ),
            ],
          ),
          isOpen
            ? h(
                DataGridDropdownMenu,
                {
                  menuClass: 'data-grid__filter-select-menu',
                  scopeAttr: 'data-grid-filter-root',
                },
                {
                  default: () => [
                  h('input', {
                    class: 'data-grid__filter-select-search',
                    value: getSelectFilterSearch(config.id),
                    placeholder: 'Szukaj opcji',
                    onClick: (event) => event.stopPropagation(),
                    onInput: (event) =>
                      updateSelectFilterSearch(config.id, (event.target as HTMLInputElement).value),
                  }),
                  h('div', { class: 'data-grid__filter-select-actions' }, [
                    h(
                      'button',
                      {
                        type: 'button',
                        class: 'data-grid__filter-select-action',
                        onClick: () => selectAllFilterOptions(config),
                      },
                      'Zaznacz wszystko',
                    ),
                    h(
                      'button',
                      {
                        type: 'button',
                        class: 'data-grid__filter-select-action',
                        onClick: () => clearSelectFilterOptions(config.id),
                      },
                      'Odznacz wszystko',
                    ),
                  ]),
                  h(
                    'div',
                    {
                      class: 'data-grid__filter-select-options',
                    },
                    visibleOptions.length > 0
                      ? visibleOptions.map((option) =>
                          h(
                            'label',
                            {
                              key: String(option.value),
                              class: 'data-grid__filter-select-option',
                            },
                            [
                              h('input', {
                                type: 'checkbox',
                                checked: selectedValueKeys.has(toFilterOptionKey(option.value)),
                                onChange: (event) =>
                                  toggleSelectFilterValue(
                                    config.id,
                                    option.value,
                                    (event.target as HTMLInputElement).checked,
                                  ),
                              }),
                              h('span', option.label),
                            ],
                          ),
                        )
                      : h('div', { class: 'data-grid__filter-select-empty' }, 'Brak opcji'),
                  ),
                  ],
                },
              )
            : null,
        ])
      }

      return h('input', {
        class: ['data-grid__filter-input', isToolbar ? 'data-grid__filter-input--toolbar' : ''],
        value: getFilterValue(config.id),
        placeholder: config.placeholder ?? 'Filtr',
        onInput: (event) => updateColumnFilter(config.id, (event.target as HTMLInputElement).value),
      })
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

    function cyclePin(column: Column<AnyRow, unknown>) {
      const pinned = getPinnedSide(column.id)
      const leftPinned = columnPinning.value.left ?? []
      const rightPinned = columnPinning.value.right ?? []

      if (pinned === 'left') {
        columnPinning.value = {
          left: leftPinned.filter((id) => id !== column.id),
          right: [...rightPinned.filter((id) => id !== column.id), column.id],
        }
        return
      }

      if (pinned === 'right') {
        columnPinning.value = {
          left: leftPinned.filter((id) => id !== column.id),
          right: rightPinned.filter((id) => id !== column.id),
        }
        return
      }

      columnPinning.value = {
        left: [...leftPinned.filter((id) => id !== column.id), column.id],
        right: rightPinned.filter((id) => id !== column.id),
      }
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
      openHeaderFilterColumnId.value = null
      openToolbarFilterColumnId.value = null
      isColumnPickerOpen.value = false
      isFilterDialogOpen.value = false
    }

    function updateColumnSize(column: Column<AnyRow, unknown>, rawValue: string) {
      const nextSize = toNumber(rawValue, column.getSize())
      columnSizing.value = {
        ...columnSizing.value,
        [column.id]: Math.max(nextSize, column.columnDef.minSize ?? 80),
      }
      columnVirtualizer.value.measure()
    }

    function moveColumn(columnId: string, direction: -1 | 1) {
      const orderedIds = table.getAllLeafColumns().map((column) => column.id)
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
      columnOrder.value = nextOrder
      columnVirtualizer.value.measure()
    }

    function getPinStatusLabel(columnId: string) {
      const pinnedSide = getPinnedSide(columnId)

      if (pinnedSide === 'left') {
        return 'Left'
      }

      if (pinnedSide === 'right') {
        return 'Right'
      }

      return 'None'
    }

    function updateColumnMoveTarget(columnId: string, targetColumnId: string) {
      columnMoveTargetById.value = {
        ...columnMoveTargetById.value,
        [columnId]: targetColumnId,
      }
    }

    function getColumnMoveTarget(columnId: string) {
      const targetColumnId = columnMoveTargetById.value[columnId]

      if (targetColumnId) {
        return targetColumnId
      }

      const fallbackTarget = table
        .getAllLeafColumns()
        .find((column) => column.id !== columnId)?.id

      return fallbackTarget ?? ''
    }

    function moveColumnRelative(columnId: string, targetColumnId: string, position: 'before' | 'after') {
      if (!targetColumnId || targetColumnId === columnId) {
        return
      }

      const orderedIds = table.getAllLeafColumns().map((column) => column.id)
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
      columnOrder.value = nextOrder
      columnVirtualizer.value.measure()
    }

    function renderColumnPickerDialog() {
      const allColumns = table.getAllLeafColumns()

      if (!isColumnPickerOpen.value) {
        return null
      }

      return (
        <DataGridDialog
          title="Columns"
          subtitle="Visibility, width, order and pin settings."
          ariaLabel="Column settings"
          onClose={closeColumnPicker}
        >
            <div class="data-grid__dialog-list">
              {allColumns.map((column, index) => (
                <div key={column.id} class="data-grid__dialog-row">
                  <div class="data-grid__dialog-main">
                    <label class="data-grid__column-option">
                      <input
                        type="checkbox"
                        checked={column.getIsVisible()}
                        disabled={!column.getCanHide()}
                        onChange={column.getToggleVisibilityHandler()}
                      />
                      <span>{renderColumnPickerLabel(column)}</span>
                    </label>
                    <span class="data-grid__dialog-meta">{column.id}</span>
                  </div>

                  <label class="data-grid__dialog-field">
                    <span>Width</span>
                    <input
                      type="number"
                      min={column.columnDef.minSize ?? 80}
                      value={String(column.getSize())}
                      onInput={(event) =>
                        updateColumnSize(column, (event.target as HTMLInputElement).value)
                      }
                    />
                  </label>

                  <div class="data-grid__dialog-field">
                    <span>Pin</span>
                    <div class="data-grid__dialog-actions">
                      <button
                        type="button"
                        class={[
                          'data-grid__dialog-action',
                          getPinnedSide(column.id) === 'left' ? 'data-grid__dialog-action--active' : '',
                        ]}
                        onClick={() => setPin(column, 'left')}
                      >
                        Left
                      </button>
                      <button
                        type="button"
                        class={[
                          'data-grid__dialog-action',
                          getPinnedSide(column.id) === 'right' ? 'data-grid__dialog-action--active' : '',
                        ]}
                        onClick={() => setPin(column, 'right')}
                      >
                        Right
                      </button>
                      <button
                        type="button"
                        class={[
                          'data-grid__dialog-action',
                          !getPinnedSide(column.id) ? 'data-grid__dialog-action--active' : '',
                        ]}
                        onClick={() => setPin(column, false)}
                      >
                        None
                      </button>
                    </div>
                    <span class="data-grid__dialog-meta">Current: {getPinStatusLabel(column.id)}</span>
                  </div>

                  <div class="data-grid__dialog-field">
                    <span>Order</span>
                    <div class="data-grid__dialog-actions">
                      <button
                        type="button"
                        class="data-grid__dialog-action"
                        onClick={() => moveColumn(column.id, -1)}
                        disabled={index === 0}
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        class="data-grid__dialog-action"
                        onClick={() => moveColumn(column.id, 1)}
                        disabled={index === allColumns.length - 1}
                      >
                        Down
                      </button>
                    </div>
                    <div class="data-grid__dialog-move-row">
                      <select
                        class="data-grid__dialog-select"
                        value={getColumnMoveTarget(column.id)}
                        onChange={(event) =>
                          updateColumnMoveTarget(column.id, (event.target as HTMLSelectElement).value)
                        }
                      >
                        {allColumns
                          .filter((candidateColumn) => candidateColumn.id !== column.id)
                          .map((candidateColumn) => (
                            <option key={candidateColumn.id} value={candidateColumn.id}>
                              {renderColumnPickerLabel(candidateColumn)}
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        class="data-grid__dialog-action"
                        onClick={() =>
                          moveColumnRelative(column.id, getColumnMoveTarget(column.id), 'before')
                        }
                        disabled={!getColumnMoveTarget(column.id)}
                      >
                        Before
                      </button>
                      <button
                        type="button"
                        class="data-grid__dialog-action"
                        onClick={() =>
                          moveColumnRelative(column.id, getColumnMoveTarget(column.id), 'after')
                        }
                        disabled={!getColumnMoveTarget(column.id)}
                      >
                        After
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
        </DataGridDialog>
      )
    }

    function renderFilterDialog() {
      if (!isFilterDialogOpen.value) {
        return null
      }

      return (
        <DataGridDialog
          title="Filtry"
          subtitle="Alternatywne miejsce do filtrowania danych i dodatkowe filtry spoza naglowkow."
          ariaLabel="Filter settings"
          surfaceClass="data-grid__dialog--filters"
          onClose={closeFilterDialog}
        >
            {false ? <div class="data-grid__dialog-header">
              <div>
                <h4 class="data-grid__dialog-title">Filtry</h4>
                <p class="data-grid__dialog-subtitle">
                  Alternatywne miejsce do filtrowania danych i dodatkowe filtry spoza nagłówków.
                </p>
              </div>
              <button type="button" class="data-grid__dialog-close" onClick={closeFilterDialog}>
                Close
              </button>
            </div> : null}

            <div class="data-grid__filter-dialog-list">
              {filterDialogSections.value.length > 0 ? (
                filterDialogSections.value.map((section) => (
                  <div key={section.id} class="data-grid__filter-dialog-section">
                    <div class="data-grid__filter-dialog-section-header">
                      <h5 class="data-grid__filter-dialog-section-title">{section.label}</h5>
                      <span class="data-grid__dialog-meta">
                        {section.items.length} {section.items.length === 1 ? 'filtr' : 'filtrow'}
                      </span>
                    </div>
                    <div class="data-grid__filter-dialog-group">
                      {section.items.map((config) => (
                        <div key={config.id} class="data-grid__filter-dialog-row">
                          <div class="data-grid__filter-dialog-main">
                            <span class="data-grid__filter-dialog-label">{config.label}</span>
                            <span class="data-grid__dialog-meta">{config.id}</span>
                          </div>
                          <div class="data-grid__filter-dialog-control">
                            {renderFilterControl(config, { toolbar: true })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div class="data-grid__filter-dialog-empty">Brak filtrow do skonfigurowania.</div>
              )}
            </div>
        </DataGridDialog>
      )
    }

    function renderSaveViewDialog() {
      if (!isSaveViewDialogOpen.value) {
        return null
      }

      return (
        <DataGridDialog
          title="Zapisz widok"
          subtitle="Podaj nazwe dla aktualnego ukladu kolumn i filtrow."
          ariaLabel="Zapisz widok"
          surfaceClass="data-grid__dialog--compact"
          onClose={closeSaveViewDialog}
        >
            {false ? <div class="data-grid__dialog-header">
              <div>
                <h4 class="data-grid__dialog-title">Zapisz widok</h4>
                <p class="data-grid__dialog-subtitle">
                  Podaj nazwe dla aktualnego ukladu kolumn i filtrow.
                </p>
              </div>
              <button type="button" class="data-grid__dialog-close" onClick={closeSaveViewDialog}>
                Close
              </button>
            </div> : null}

            <div class="data-grid__dialog-form">
              <label class="data-grid__dialog-field">
                <span>Nazwa widoku</span>
                <input
                  value={newViewName.value}
                  placeholder="Np. Moj widok"
                  autofocus
                  onInput={(event) => {
                    newViewName.value = (event.target as HTMLInputElement).value
                  }}
                  onKeydown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      saveNewView()
                    }
                  }}
                />
              </label>
            </div>

            <div class="data-grid__dialog-footer">
              <button type="button" class="data-grid__dialog-close" onClick={closeSaveViewDialog}>
                Anuluj
              </button>
              <button
                type="button"
                class="data-grid__dialog-close"
                onClick={saveNewView}
                disabled={!newViewName.value.trim()}
              >
                Zapisz
              </button>
            </div>
        </DataGridDialog>
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

      const columnIndex = visibleColumns.value.findIndex((item) => item.id === column.id)
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

    function renderHeaderCell(header: HeaderContext<AnyRow, unknown>, column: Column<AnyRow, unknown>) {
      const columnDef = column.columnDef as DataGridColumn<AnyRow>
      const isServerColumn = Boolean(columnDef.serverField)
      const showFilter = columnDef.showFilter ?? isServerColumn
      const pinnedSide = getPinnedSide(column.id)
      const sortedState = column.getIsSorted()
      const justifyContent = toJustifyContent(columnDef.align)
      const isMenuOpen = openMenuColumnId.value === column.id
      const customHeaderControl = columnDef.headerControl?.(header) as VNodeChild | undefined

      if (columnDef.headerMode === 'custom') {
        return h(
          'div',
          {
            class: 'data-grid__header-content data-grid__header-content--custom',
            style: { justifyContent },
          },
          [
            h(FlexRender, {
              render: header.header.column.columnDef.header,
              props: header,
            }),
          ],
        )
      }

      return h('div', { class: 'data-grid__header-content' }, [
        h(
          'button',
          {
            type: 'button',
            class: 'data-grid__sort-button',
            onClick: (event) => {
              event.stopPropagation()
              toggleColumnMenu(column.id)
            },
            style: { justifyContent },
          },
          [
            h(
              'span',
              { class: 'data-grid__header-label' },
              h(FlexRender, {
                render: header.header.column.columnDef.header,
                props: header,
              }),
            ),
            h(
              'span',
              { class: 'data-grid__sort-indicator' },
              column.getIsSorted() === 'asc' ? '↑' : column.getIsSorted() === 'desc' ? '↓' : '·',
            ),
          ],
        ),
        h('div', { class: 'data-grid__header-controls' }, [
          customHeaderControl
            ? h('div', { class: 'data-grid__header-control-slot' }, [customHeaderControl])
            : showFilter
              ? renderFilterControl(getColumnFilterConfig(column))
              : h('span', { class: 'data-grid__column-kind' }, isServerColumn ? 'no filter' : 'local'),
            isMenuOpen
              ? h(
                  DataGridDropdownMenu,
                {
                  menuClass: 'data-grid__column-menu',
                  scopeAttr: 'data-grid-menu-root',
                  style: getColumnMenuStyle(column),
                },
                {
                  default: () => [
                  h(
                    'div',
                    {
                      class: 'data-grid__menu-column-name',
                    },
                    renderColumnPickerLabel(column),
                  ),
                  isServerColumn
                      ? h(
                          'div',
                          {
                            class: 'data-grid__menu-section',
                          },
                          [
                            h('div', { class: 'data-grid__menu-title' }, 'Sort'),
                            h('div', { class: 'data-grid__menu-row' }, [
                              h(
                                'button',
                                {
                                  type: 'button',
                                  class: [
                                    'data-grid__menu-item',
                                    sortedState === 'asc' ? 'data-grid__menu-item--active' : '',
                                  ],
                                  onClick: () => toggleSorting(column),
                                  disabled: sortedState === 'asc',
                                },
                                'ASC',
                              ),
                              h(
                                'button',
                                {
                                  type: 'button',
                                  class: [
                                    'data-grid__menu-item',
                                    sortedState === 'desc' ? 'data-grid__menu-item--active' : '',
                                  ],
                                  onClick: () => setSortDesc(column),
                                  disabled: sortedState === 'desc',
                                },
                                'DESC',
                              ),
                              h(
                                'button',
                                {
                                  type: 'button',
                                  class: 'data-grid__menu-item',
                                  onClick: () => clearSorting(column),
                                  disabled: !sortedState,
                                },
                                'Clear',
                              ),
                            ]),
                          ],
                        )
                      : null,
                    h(
                      'div',
                      {
                        class: 'data-grid__menu-section',
                      },
                      [
                        h('div', { class: 'data-grid__menu-title' }, 'Pin'),
                        h('div', { class: 'data-grid__menu-row' }, [
                          h(
                            'button',
                            {
                              type: 'button',
                              class: [
                                'data-grid__menu-item',
                                pinnedSide === 'left' ? 'data-grid__menu-item--active' : '',
                              ],
                              onClick: () => setPin(column, 'left'),
                              disabled: pinnedSide === 'left',
                            },
                            'Left',
                          ),
                          h(
                            'button',
                            {
                              type: 'button',
                              class: [
                                'data-grid__menu-item',
                                pinnedSide === 'right' ? 'data-grid__menu-item--active' : '',
                              ],
                              onClick: () => setPin(column, 'right'),
                              disabled: pinnedSide === 'right',
                            },
                            'Right',
                          ),
                          h(
                            'button',
                            {
                              type: 'button',
                              class: 'data-grid__menu-item',
                              onClick: () => setPin(column, false),
                              disabled: !pinnedSide,
                            },
                            'Unpin',
                          ),
                        ]),
                      ],
                    ),
                                        h(
                      'div',
                      {
                        class: 'data-grid__menu-section',
                      },
                      [
                        h(
                          'button',
                          {
                            type: 'button',
                            class: 'data-grid__menu-close',
                            onClick: () => {
                              openMenuColumnId.value = null
                            },
                          },
                          'Close',
                        ),
                      ],
                    ),
                  ],
                },
              )
            : null,
        ]),
      ])
    }

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

    function renderCell(cell: Cell<AnyRow, unknown>) {
      const columnDef = cell.column.columnDef as DataGridColumn<AnyRow>

      return h(FlexRender, {
        render: cell.column.columnDef.cell,
        props: {
          ...cell.getContext(),
          align: columnDef.align ?? 'start',
        },
      })
    }

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

    function getStickyCellStyle(column: Column<AnyRow, unknown>) {
      const pinnedSide = getPinnedSide(column.id)

      if (pinnedSide === 'left') {
        const leftColumns = visibleColumns.value.filter((item) => getPinnedSide(item.id) === 'left')
        const pinnedIndex = leftColumns.findIndex((item) => item.id === column.id)
        const stickyOffset = leftColumns
          .slice(0, pinnedIndex)
          .reduce((sum, item) => sum + item.getSize(), 0)

        return {
          width: `${column.getSize()}px`,
          left: `${stickyOffset}px`,
          zIndex: `${60 - pinnedIndex}`,
        }
      }

      if (pinnedSide === 'right') {
        const rightColumns = visibleColumns.value.filter((item) => getPinnedSide(item.id) === 'right')
        const pinnedIndex = rightColumns.findIndex((item) => item.id === column.id)
        const stickyOffset = rightColumns
          .slice(pinnedIndex + 1)
          .reduce((sum, item) => sum + item.getSize(), 0)

        return {
          width: `${column.getSize()}px`,
          right: `${stickyOffset}px`,
          zIndex: `${60 - pinnedIndex}`,
        }
      }

      return {
        width: `${column.getSize()}px`,
      }
    }

    return () => {
      const pageCount = requestState.value.pageCount
      const pageIndex = pagination.value.pageIndex
      const paginationItems = buildPaginationItems(pageCount, pageIndex)
      const renderedNonPinnedIds = new Set(
        virtualNonPinnedColumns.value
          .map((virtualColumn) => nonPinnedColumns.value[virtualColumn.index]?.id)
          .filter((value): value is string => Boolean(value)),
      )
      const headerSequence = buildRenderedColumnSequence(
        visibleHeaders.value,
        (header) => header.column,
        renderedNonPinnedIds,
      )

      return (
        <section class="data-grid">
          <div class="data-grid__table-shell">
            <DataGridToolbar
              viewStorageKey={props.viewStorageKey}
              isViewsMenuOpen={isViewsMenuOpen.value}
              activeViewId={activeViewId.value}
              savedViews={savedViews.value}
              quickFilters={quickFilterConfigs.value}
              renderFilterControl={renderFilterControl}
              onToggleViewsMenu={toggleViewsMenu}
              onSelectSavedView={selectSavedView}
              onOpenSaveViewDialog={openSaveViewDialog}
              onOverwriteActiveView={overwriteActiveView}
              onDeleteActiveView={deleteActiveView}
              onToggleFilterDialog={toggleFilterDialog}
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
                    {headerSequence.map((entry) => {
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
                            ...getStickyCellStyle(entry.column),
                            justifyContent: toJustifyContent(
                              (entry.column.columnDef as DataGridColumn<AnyRow>).align,
                            ),
                          }}
                        >
                          <DataGridHeaderCell
                            header={entry.item.getContext()}
                            column={entry.column}
                            pickerLabel={renderColumnPickerLabel(entry.column)}
                            justifyContent={toJustifyContent(
                              (entry.column.columnDef as DataGridColumn<AnyRow>).align,
                            )}
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
                            onCloseMenu={() => {
                              openMenuColumnId.value = null
                            }}
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

                    const visibleCells = row.getVisibleCells()
                    const cellByColumnId = new Map(visibleCells.map((cell) => [cell.column.id, cell]))
                    const rowSequence = buildRenderedColumnSequence(
                      visibleColumns.value,
                      (column) => column,
                      renderedNonPinnedIds,
                    )

                    return (
                      <div
                        key={row.id}
                        class={[
                          'data-grid__row',
                          row.getIsSelected() ? 'data-grid__row--selected' : '',
                        ]}
                        aria-selected={row.getIsSelected() ? 'true' : 'false'}
                        style={{
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        {rowSequence.map((entry) => {
                          if (entry.type === 'spacer') {
                            return (
                              <div
                                key={entry.key}
                                class="data-grid__cell-spacer"
                                style={{ width: `${entry.width}px` }}
                              />
                            )
                          }

                          const cell = cellByColumnId.get(entry.column.id)
                          if (!cell) {
                            return null
                          }

                          const pinnedSide = getPinnedSide(entry.column.id)

                          return (
                            <div
                              key={cell.id}
                              class={[
                                'data-grid__cell',
                                pinnedSide ? 'data-grid__cell--pinned' : '',
                                pinnedSide ? `data-grid__cell--${pinnedSide}` : '',
                              ]}
                              style={{
                                ...getStickyCellStyle(entry.column),
                                justifyContent: toJustifyContent(
                                  (entry.column.columnDef as DataGridColumn<AnyRow>).align,
                                ),
                              }}
                            >
                              {renderCell(cell)}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

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
