import { computed, defineComponent, h, onBeforeUnmount, ref, watch, type PropType } from 'vue'
import {
  FlexRender,
  getCoreRowModel,
  useVueTable,
  type Cell,
  type Column,
  type ColumnFiltersState,
  type ColumnPinningState,
  type ColumnSort,
  type ColumnVisibilityState,
  type PaginationState,
  type RowData,
} from '@tanstack/vue-table'
import { useVirtualizer } from '@tanstack/vue-virtual'

import type {
  DataGridColumn,
  DataGridFetchParams,
  DataGridFetchResult,
  DataGridInitialState,
} from '@/types/data-grid'

type AnyRow = RowData

type RequestState<TData extends AnyRow> = {
  rows: TData[]
  totalRows: number
  pageCount: number
  meta?: Record<string, unknown>
}

function toNumber(value: string, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export default defineComponent({
  name: 'DataGrid',
  props: {
    columns: {
      type: Array as PropType<DataGridColumn<AnyRow>[]>,
      required: true,
    },
    fetchPage: {
      type: Function as PropType<
        (params: DataGridFetchParams, signal?: AbortSignal) => Promise<DataGridFetchResult<AnyRow>>
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
    const columnVisibility = ref<ColumnVisibilityState>(props.initialState.columnVisibility ?? {})
    const columnPinning = ref<ColumnPinningState>(
      props.initialState.columnPinning ?? {
        left: [],
        right: [],
      },
    )
    const columnFilters = ref<ColumnFiltersState>(props.initialState.columnFilters ?? [])
    const globalFilter = ref(props.initialState.globalFilter ?? '')
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
        get columnPinning() {
          return columnPinning.value
        },
        get columnFilters() {
          return columnFilters.value
        },
        get globalFilter() {
          return globalFilter.value
        },
      },
      getCoreRowModel: getCoreRowModel(),
      manualPagination: true,
      manualSorting: true,
      manualFiltering: true,
      enableColumnPinning: true,
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
      onColumnPinningChange: (updater) => {
        columnPinning.value =
          typeof updater === 'function' ? updater(columnPinning.value) : updater
      },
      onColumnFiltersChange: (updater) => {
        columnFilters.value = typeof updater === 'function' ? updater(columnFilters.value) : updater
      },
      onGlobalFilterChange: (updater) => {
        globalFilter.value = typeof updater === 'function' ? updater(globalFilter.value) : updater
      },
      get pageCount() {
        return requestState.value.pageCount
      },
    })

    const leftColumns = computed(() => table.getLeftLeafColumns())
    const centerColumns = computed(() => table.getCenterLeafColumns())
    const rightColumns = computed(() => table.getRightLeafColumns())
    const visibleRows = computed(() => table.getRowModel().rows)
    const totalWidth = computed(() => table.getTotalSize())
    const leftWidth = computed(() => table.getLeftTotalSize())
    const centerWidth = computed(() => table.getCenterTotalSize())
    const rightWidth = computed(() => table.getRightTotalSize())
    const centerLeafHeaders = computed(() => table.getCenterHeaderGroups()[0]?.headers ?? [])
    const leftLeafHeaders = computed(() => table.getLeftHeaderGroups()[0]?.headers ?? [])
    const rightLeafHeaders = computed(() => table.getRightHeaderGroups()[0]?.headers ?? [])

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
        count: centerColumns.value.length,
        getScrollElement: () => scrollElementRef.value,
        estimateSize: (index) => centerColumns.value[index]?.getSize() ?? 160,
        overscan: props.overscanColumns,
      })),
    )

    const virtualRows = computed(() => rowVirtualizer.value.getVirtualItems())
    const virtualCenterColumns = computed(() => columnVirtualizer.value.getVirtualItems())
    const centerPaddingLeft = computed(() => virtualCenterColumns.value[0]?.start ?? 0)
    const centerPaddingRight = computed(() => {
      const lastItem = virtualCenterColumns.value[virtualCenterColumns.value.length - 1]
      return lastItem ? centerWidth.value - lastItem.end : centerWidth.value
    })
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
        .filter((column) => {
          const columnDef = column.columnDef as DataGridColumn<AnyRow>
          return Boolean(columnDef.serverField)
        }),
    )

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
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }

      if (activeController) {
        activeController.abort()
      }
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

      const nextFilters = columnFilters.value.filter((item) => item.id !== columnId)
      nextFilters.push({
        id: columnId,
        value,
      })
      columnFilters.value = nextFilters
    }

    function getFilterValue(columnId: string) {
      return String(columnFilters.value.find((item) => item.id === columnId)?.value ?? '')
    }

    function toggleSorting(column: Column<AnyRow, unknown>) {
      const columnDef = column.columnDef as DataGridColumn<AnyRow>
      if (!columnDef.serverField) {
        return
      }

      column.toggleSorting(column.getIsSorted() === 'asc')
      pagination.value = {
        ...pagination.value,
        pageIndex: 0,
      }
    }

    function cyclePin(column: Column<AnyRow, unknown>) {
      const pinned = column.getIsPinned()
      if (pinned === 'left') {
        column.pin('right')
        return
      }

      if (pinned === 'right') {
        column.pin(false)
        return
      }

      column.pin('left')
    }

    function renderHeaderCell(header: ReturnType<(typeof leftLeafHeaders)['value'][number]['getContext']>, column: Column<AnyRow, unknown>) {
      return h('div', { class: 'data-grid__header-content' }, [
        h(
          'button',
          {
            type: 'button',
            class: 'data-grid__sort-button',
            disabled: !(column.columnDef as DataGridColumn<AnyRow>).serverField,
            onClick: () => toggleSorting(column),
          },
          [
            h(FlexRender, {
              render: header.header.column.columnDef.header,
              props: header,
            }),
            h(
              'span',
              { class: 'data-grid__sort-indicator' },
              column.getIsSorted() === 'asc'
                ? '↑'
                : column.getIsSorted() === 'desc'
                  ? '↓'
                  : '·',
            ),
          ],
        ),
        (column.columnDef as DataGridColumn<AnyRow>).serverField
          ? h('input', {
              class: 'data-grid__filter-input',
              value: getFilterValue(column.id),
              placeholder: 'Filtr',
              onInput: (event) =>
                updateColumnFilter(column.id, (event.target as HTMLInputElement).value),
            })
          : h('div', { class: 'data-grid__filter-placeholder' }, 'lokalne'),
        column.getCanPin()
          ? h(
              'button',
              {
                type: 'button',
                class: 'data-grid__pin-button',
                onClick: () => cyclePin(column),
              },
              column.getIsPinned()
                ? column.getIsPinned() === 'left'
                  ? 'pin: left'
                  : 'pin: right'
                : 'pin',
            )
          : null,
      ])
    }

    function renderCell(cell: Cell<AnyRow, unknown>) {
      return h(FlexRender, {
        render: cell.column.columnDef.cell,
        props: cell.getContext(),
      })
    }

    function renderPinnedCells(cells: Cell<AnyRow, unknown>[], side: 'left' | 'right') {
      return cells.map((cell) => {
        const column = cell.column
        const pinnedStyle =
          side === 'left'
            ? { left: `${column.getStart(side)}px` }
            : { right: `${column.getAfter(side)}px` }

        return h(
          'div',
          {
            key: cell.id,
            class: ['data-grid__cell', 'data-grid__cell--pinned', `data-grid__cell--${side}`],
            style: {
              width: `${column.getSize()}px`,
              ...pinnedStyle,
            },
          },
          renderCell(cell),
        )
      })
    }

    return () => {
      const pageCount = requestState.value.pageCount
      const pageIndex = pagination.value.pageIndex

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

          <div class="data-grid__column-picker">
            {table.getAllLeafColumns().map((column) => (
              <label key={column.id} class="data-grid__column-option">
                <input
                  type="checkbox"
                  checked={column.getIsVisible()}
                  onChange={column.getToggleVisibilityHandler()}
                />
                <span>{String(column.columnDef.header ?? column.id)}</span>
              </label>
            ))}
          </div>

          <div
            ref={scrollElementRef}
            class="data-grid__viewport"
            style={{ height: `${props.height}px` }}
          >
            <div
              class="data-grid__inner"
              style={{
                width: `${totalWidth.value}px`,
                height: `${totalRowHeight.value + props.rowHeight}px`,
              }}
            >
              <div class="data-grid__header" style={{ width: `${totalWidth.value}px` }}>
                {leftLeafHeaders.value.map((header) => {
                  const column = header.column
                  return (
                    <div
                      key={header.id}
                      class="data-grid__cell data-grid__cell--header data-grid__cell--pinned data-grid__cell--left"
                      style={{
                        width: `${column.getSize()}px`,
                        left: `${column.getStart('left')}px`,
                      }}
                    >
                      {renderHeaderCell(header.getContext(), column)}
                    </div>
                  )
                })}

                <div
                  class="data-grid__center-strip data-grid__center-strip--header"
                  style={{
                    left: `${leftWidth.value}px`,
                    width: `${centerWidth.value}px`,
                  }}
                >
                  <div style={{ width: `${centerPaddingLeft.value}px`, flex: '0 0 auto' }} />
                  {virtualCenterColumns.value.map((virtualColumn) => {
                    const column = centerColumns.value[virtualColumn.index]
                    const header = centerLeafHeaders.value[virtualColumn.index]

                    if (!column || !header) {
                      return null
                    }

                    return (
                      <div
                        key={header.id}
                        class="data-grid__cell data-grid__cell--header"
                        style={{ width: `${virtualColumn.size}px` }}
                      >
                        {renderHeaderCell(header.getContext(), column)}
                      </div>
                    )
                  })}
                  <div style={{ width: `${centerPaddingRight.value}px`, flex: '0 0 auto' }} />
                </div>

                {rightLeafHeaders.value.map((header) => {
                  const column = header.column
                  return (
                    <div
                      key={header.id}
                      class="data-grid__cell data-grid__cell--header data-grid__cell--pinned data-grid__cell--right"
                      style={{
                        width: `${column.getSize()}px`,
                        right: `${column.getAfter('right')}px`,
                      }}
                    >
                      {renderHeaderCell(header.getContext(), column)}
                    </div>
                  )
                })}
              </div>

              <div class="data-grid__body" style={{ width: `${totalWidth.value}px` }}>
                {virtualRows.value.map((virtualRow) => {
                  const row = visibleRows.value[virtualRow.index]
                  if (!row) {
                    return null
                  }

                  const leftCells = row.getLeftVisibleCells()
                  const centerCells = row.getCenterVisibleCells()
                  const rightCells = row.getRightVisibleCells()

                  return (
                    <div
                      key={row.id}
                      class="data-grid__row"
                      style={{
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start + props.rowHeight}px)`,
                      }}
                    >
                      {renderPinnedCells(leftCells, 'left')}

                      <div
                        class="data-grid__center-strip"
                        style={{
                          left: `${leftWidth.value}px`,
                          width: `${centerWidth.value}px`,
                        }}
                      >
                        <div style={{ width: `${centerPaddingLeft.value}px`, flex: '0 0 auto' }} />
                        {virtualCenterColumns.value.map((virtualColumn) => {
                          const cell = centerCells[virtualColumn.index]
                          if (!cell) {
                            return null
                          }

                          return (
                            <div
                              key={cell.id}
                              class="data-grid__cell"
                              style={{ width: `${virtualColumn.size}px` }}
                            >
                              {renderCell(cell)}
                            </div>
                          )
                        })}
                        <div style={{ width: `${centerPaddingRight.value}px`, flex: '0 0 auto' }} />
                      </div>

                      {renderPinnedCells(rightCells, 'right')}
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
