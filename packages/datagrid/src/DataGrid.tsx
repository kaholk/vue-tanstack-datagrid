import {
  computed,
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
  type CSSProperties,
  type PropType,
  type VNodeChild,
} from 'vue'
import {
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
  type Row,
  type RowSelectionState,
} from '@tanstack/vue-table'
import { useVirtualizer } from '@tanstack/vue-virtual'
import IconCheckSmallRounded from '~icons/material-symbols/check-small-rounded'

import DataGridBodyRow from './components/DataGridBodyRow'
import DataGridDialog from './components/DataGridDialog'
import DataGridColumnPickerDialog from './components/DataGridColumnPickerDialog'
import DataGridFooter from './components/DataGridFooter'
import DataGridFilterDialog from './components/DataGridFilterDialog'
import DataGridFilterHelpDialog from './components/DataGridFilterHelpDialog'
import DataGridHeaderCell from './components/DataGridHeaderCell'
import DataGridSaveViewDialog from './components/DataGridSaveViewDialog'
import DataGridSelectionPanel from './components/DataGridSelectionPanel'
import DataGridToolbar from './components/DataGridToolbar'
import { useDataGridColumnPicker } from './composables/useDataGridColumnPicker'
import { useDataGridFilters } from './composables/useDataGridFilters'
import { useDataGridSavedViews } from './composables/useDataGridSavedViews'
import type {
  DataGridColumnAlign,
  DataGridColumn,
  DataGridFilterConfig,
  DataGridQuickFilterConfig,
  DataGridColumnVisibilityState,
  DataGridFetchParams,
  DataGridFetchResult,
  DataGridFloatingPosition,
  DataGridInitialState,
  DataGridHeight,
  DataGridLoadingConfig,
  DataGridMetaConfig,
  DataGridPageSizeConfig,
  DataGridRowSelectionConfig,
  DataGridSavedViewsPersistence,
  DataGridSelectionPanelConfig,
  DataGridSelectionPanelSumConfig,
  DataGridSelectionPanelPosition,
  DataGridSavedViewState,
} from './types'

type AnyRow = Record<string, unknown>

type RequestState<TData extends AnyRow> = {
  rows: TData[]
  totalRows: number
  pageCount: number
  meta?: Record<string, unknown>
}

type LoadDataOptions = {
  force?: boolean
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

type CellSelectionAnchor = {
  rowId: string
  columnId: string
}

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
  copyIncludeHeaders: false,
  selectedRowsLabel: 'Zaznaczone wiersze',
  copyWithHeadersLabel: 'Kopiuj z naglowkami',
  copyWithoutHeadersLabel: 'Kopiuj bez naglowkow',
  allowPositionChange: true,
  positionStorageKey: '',
  floatingPosition: { x: 16, y: 16 },
}
const defaultRowSelectionColumnId = '__select'
const defaultRowSelectionPreset = 'default'
const defaultLoadingConfig: DataGridLoadingConfig = {
  variant: 'overlay',
  label: 'Ladowanie danych',
}

function renderSelectionCheckbox(
  checked: boolean,
  onToggle: (nextChecked: boolean, event: MouseEvent | KeyboardEvent) => void,
  options?: {
    ariaLabel?: string
    indeterminate?: boolean
    onPointerEnter?: (event: PointerEvent) => void
    onPointerLeave?: (event: PointerEvent) => void
  },
) {
  return h(
    'button',
    {
      type: 'button',
      role: 'checkbox',
      'aria-checked': options?.indeterminate ? 'mixed' : checked ? 'true' : 'false',
      'aria-label': options?.ariaLabel,
      class: [
        'data-grid__select-checkbox',
        checked ? 'data-grid__select-checkbox--checked' : '',
        options?.indeterminate ? 'data-grid__select-checkbox--indeterminate' : '',
      ],
      onClick: (event: MouseEvent) => {
        event.stopPropagation()
        onToggle(!checked, event)
      },
      onKeydown: (event: KeyboardEvent) => {
        if (event.key !== ' ' && event.key !== 'Enter') {
          return
        }

        event.stopPropagation()
        event.preventDefault()
        onToggle(!checked, event)
      },
      onPointerenter: options?.onPointerEnter,
      onPointerleave: options?.onPointerLeave,
    },
    [
      checked
        ? h(IconCheckSmallRounded, { class: 'data-grid__select-checkbox-icon' })
        : options?.indeterminate
          ? h('span', { class: 'data-grid__select-checkbox-dash' })
          : null,
    ],
  )
}

function normalizeColumnSize<TData extends AnyRow>(column: DataGridColumn<TData>): DataGridColumn<TData> {
  if (typeof column.size !== 'number') {
    return column
  }

  return {
    ...column,
    minSize: column.size,
    maxSize: column.size,
  }
}

function getFixedColumnSize<TData extends AnyRow>(column?: Partial<DataGridColumn<TData>>): number | null {
  return typeof column?.size === 'number' ? column.size : null
}

function appendMissingColumnId(columnOrder: ColumnOrderState, columnId: string): ColumnOrderState {
  if (columnOrder.includes(columnId)) {
    return [...columnOrder]
  }

  return [columnId, ...columnOrder]
}

function appendMissingPinnedColumnId(
  columnPinning: ColumnPinningState,
  columnId: string,
  defaultPin: 'left' | 'right' | false,
): ColumnPinningState {
  const left = [...(columnPinning.left ?? [])]
  const right = [...(columnPinning.right ?? [])]

  if (left.includes(columnId) || right.includes(columnId) || !defaultPin) {
    return { left, right }
  }

  if (defaultPin === 'left') {
    return {
      left: [columnId, ...left],
      right,
    }
  }

  return {
    left,
    right: [columnId, ...right],
  }
}

function buildRowSelectionColumn(
  config: DataGridRowSelectionConfig<AnyRow>,
  options?: {
    onToggleAll?: (
      nextChecked: boolean,
      context: { table: HeaderContext<AnyRow, unknown>['table'] },
      event: MouseEvent | KeyboardEvent,
    ) => void
    onToggleRow?: (
      nextChecked: boolean,
      context: {
        row: CellRenderProps['row']
        table: CellRenderProps['table']
      },
      event: MouseEvent | KeyboardEvent,
    ) => void
    onPreviewRowSelection?: (
      context: {
        row: CellRenderProps['row']
        table: CellRenderProps['table']
      },
      event: PointerEvent,
    ) => void
    onClearRowSelectionPreview?: () => void
  },
): DataGridColumn<AnyRow> {
  const columnId = config.columnId?.trim() || defaultRowSelectionColumnId
  const columnOverrides = config.column ?? {}
  const preset = config.preset ?? defaultRowSelectionPreset
  const presetColumn: Partial<DataGridColumn<AnyRow>> =
    preset === 'compact-left' || preset === 'compact-right'
      ? {
          size: 44,
          minSize: 44,
          maxSize: 44,
          pickerLabel: 'Select',
        }
      : {
          size: 52,
          minSize: 52,
          maxSize: 52,
          pickerLabel: 'Select',
        }
  const defaultLabel =
    (typeof columnOverrides.pickerLabel === 'string' && columnOverrides.pickerLabel.trim()) ||
    'Select'
  const baseColumn: DataGridColumn<AnyRow> = {
    id: columnId,
    ...presetColumn,
    header: defaultLabel,
    align: 'center',
    localKind: 'action',
    enableSorting: false,
    showFilter: false,
    pickerLabel: defaultLabel,
    headerControl: ({ table }) =>
      renderSelectionCheckbox(
        table.getIsAllPageRowsSelected(),
        (checked, event) =>
          options?.onToggleAll?.(checked, { table }, event) ?? table.toggleAllPageRowsSelected(checked),
        {
          ariaLabel: 'Zaznacz wszystkie wiersze na stronie',
          indeterminate: table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected(),
        },
      ),
    cell: ({ row, table }) =>
      renderSelectionCheckbox(
        row.getIsSelected(),
        (checked, event) =>
          options?.onToggleRow?.(checked, { row, table }, event) ??
          row.toggleSelected(checked),
        {
          ariaLabel: 'Zaznacz wiersz',
          onPointerEnter: (event) => options?.onPreviewRowSelection?.({ row, table }, event),
          onPointerLeave: () => options?.onClearRowSelectionPreview?.(),
        },
      ),
  }

  return {
    ...baseColumn,
    ...columnOverrides,
    id: columnId,
    localKind: columnOverrides.localKind ?? 'action',
    enableSorting: columnOverrides.enableSorting ?? false,
    showFilter: columnOverrides.showFilter ?? false,
    pickerLabel: columnOverrides.pickerLabel ?? defaultLabel,
    headerControl: columnOverrides.headerControl ?? baseColumn.headerControl,
  }
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

function renderFlexibleContent(render: unknown, props: Record<string, unknown>): VNodeChild {
  if (typeof render === 'function' || (typeof render === 'object' && render !== null)) {
    return h(render as never, props)
  }

  return render as VNodeChild
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
      type: Number as PropType<DataGridHeight>,
      default: 560,
    },
    loadingConfig: {
      type: Object as PropType<DataGridLoadingConfig | undefined>,
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
    rowSelectionConfig: {
      type: Object as PropType<DataGridRowSelectionConfig<any> | undefined>,
      default: undefined,
    },
  },
  setup(props, { expose }) {
    const mergedLoadingConfig = computed<DataGridLoadingConfig>(() => ({
      variant: props.loadingConfig?.variant ?? defaultLoadingConfig.variant,
      label: props.loadingConfig?.label ?? defaultLoadingConfig.label,
    }))
    const lastSelectedRowId = ref<string | null>(null)
    const previewSelectionRowIds = shallowRef<Set<string>>(new Set())
    const selectionPanelPosition = ref<DataGridSelectionPanelPosition>(
      props.selectionPanelConfig?.position ?? defaultSelectionPanelConfig.position ?? 'bottom-right',
    )
    const selectionPanelFloatingPosition = ref<DataGridFloatingPosition>(
      props.selectionPanelConfig?.floatingPosition ??
        defaultSelectionPanelConfig.floatingPosition ?? { x: 16, y: 16 },
    )
    const mergedRowSelectionConfig = computed<DataGridRowSelectionConfig<AnyRow> | null>(() => {
      if (!props.rowSelectionConfig?.enabled) {
        return null
      }

      const preset = props.rowSelectionConfig.preset ?? defaultRowSelectionPreset

      return {
        enabled: true,
        preset,
        columnId: props.rowSelectionConfig.columnId?.trim() || defaultRowSelectionColumnId,
        defaultPin:
          props.rowSelectionConfig.defaultPin ??
          (preset === 'compact-left'
            ? 'left'
            : preset === 'compact-right'
              ? 'right'
              : false),
        column: props.rowSelectionConfig.column ?? {},
      }
    })
    const rowSelectionColumnSize = computed(() =>
      getFixedColumnSize(mergedRowSelectionConfig.value?.column),
    )
    const mergedColumns = computed<DataGridColumn<AnyRow>[]>(() => {
      const rowSelectionConfig = mergedRowSelectionConfig.value
      const normalizedColumns = props.columns.map((column) => normalizeColumnSize(column))
      if (!rowSelectionConfig) {
        return normalizedColumns
      }

      const selectionColumn = normalizeColumnSize(
        buildRowSelectionColumn(rowSelectionConfig, {
          onToggleAll: (checked, context) => {
            context.table.toggleAllPageRowsSelected(checked)
            lastSelectedRowId.value = null
            previewSelectionRowIds.value = new Set()
          },
          onToggleRow: (checked, context, event) => {
            const rows = context.table.getRowModel().rows
            const currentIndex = rows.findIndex((row) => row.id === context.row.id)
            const anchorIndex = rows.findIndex((row) => row.id === lastSelectedRowId.value)

            if (event.shiftKey && currentIndex >= 0 && anchorIndex >= 0) {
              const [start, end] =
                currentIndex < anchorIndex
                  ? [currentIndex, anchorIndex]
                  : [anchorIndex, currentIndex]

              for (let index = start; index <= end; index += 1) {
                rows[index]?.toggleSelected(checked)
              }
            } else {
              context.row.toggleSelected(checked)
            }

            lastSelectedRowId.value = context.row.id
            previewSelectionRowIds.value = new Set()
          },
          onPreviewRowSelection: (context, event) => {
            if (!event.shiftKey) {
              previewSelectionRowIds.value = new Set()
              return
            }

            const rows = context.table.getRowModel().rows
            const currentIndex = rows.findIndex((row) => row.id === context.row.id)
            const anchorIndex = rows.findIndex((row) => row.id === lastSelectedRowId.value)

            if (currentIndex < 0 || anchorIndex < 0) {
              previewSelectionRowIds.value = new Set()
              return
            }

            const [start, end] =
              currentIndex < anchorIndex
                ? [currentIndex, anchorIndex]
                : [anchorIndex, currentIndex]

            previewSelectionRowIds.value = new Set(
              rows.slice(start, end + 1).map((row) => row.id),
            )
          },
          onClearRowSelectionPreview: () => {
            previewSelectionRowIds.value = new Set()
          },
        }),
      )
      const remainingColumns = normalizedColumns.filter((column) => column.id !== selectionColumn.id)
      return [selectionColumn, ...remainingColumns]
    })
    const mergedInitialState = computed<DataGridInitialState>(() => {
      const initialState = props.initialState ?? {}
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
    const columnVisibility = ref<DataGridColumnVisibilityState>(
      mergedInitialState.value.columnVisibility ?? {},
    )
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
    const requestState = shallowRef<RequestState<AnyRow>>({
      rows: [],
      totalRows: 0,
      pageCount: 0,
      meta: undefined,
    })
    const isLoading = ref(false)
    const errorMessage = ref('')

    let debounceTimer: ReturnType<typeof setTimeout> | undefined
    let activeController: AbortController | null = null
    let activeRequestKey = ''
    let loadedRequestKey = ''
    let activeRequestId = 0
    let measureFrame: number | null = null
    let isUnmounted = false

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

    function clearSelectionPreviewIfShiftReleased(event: KeyboardEvent) {
      if (event.key === 'Shift') {
        previewSelectionRowIds.value = new Set()
        isCellSelectionShiftDown.value = false
        previewCellRangeKeys.value = new Set()
      }

      if (event.key === 'Control') {
        isCellSelectionCtrlDown.value = false
        isCellSelectionShiftDown.value = event.shiftKey
        hoveredCellKey.value = null
        previewCellRangeKeys.value = new Set()
      }
    }

    function updateCellSelectionModifierState(event: KeyboardEvent) {
      isCellSelectionCtrlDown.value = event.ctrlKey
      isCellSelectionShiftDown.value = event.shiftKey

      if (!event.ctrlKey || !currentPointerCell.value) {
        hoveredCellKey.value = null
        previewCellRangeKeys.value = new Set()
        return
      }

      hoveredCellKey.value = getCellSelectionKey(
        currentPointerCell.value.rowId,
        currentPointerCell.value.columnId,
      )
      previewCellRangeKeys.value = event.shiftKey
        ? getCellRangePreviewKeys(currentPointerCell.value)
        : new Set()
    }

    function clearCellSelectionModifierState() {
      isCellSelectionCtrlDown.value = false
      isCellSelectionShiftDown.value = false
      currentPointerCell.value = null
      hoveredCellKey.value = null
      previewCellRangeKeys.value = new Set()
      previewSelectionRowIds.value = new Set()
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

      const storedPosition = window.localStorage.getItem(storageKey) as
        | DataGridSelectionPanelPosition
        | null

      if (
        storedPosition === 'bottom-left' ||
        storedPosition === 'bottom-right' ||
        storedPosition === 'top-left' ||
        storedPosition === 'top-right' ||
        storedPosition === 'floating'
      ) {
        selectionPanelPosition.value = storedPosition
      }

      const storedFloatingPosition = window.localStorage.getItem(
        `${storageKey}:floating`,
      )
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
    const selectionPanelPositionStorageKey = computed(() => {
      if (props.selectionPanelConfig?.positionStorageKey) {
        return props.selectionPanelConfig.positionStorageKey
      }

      if (props.viewStorageKey) {
        return `${props.viewStorageKey}:selection-panel-position`
      }

      return ''
    })
    const visibleColumnIndexById = computed(
      () => new Map(visibleColumns.value.map((column, index) => [column.id, index])),
    )
    const mergedSelectionPanelConfig = computed<DataGridSelectionPanelConfig | null>(() => {
      if (!props.selectionPanelConfig) {
        return null
      }

      return {
        position:
          selectionPanelPosition.value ??
          props.selectionPanelConfig.position ??
          defaultSelectionPanelConfig.position,
        sumColumns: props.selectionPanelConfig.sumColumns ?? defaultSelectionPanelConfig.sumColumns,
        copyColumnIds:
          props.selectionPanelConfig.copyColumnIds ?? defaultSelectionPanelConfig.copyColumnIds,
        copyIncludeHeaders:
          props.selectionPanelConfig.copyIncludeHeaders ??
          defaultSelectionPanelConfig.copyIncludeHeaders,
        selectedRowsLabel:
          props.selectionPanelConfig.selectedRowsLabel ??
          defaultSelectionPanelConfig.selectedRowsLabel,
        copyWithHeadersLabel:
          props.selectionPanelConfig.copyWithHeadersLabel ??
          defaultSelectionPanelConfig.copyWithHeadersLabel,
        copyWithoutHeadersLabel:
          props.selectionPanelConfig.copyWithoutHeadersLabel ??
          defaultSelectionPanelConfig.copyWithoutHeadersLabel,
        allowPositionChange:
          props.selectionPanelConfig.allowPositionChange ??
          defaultSelectionPanelConfig.allowPositionChange,
        positionStorageKey:
          props.selectionPanelConfig.positionStorageKey ??
          defaultSelectionPanelConfig.positionStorageKey,
        floatingPosition:
          selectionPanelFloatingPosition.value ??
          props.selectionPanelConfig.floatingPosition ??
          defaultSelectionPanelConfig.floatingPosition,
      }
    })
    const selectedRows = computed(() => {
      if (!mergedSelectionPanelConfig.value || Object.keys(rowSelection.value).length === 0) {
        return []
      }

      return visibleRows.value.filter((row) => row.getIsSelected())
    })
    const cellSelectionColumns = computed(() => {
      const rowSelectionColumnId =
        mergedRowSelectionConfig.value?.columnId ?? defaultRowSelectionColumnId

      return visibleColumns.value.filter((column) => {
        const columnDef = column.columnDef as DataGridColumn<AnyRow>
        return column.id !== rowSelectionColumnId && columnDef.localKind !== 'action'
      })
    })
    const selectedCellCount = computed(() => selectedCellKeys.value.size)
    const selectedColumnIds = computed(() => {
      const columns: string[] = []

      for (const column of cellSelectionColumns.value) {
        if (
          visibleRows.value.length > 0 &&
          visibleRows.value.every((row) =>
            selectedCellKeys.value.has(getCellSelectionKey(row.id, column.id)),
          )
        ) {
          columns.push(column.id)
        }
      }

      return columns
    })
    const selectedCellRows = computed(() => {
      if (selectedCellKeys.value.size === 0) {
        return []
      }

      const columns = cellSelectionColumns.value
      return visibleRows.value
        .map((row) => {
          const selectedColumnIds = columns
            .filter((column) => selectedCellKeys.value.has(getCellSelectionKey(row.id, column.id)))
            .map((column) => column.id)

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
      return cellSelectionColumns.value.some((selectionColumn) => selectionColumn.id === column.id)
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

      if (
        isCellSelectionShiftDown.value &&
        lastSelectedCell.value?.rowId === cell.row.id &&
        lastSelectedCell.value.columnId === cell.column.id
      ) {
        return false
      }

      return hoveredCellKey.value === getCellSelectionKey(cell.row.id, cell.column.id)
    }

    function isCellSelectionRangePreviewed(cell: Cell<AnyRow, unknown>) {
      return previewCellRangeKeys.value.has(getCellSelectionKey(cell.row.id, cell.column.id))
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
      const anchorRowIndex = rows.findIndex((row) => row.id === anchor.rowId)
      const targetRowIndex = rows.findIndex((row) => row.id === target.rowId)
      const anchorColumnIndex = columns.findIndex((column) => column.id === anchor.columnId)
      const targetColumnIndex = columns.findIndex((column) => column.id === target.columnId)

      if (
        anchorRowIndex < 0 ||
        targetRowIndex < 0 ||
        anchorColumnIndex < 0 ||
        targetColumnIndex < 0
      ) {
        return new Set<string>()
      }

      const [rowStart, rowEnd] =
        anchorRowIndex < targetRowIndex
          ? [anchorRowIndex, targetRowIndex]
          : [targetRowIndex, anchorRowIndex]
      const [columnStart, columnEnd] =
        anchorColumnIndex < targetColumnIndex
          ? [anchorColumnIndex, targetColumnIndex]
          : [targetColumnIndex, anchorColumnIndex]
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
      const keys = getCellRangeKeys(target)
      const anchor = lastSelectedCell.value

      if (anchor) {
        keys.delete(getCellSelectionKey(anchor.rowId, anchor.columnId))
      }

      return keys
    }

    function selectCellRange(targetCell: Cell<AnyRow, unknown>) {
      const anchor = lastSelectedCell.value
      if (!anchor) {
        const target = getCellSelectionAnchor(targetCell)
        lastSelectedCell.value = target
        replaceSelectedCellKeys(
          new Set([
            ...selectedCellKeys.value,
            getCellSelectionKey(target.rowId, target.columnId),
          ]),
        )
        return
      }

      const nextKeys = new Set(selectedCellKeys.value)
      const rangeKeys = getCellRangeKeys(getCellSelectionAnchor(targetCell))
      rangeKeys.delete(getCellSelectionKey(anchor.rowId, anchor.columnId))

      for (const key of rangeKeys) {
        if (nextKeys.has(key)) {
          nextKeys.delete(key)
        } else {
          nextKeys.add(key)
        }
      }

      replaceSelectedCellKeys(nextKeys)
    }

    function handleCellSelectionPointerEnter(cell: Cell<AnyRow, unknown>, event: PointerEvent) {
      isCellSelectionCtrlDown.value = event.ctrlKey
      isCellSelectionShiftDown.value = event.shiftKey

      if (!isCellSelectionColumn(cell.column)) {
        currentPointerCell.value = null
        hoveredCellKey.value = null
        previewCellRangeKeys.value = new Set()
        return
      }

      const target = getCellSelectionAnchor(cell)
      currentPointerCell.value = target

      if (!event.ctrlKey) {
        hoveredCellKey.value = null
        previewCellRangeKeys.value = new Set()
        return
      }

      hoveredCellKey.value = getCellSelectionKey(cell.row.id, cell.column.id)
      previewCellRangeKeys.value = event.shiftKey ? getCellRangePreviewKeys(target) : new Set()
    }

    function handleCellSelectionPointerLeave(cell: Cell<AnyRow, unknown>) {
      if (
        currentPointerCell.value?.rowId === cell.row.id &&
        currentPointerCell.value.columnId === cell.column.id
      ) {
        currentPointerCell.value = null
      }

      if (hoveredCellKey.value === getCellSelectionKey(cell.row.id, cell.column.id)) {
        hoveredCellKey.value = null
        previewCellRangeKeys.value = new Set()
      }
    }

    function handleCellSelectionClick(cell: Cell<AnyRow, unknown>, event: MouseEvent) {
      isCellSelectionCtrlDown.value = event.ctrlKey
      isCellSelectionShiftDown.value = event.shiftKey

      if (event.shiftKey && !event.ctrlKey && isCellSelectionColumn(cell.column)) {
        event.preventDefault()
        event.stopPropagation()
        previewCellRangeKeys.value = new Set()
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
        previewCellRangeKeys.value = new Set()
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
      hoveredCellKey.value = null
      previewCellRangeKeys.value = new Set()
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
      renderColumnPickerLabel,
      onOpenFilterMenu: closeOverlayState,
    })
    const {
      activeViewId,
      savedViews,
      loadSavedViews,
      selectSavedView,
      createNewView,
      overwriteActiveView,
      deleteActiveView,
    } = useDataGridSavedViews({
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
        errorMessage.value =
          error instanceof Error ? error.message : 'Nie udalo sie zapisac widokow gridu.'
      },
      createViewId,
      cloneViewState,
    })
    const showViewsMenu = computed(
      () => Boolean(props.viewStorageKey) || Boolean(props.savedViewsPersistence),
    )
    const isAutoHeight = computed(() => props.height === -1)

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

    async function loadData(options: LoadDataOptions = {}) {
      const params: DataGridFetchParams = {
        pageIndex: pagination.value.pageIndex,
        pageSize: pagination.value.pageSize,
        sorting: sorting.value,
        filters: columnFilters.value,
        search: globalFilter.value.trim() || undefined,
        include_columns: requestedServerColumns.value,
      }
      const requestKey = JSON.stringify(params)

      if (!options.force && (requestKey === activeRequestKey || requestKey === loadedRequestKey)) {
        return
      }

      if (activeController) {
        activeController.abort()
      }

      const requestId = activeRequestId + 1
      activeRequestId = requestId
      const controller = new AbortController()
      activeController = controller
      activeRequestKey = requestKey
      isLoading.value = true
      errorMessage.value = ''

      try {
        const response = await props.fetchPage(params, controller.signal)

        if (isUnmounted || requestId !== activeRequestId) {
          return
        }

        requestState.value = {
          rows: response.rows,
          totalRows: response.totalRows,
          pageCount: response.pageCount,
          meta: response.meta,
        }

        rowVirtualizer.value.scrollToOffset(0)
        loadedRequestKey = requestKey
      } catch (error) {
        if (
          isUnmounted ||
          requestId !== activeRequestId ||
          controller.signal.aborted ||
          (error instanceof DOMException && error.name === 'AbortError') ||
          (error instanceof Error && error.name === 'AbortError')
        ) {
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
        if (activeController === controller) {
          activeController = null
        }

        if (activeRequestKey === requestKey) {
          activeRequestKey = ''
        }

        if (!isUnmounted && requestId === activeRequestId) {
          isLoading.value = false
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

    watch(
      [visibleRows, cellSelectionColumns],
      ([rows, columns]) => {
        if (selectedCellKeys.value.size === 0) {
          return
        }

        const availableKeys = new Set<string>()
        for (const row of rows) {
          for (const column of columns) {
            availableKeys.add(getCellSelectionKey(row.id, column.id))
          }
        }

        const nextKeys = new Set(
          Array.from(selectedCellKeys.value).filter((key) => availableKeys.has(key)),
        )

        if (nextKeys.size !== selectedCellKeys.value.size) {
          selectedCellKeys.value = nextKeys
        }

        if (
          lastSelectedCell.value &&
          !availableKeys.has(
            getCellSelectionKey(lastSelectedCell.value.rowId, lastSelectedCell.value.columnId),
          )
        ) {
          lastSelectedCell.value = null
        }
      },
      { flush: 'post' },
    )

    onBeforeUnmount(() => {
      isUnmounted = true
      activeRequestId += 1
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
      void loadSavedViews()
    })

    const {
      columnPickerColumns,
      syncColumnDialogDraftState,
      getDraftPinnedSide,
      getDraftColumnMoveTarget,
      toggleDraftColumnVisibility,
      updateDraftColumnSize,
      setDraftPin,
      moveDraftColumn,
      updateDraftColumnMoveTarget,
      moveDraftColumnRelative,
      applyColumnDialogChanges,
      draftColumnVisibility,
      draftColumnSizing,
    } = useDataGridColumnPicker({
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

      void loadData({ force: true })
    }

    function getRowKey(row: AnyRow, index: number): string {
      return String((row as { id?: string | number }).id ?? index)
    }

    function updateVisibleRow(
      rowId: string | number,
      resolveRow: (currentRow: AnyRow) => AnyRow,
    ) {
      const targetRowId = String(rowId)
      const rowIndex = requestState.value.rows.findIndex(
        (row, index) => getRowKey(row, index) === targetRowId,
      )

      if (rowIndex === -1) {
        return
      }

      const currentRow = requestState.value.rows[rowIndex]
      if (!currentRow) {
        return
      }

      const nextRows = [...requestState.value.rows]
      nextRows[rowIndex] = resolveRow(currentRow)
      requestState.value = {
        ...requestState.value,
        rows: nextRows,
      }
    }

    function patchRow(rowId: string | number, patch: Partial<AnyRow>) {
      updateVisibleRow(rowId, (currentRow) => ({ ...currentRow, ...patch }))
    }

    function replaceRow(rowId: string | number, row: AnyRow) {
      updateVisibleRow(rowId, () => row)
    }

    expose({
      refreshData,
      patchRow,
      replaceRow,
    })

    function clearAllFilters() {
      pagination.value = {
        ...pagination.value,
        pageIndex: 0,
      }
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

    function renderFilterHelpDialog() {
      return (
        <DataGridFilterHelpDialog
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

    const selectionPanelColumns = computed(() => {
      const configuredColumnIds = mergedSelectionPanelConfig.value?.copyColumnIds
      const rowSelectionColumnId =
        mergedRowSelectionConfig.value?.columnId ?? defaultRowSelectionColumnId

      if (configuredColumnIds && configuredColumnIds.length > 0) {
        const visibleColumnById = new Map(visibleColumns.value.map((column) => [column.id, column]))
        return configuredColumnIds
          .map((columnId) => visibleColumnById.get(columnId))
          .filter((column): column is Column<AnyRow, unknown> => Boolean(column))
      }

      return visibleColumns.value.filter((column) => {
        const columnDef = column.columnDef as DataGridColumn<AnyRow>
        return column.id !== rowSelectionColumnId && columnDef.localKind !== 'action'
      })
    })

    function getColumnClipboardLabel(column: Column<AnyRow, unknown>) {
      return renderColumnPickerLabel(column)
    }

    function getClipboardCellValue(row: Row<AnyRow>, column: Column<AnyRow, unknown>) {
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

    function clearSelectedCells() {
      selectedCellKeys.value = new Set()
      previewCellRangeKeys.value = new Set()
      hoveredCellKey.value = null
      currentPointerCell.value = null
      lastSelectedCell.value = null
    }

    function clearSelectedRows() {
      rowSelection.value = {}
      previewSelectionRowIds.value = new Set()
      lastSelectedRowId.value = null
    }

    function clearAllSelection() {
      clearSelectedRows()
      clearSelectedCells()
    }

    function clearSelectedColumns() {
      if (selectedColumnIds.value.length === 0) {
        return
      }

      const columnIds = new Set(selectedColumnIds.value)
      selectedCellKeys.value = new Set(
        [...selectedCellKeys.value].filter((key) => {
          const [, columnId] = key.split('::')
          return !columnId || !columnIds.has(columnId)
        }),
      )
      previewCellRangeKeys.value = new Set()
      hoveredCellKey.value = null
      currentPointerCell.value = null
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

    async function copySelectedCells(includeHeaders: boolean) {
      const columns = cellSelectionColumns.value.filter((column) =>
        selectedCellRows.value.some((row) => row.selectedColumnIds.includes(column.id)),
      )
      const rows = selectedCellRows.value

      if (columns.length === 0 || rows.length === 0 || typeof navigator === 'undefined') {
        return
      }

      const lines: string[] = []

      if (includeHeaders) {
        lines.push(columns.map((column) => escapeClipboardCell(getColumnClipboardLabel(column))).join('\t'))
      }

      for (const rowEntry of rows) {
        lines.push(
          columns
            .map((column) =>
              rowEntry.selectedColumnIds.includes(column.id)
                ? escapeClipboardCell(getClipboardCellValue(rowEntry.row, column))
                : '',
            )
            .join('\t'),
        )
      }

      await navigator.clipboard.writeText(lines.join('\n'))
    }

    async function copyAllSelection(includeHeaders: boolean) {
      const parts: string[] = []

      if (selectedRows.value.length > 0) {
        const columns = selectionPanelColumns.value
        const lines: string[] = []

        if (includeHeaders) {
          lines.push(columns.map((column) => escapeClipboardCell(getColumnClipboardLabel(column))).join('\t'))
        }

        for (const row of selectedRows.value) {
          lines.push(
            columns
              .map((column) => escapeClipboardCell(getClipboardCellValue(row, column)))
              .join('\t'),
          )
        }

        parts.push(lines.join('\n'))
      }

      if (selectedCellCount.value > 0) {
        const columns = cellSelectionColumns.value.filter((column) =>
          selectedCellRows.value.some((row) => row.selectedColumnIds.includes(column.id)),
        )
        const lines: string[] = []

        if (includeHeaders) {
          lines.push(columns.map((column) => escapeClipboardCell(getColumnClipboardLabel(column))).join('\t'))
        }

        for (const rowEntry of selectedCellRows.value) {
          lines.push(
            columns
              .map((column) =>
                rowEntry.selectedColumnIds.includes(column.id)
                  ? escapeClipboardCell(getClipboardCellValue(rowEntry.row, column))
                  : '',
              )
              .join('\t'),
          )
        }

        parts.push(lines.join('\n'))
      }

      if (parts.length > 0 && typeof navigator !== 'undefined') {
        await navigator.clipboard.writeText(parts.join('\n\n'))
      }
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
      const selectionPanelSections: SelectionPanelSection[] = []

      if (selectedRows.value.length > 0) {
        selectionPanelSections.push({
          id: 'rows',
          label: mergedSelectionPanelConfig.value?.selectedRowsLabel ?? 'Zaznaczone wiersze',
          count: selectedRows.value.length,
          copyLabel: 'Kopiuj wiersze',
          clearLabel: 'Wyczysc wiersze',
          onCopy: (options: { includeHeaders: boolean }) => copySelectedRows(options.includeHeaders),
          onClear: clearSelectedRows,
        })
      }

      if (selectedColumnIds.value.length > 0) {
        selectionPanelSections.push({
          id: 'columns',
          label: 'Zaznaczone kolumny',
          count: selectedColumnIds.value.length,
          copyLabel: 'Kopiuj kolumny',
          clearLabel: 'Wyczysc kolumny',
          onCopy: (options: { includeHeaders: boolean }) => copySelectedCells(options.includeHeaders),
          onClear: clearSelectedColumns,
        })
      }

      if (selectedCellCount.value > 0) {
        selectionPanelSections.push({
          id: 'cells',
          label: 'Zaznaczone komorki',
          count: selectedCellCount.value,
          copyLabel: 'Kopiuj komorki',
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
              '--app-accent-soft-strong':
                'var(--data-grid-accent-soft-strong, rgb(124 184 255 / 0.12))',
              '--app-row-selected': 'var(--data-grid-row-selected, #4b5f7b)',
              '--app-row-selected-hover': 'var(--data-grid-row-selected-hover, #5d7493)',
              '--app-shadow': 'var(--data-grid-shadow, 0 16px 40px -28px rgb(0 0 0 / 0.78))',
              '--app-shadow-soft': 'var(--data-grid-shadow-soft, 0 10px 30px rgb(0 0 0 / 0.4))',
              '--app-shadow-dialog':
                'var(--data-grid-shadow-dialog, 0 30px 60px -30px rgb(0 0 0 / 0.9))',
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
              />
            </div>

            <div
              class="data-grid__viewport-shell"
              style={
                {
                  ...(isAutoHeight.value ? {} : { height: `${props.height}px` }),
                  '--data-grid-header-height': `${headerHeight}px`,
                } as Record<string, string>
              }
            >
              <div
                ref={scrollElementRef}
                class={[
                  'data-grid__viewport',
                  isLoading.value && mergedLoadingConfig.value.variant === 'overlay'
                    ? 'data-grid__viewport--loading'
                    : '',
                ]}
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
                          isSelectionPreviewed={previewSelectionRowIds.value.has(row.id)}
                          isCellSelected={isCellSelected}
                          isCellSelectionHovered={isCellSelectionHovered}
                          isCellSelectionRangePreviewed={isCellSelectionRangePreviewed}
                          onCellSelectionPointerEnter={handleCellSelectionPointerEnter}
                          onCellSelectionPointerLeave={handleCellSelectionPointerLeave}
                          onCellSelectionClick={handleCellSelectionClick}
                        />
                      )
                    })}
                  </div>
                </div>
              </div>
              {isLoading.value && mergedLoadingConfig.value.variant === 'overlay' ? (
                <div class="data-grid__loading-overlay" aria-live="polite">
                  <div class="data-grid__loading-spinner" />
                  <span class="data-grid__loading-label">
                    {mergedLoadingConfig.value.label ?? 'Ladowanie danych'}
                  </span>
                </div>
              ) : null}
            </div>
            {mergedSelectionPanelConfig.value && selectionPanelSections.length > 0 ? (
              <DataGridSelectionPanel
                position={mergedSelectionPanelConfig.value.position ?? selectionPanelPosition.value ?? 'bottom-right'}
                floatingPosition={
                  mergedSelectionPanelConfig.value.floatingPosition ??
                  selectionPanelFloatingPosition.value ??
                  null
                }
                selectedRowsCount={selectionPanelSections.reduce(
                  (total, section) => total + section.count,
                  0,
                )}
                selectedRowsLabel="Zaznaczone razem"
                sections={selectionPanelSections}
                sums={selectionPanelSums.value}
                copyLabel="Kopiuj wszystko"
                copyIncludeHeaders={mergedSelectionPanelConfig.value.copyIncludeHeaders ?? false}
                copyWithHeadersLabel={
                  mergedSelectionPanelConfig.value.copyWithHeadersLabel ??
                  'Kopiuj z naglowkami'
                }
                copyWithoutHeadersLabel={
                  mergedSelectionPanelConfig.value.copyWithoutHeadersLabel ??
                  'Kopiuj bez naglowkow'
                }
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
          </div>

          {serverFilterColumns.value.length === 0 ? (
            <p class="data-grid__note">Brak backendowych kolumn filtrowalnych.</p>
          ) : null}
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

