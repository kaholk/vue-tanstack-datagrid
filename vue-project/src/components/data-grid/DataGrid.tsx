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
  type ColumnPinningState,
  type ColumnSort,
  type Header,
  type HeaderContext,
  type PaginationState,
  type RowSelectionState,
} from '@tanstack/vue-table'
import { useVirtualizer } from '@tanstack/vue-virtual'

import type {
  DataGridColumnAlign,
  DataGridColumn,
  DataGridColumnVisibilityState,
  DataGridFetchParams,
  DataGridFetchResult,
  DataGridInitialState,
} from '@/types/data-grid'

type AnyRow = Record<string, unknown>

type RequestState<TData extends AnyRow> = {
  rows: TData[]
  totalRows: number
  pageCount: number
  meta?: Record<string, unknown>
}

type RenderedSequenceItem<TItem> =
  | { type: 'spacer'; key: string; width: number }
  | { type: 'item'; key: string; item: TItem; column: Column<AnyRow, unknown> }

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

export default defineComponent({
  name: 'DataGrid',
  props: {
    columns: {
      type: Array as PropType<DataGridColumn<any>[]>,
      required: true,
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
    const requestState = ref<RequestState<AnyRow>>({
      rows: [],
      totalRows: 0,
      pageCount: 0,
      meta: undefined,
    })
    const isLoading = ref(false)
    const errorMessage = ref('')

    let debounceTimer: ReturnType<typeof setTimeout> | undefined
    let activeController: AbortController | null = null

    function handleDocumentClick(event: MouseEvent) {
      const target = event.target

      if (!(target instanceof HTMLElement)) {
        return
      }

      if (target.closest('[data-grid-menu-root="true"]')) {
        return
      }

      openMenuColumnId.value = null
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
      () => [columnVisibility.value, columnPinning.value],
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
    })

    function updateColumnFilter(columnId: string, value: string) {
      pagination.value = {
        ...pagination.value,
        pageIndex: 0,
      }

      if (!value.trim()) {
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

    function getFilterValue(columnId: string) {
      return String(columnFilters.value.find((item) => item.id === columnId)?.value ?? '')
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
      const pinnedSide = getPinnedSide(column.id)
      const sortedState = column.getIsSorted()
      const justifyContent = toJustifyContent(columnDef.align)
      const showFilter = columnDef.showFilter ?? isServerColumn
      const isMenuOpen = openMenuColumnId.value === column.id

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
          showFilter
            ? h('input', {
                class: 'data-grid__filter-input',
                value: getFilterValue(column.id),
                placeholder: 'Filtr',
                onInput: (event) =>
                  updateColumnFilter(column.id, (event.target as HTMLInputElement).value),
              })
            : h('span', { class: 'data-grid__column-kind' }, isServerColumn ? 'no filter' : 'local'),
            isMenuOpen
              ? h(
                  'div',
                {
                  class: 'data-grid__column-menu',
                  'data-grid-menu-root': 'true',
                  style: getColumnMenuStyle(column),
                },
                [
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
          <div class="data-grid__toolbar">
            <label class="data-grid__search">
              <span>Search</span>
              <input
                value={globalFilter.value}
                placeholder="Global search"
                onInput={(event) => {
                  globalFilter.value = (event.target as HTMLInputElement).value
                  pagination.value = {
                    ...pagination.value,
                    pageIndex: 0,
                  }
                }}
              />
            </label>
          </div>

          <div class="data-grid__column-picker">
            {table.getAllLeafColumns().map((column) => (
              <label key={column.id} class="data-grid__column-option">
                <input
                  type="checkbox"
                  checked={column.getIsVisible()}
                  onChange={column.getToggleVisibilityHandler()}
                />
                <span>{renderColumnPickerLabel(column)}</span>
              </label>
            ))}
          </div>

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
                        {renderHeaderCell(entry.item.getContext(), entry.column)}
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
                      class="data-grid__row"
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

          <div class="data-grid__footer">
            <div class="data-grid__meta">
              <span>{isLoading.value ? 'Loading...' : `Rows: ${requestState.value.totalRows}`}</span>
              <span>{`Fetched: ${requestState.value.rows.length}`}</span>
              {requestState.value.meta?.datasetSize ? (
                <span>{`Dataset: ${requestState.value.meta.datasetSize}`}</span>
              ) : null}
            </div>

            <div class="data-grid__pagination">
              <button
                type="button"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                {'<<'}
              </button>
              <button
                type="button"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Prev
              </button>
              <span>{`Page ${pageIndex + 1} / ${Math.max(pageCount, 1)}`}</span>
              <button
                type="button"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </button>
              <button
                type="button"
                onClick={() => table.setPageIndex(Math.max(pageCount - 1, 0))}
                disabled={!table.getCanNextPage()}
              >
                {'>>'}
              </button>
            </div>

            <label class="data-grid__page-size">
              <span>Rows</span>
              <select
                value={String(pagination.value.pageSize)}
                onChange={(event) => {
                  pagination.value = {
                    pageIndex: 0,
                    pageSize: toNumber((event.target as HTMLSelectElement).value, 100),
                  }
                }}
              >
                {[50, 100, 250, 500].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {serverFilterColumns.value.length === 0 ? (
            <p class="data-grid__note">Brak backendowych kolumn filtrowalnych.</p>
          ) : null}
          {errorMessage.value ? <p class="data-grid__error">{errorMessage.value}</p> : null}
        </section>
      )
    }
  },
})
