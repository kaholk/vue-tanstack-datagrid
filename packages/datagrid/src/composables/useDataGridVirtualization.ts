import { computed, type CSSProperties, type Ref } from 'vue'
import { useVirtualizer, type VirtualItem } from '@tanstack/vue-virtual'
import type { Column, ColumnPinningState, Header, Row } from '@tanstack/vue-table'

import type { DataGridColumn } from '../types'
import { toJustifyContent } from '../utils/columns'

type AnyRow = Record<string, unknown>

export type RenderedSequenceItem<TItem> = { type: 'spacer'; key: string; width: number } | { type: 'item'; key: string; item: TItem; column: Column<AnyRow, unknown> }

type CellStyleCacheEntry = {
  key: string
  style: CSSProperties
}

type CachedValue<TValue> = {
  key: string
  value: TValue
}

type UseDataGridVirtualizationOptions = {
  scrollElementRef: Ref<HTMLDivElement | null>
  visibleRows: Ref<Row<AnyRow>[]>
  visibleColumns: Ref<Column<AnyRow, unknown>[]>
  visibleHeaders: Ref<Header<AnyRow, unknown>[]>
  allLeafColumnsById: Ref<Map<string, Column<AnyRow, unknown>>>
  visibleColumnIndexById: Ref<Map<string, number>>
  columnPinning: Ref<ColumnPinningState>
  rowHeight: () => number
  overscanRows: () => number
  overscanColumns: () => number
}

function buildRenderedColumnSequence<TItem extends Column<AnyRow, unknown> | Header<AnyRow, unknown>>(
  options: {
    leftPinnedItems: TItem[]
    rightPinnedItems: TItem[]
    nonPinnedItems: TItem[]
    virtualNonPinnedColumns: VirtualItem[]
    nonPinnedTotalWidth: number
    getColumn: (item: TItem) => Column<AnyRow, unknown>
  },
): RenderedSequenceItem<TItem>[] {
  const sequence: RenderedSequenceItem<TItem>[] = []
  const pushItem = (item: TItem) => {
    const column = options.getColumn(item)
    sequence.push({
      type: 'item',
      key: column.id,
      item,
      column,
    })
  }

  for (const item of options.leftPinnedItems) {
    pushItem(item)
  }

  const firstVirtualColumn = options.virtualNonPinnedColumns[0]
  if (firstVirtualColumn && firstVirtualColumn.start > 0) {
    sequence.push({ type: 'spacer', key: 'spacer-before', width: firstVirtualColumn.start })
  }

  for (const virtualColumn of options.virtualNonPinnedColumns) {
    const item = options.nonPinnedItems[virtualColumn.index]
    if (item) {
      pushItem(item)
    }
  }

  const lastVirtualColumn = options.virtualNonPinnedColumns[options.virtualNonPinnedColumns.length - 1]
  const trailingWidth = lastVirtualColumn
    ? options.nonPinnedTotalWidth - lastVirtualColumn.end
    : options.nonPinnedTotalWidth
  if (trailingWidth > 0) {
    sequence.push({ type: 'spacer', key: 'spacer-after', width: trailingWidth })
  }

  for (const item of options.rightPinnedItems) {
    pushItem(item)
  }

  return sequence
}

function getVisiblePinnedColumns(
  pinnedColumnIds: string[],
  columnById: Map<string, Column<AnyRow, unknown>>,
  visibleColumnIndexById: Map<string, number>,
) {
  const columns: Column<AnyRow, unknown>[] = []
  for (const columnId of pinnedColumnIds) {
    const column = columnById.get(columnId)
    if (column && visibleColumnIndexById.has(columnId)) {
      columns.push(column)
    }
  }
  return columns
}

function getVirtualColumnsKey(virtualColumns: VirtualItem[]) {
  return virtualColumns.map((item) => `${item.index}:${item.start}:${item.end}`).join('|')
}

function getColumnsKey(columns: Column<AnyRow, unknown>[]) {
  return columns.map((column) => `${column.id}:${column.getSize()}:${(column.columnDef as DataGridColumn<AnyRow>).align ?? 'start'}`).join('|')
}

export function useDataGridVirtualization(options: UseDataGridVirtualizationOptions) {
  const leftPinnedColumnIds = computed(() => new Set(options.columnPinning.value.left ?? []))
  const rightPinnedColumnIds = computed(() => new Set(options.columnPinning.value.right ?? []))
  const cellStyleCacheByColumnId = new Map<string, CellStyleCacheEntry>()
  let cachedHeaderSequence: CachedValue<Array<RenderedSequenceItem<Header<AnyRow, unknown>>>> | null = null
  let cachedRowSequence: CachedValue<Array<RenderedSequenceItem<Column<AnyRow, unknown>>>> | null = null
  let cachedNormalCellStyles: CachedValue<Map<string, CSSProperties>> | null = null
  let cachedPinnedCellStyles: CachedValue<Map<string, CSSProperties>> | null = null
  let cachedCellStyles: CachedValue<Map<string, CSSProperties>> | null = null

  function getPinnedSide(columnId: string): 'left' | 'right' | false {
    if (leftPinnedColumnIds.value.has(columnId)) {
      return 'left'
    }

    if (rightPinnedColumnIds.value.has(columnId)) {
      return 'right'
    }

    return false
  }

  const nonPinnedColumns = computed(() => options.visibleColumns.value.filter((column) => !getPinnedSide(column.id)))

  const rowVirtualizer = useVirtualizer<HTMLDivElement, HTMLDivElement>(
    computed(() => ({
      count: options.visibleRows.value.length,
      getScrollElement: () => options.scrollElementRef.value,
      estimateSize: () => options.rowHeight(),
      overscan: options.overscanRows(),
    })),
  )

  const columnVirtualizer = useVirtualizer<HTMLDivElement, HTMLDivElement>(
    computed(() => ({
      horizontal: true,
      count: nonPinnedColumns.value.length,
      getScrollElement: () => options.scrollElementRef.value,
      estimateSize: (index) => nonPinnedColumns.value[index]?.getSize() ?? 160,
      overscan: options.overscanColumns(),
    })),
  )

  const virtualRows = computed(() => rowVirtualizer.value.getVirtualItems())
  const virtualNonPinnedColumns = computed(() => columnVirtualizer.value.getVirtualItems())
  const totalRowHeight = computed(() => rowVirtualizer.value.getTotalSize())
  const nonPinnedTotalWidth = computed(() => columnVirtualizer.value.getTotalSize())
  const visibleHeaderByColumnId = computed(() => new Map(options.visibleHeaders.value.map((header) => [header.column.id, header])))
  const leftPinnedColumns = computed(() => getVisiblePinnedColumns(options.columnPinning.value.left ?? [], options.allLeafColumnsById.value, options.visibleColumnIndexById.value))
  const rightPinnedColumns = computed(() => getVisiblePinnedColumns(options.columnPinning.value.right ?? [], options.allLeafColumnsById.value, options.visibleColumnIndexById.value))
  const leftPinnedHeaders = computed(() => leftPinnedColumns.value.map((column) => visibleHeaderByColumnId.value.get(column.id)).filter((header): header is Header<AnyRow, unknown> => Boolean(header)))
  const rightPinnedHeaders = computed(() => rightPinnedColumns.value.map((column) => visibleHeaderByColumnId.value.get(column.id)).filter((header): header is Header<AnyRow, unknown> => Boolean(header)))
  const nonPinnedHeaders = computed(() => nonPinnedColumns.value.map((column) => visibleHeaderByColumnId.value.get(column.id)).filter((header): header is Header<AnyRow, unknown> => Boolean(header)))
  const headerSequence = computed(() => {
    const key = [
      getColumnsKey(leftPinnedColumns.value),
      getColumnsKey(nonPinnedColumns.value),
      getColumnsKey(rightPinnedColumns.value),
      getVirtualColumnsKey(virtualNonPinnedColumns.value),
      nonPinnedTotalWidth.value,
    ].join('::')

    if (cachedHeaderSequence?.key === key) {
      return cachedHeaderSequence.value
    }

    const value = buildRenderedColumnSequence({
      leftPinnedItems: leftPinnedHeaders.value,
      rightPinnedItems: rightPinnedHeaders.value,
      nonPinnedItems: nonPinnedHeaders.value,
      virtualNonPinnedColumns: virtualNonPinnedColumns.value,
      nonPinnedTotalWidth: nonPinnedTotalWidth.value,
      getColumn: (header) => header.column,
    })
    cachedHeaderSequence = { key, value }
    return value
  })
  const rowSequence = computed(() => {
    const key = [
      getColumnsKey(leftPinnedColumns.value),
      getColumnsKey(nonPinnedColumns.value),
      getColumnsKey(rightPinnedColumns.value),
      getVirtualColumnsKey(virtualNonPinnedColumns.value),
      nonPinnedTotalWidth.value,
    ].join('::')

    if (cachedRowSequence?.key === key) {
      return cachedRowSequence.value
    }

    const value = buildRenderedColumnSequence({
      leftPinnedItems: leftPinnedColumns.value,
      rightPinnedItems: rightPinnedColumns.value,
      nonPinnedItems: nonPinnedColumns.value,
      virtualNonPinnedColumns: virtualNonPinnedColumns.value,
      nonPinnedTotalWidth: nonPinnedTotalWidth.value,
      getColumn: (column) => column,
    })
    cachedRowSequence = { key, value }
    return value
  })
  function getCachedCellStyle(column: Column<AnyRow, unknown>, key: string, style: CSSProperties) {
    const cached = cellStyleCacheByColumnId.get(column.id)
    if (cached?.key === key) {
      return cached.style
    }

    cellStyleCacheByColumnId.set(column.id, { key, style })
    return style
  }

  function createNormalCellStyle(column: Column<AnyRow, unknown>) {
    const width = column.getSize()
    const justifyContent = toJustifyContent((column.columnDef as DataGridColumn<AnyRow>).align)
    return getCachedCellStyle(column, `normal:${width}:${justifyContent}`, {
      width: `${width}px`,
      justifyContent,
    })
  }

  const normalCellStylesByColumnId = computed(() => {
    const key = getColumnsKey(nonPinnedColumns.value)
    if (cachedNormalCellStyles?.key === key) {
      return cachedNormalCellStyles.value
    }

    const styles = new Map<string, CSSProperties>()

    for (const column of nonPinnedColumns.value) {
      styles.set(column.id, createNormalCellStyle(column))
    }

    cachedNormalCellStyles = { key, value: styles }
    return styles
  })

  const pinnedCellStylesByColumnId = computed(() => {
    const key = [
      (options.columnPinning.value.left ?? []).join('|'),
      (options.columnPinning.value.right ?? []).join('|'),
      getColumnsKey(leftPinnedColumns.value),
      getColumnsKey(rightPinnedColumns.value),
    ].join('::')

    if (cachedPinnedCellStyles?.key === key) {
      return cachedPinnedCellStyles.value
    }

    const styles = new Map<string, CSSProperties>()
    let leftOffset = 0
    const leftPinnedIds = options.columnPinning.value.left ?? []
    const rightPinnedIds = options.columnPinning.value.right ?? []

    for (let index = 0; index < leftPinnedIds.length; index += 1) {
      const columnId = leftPinnedIds[index]
      if (!columnId) {
        continue
      }
      const column = options.allLeafColumnsById.value.get(columnId)
      if (!column || !options.visibleColumnIndexById.value.has(columnId)) {
        continue
      }

      const width = column.getSize()
      const justifyContent = toJustifyContent((column.columnDef as DataGridColumn<AnyRow>).align)
      styles.set(column.id, getCachedCellStyle(column, `left:${width}:${leftOffset}:${60 - index}:${justifyContent}`, {
        width: `${width}px`,
        left: `${leftOffset}px`,
        zIndex: `${60 - index}`,
        justifyContent,
      }))
      leftOffset += width
    }

    let rightOffset = 0
    for (let index = rightPinnedIds.length - 1; index >= 0; index -= 1) {
      const columnId = rightPinnedIds[index]
      if (!columnId) {
        continue
      }
      const column = options.allLeafColumnsById.value.get(columnId)
      if (!column || !options.visibleColumnIndexById.value.has(columnId)) {
        continue
      }

      const width = column.getSize()
      const justifyContent = toJustifyContent((column.columnDef as DataGridColumn<AnyRow>).align)
      styles.set(column.id, getCachedCellStyle(column, `right:${width}:${rightOffset}:${60 - index}:${justifyContent}`, {
        width: `${width}px`,
        right: `${rightOffset}px`,
        zIndex: `${60 - index}`,
        justifyContent,
      }))
      rightOffset += width
    }

    cachedPinnedCellStyles = { key, value: styles }
    return styles
  })

  const cellStylesByColumnId = computed(() => {
    const key = `${normalCellStylesByColumnId.value.size}:${pinnedCellStylesByColumnId.value.size}:${getColumnsKey(options.visibleColumns.value)}:${(options.columnPinning.value.left ?? []).join('|')}:${(options.columnPinning.value.right ?? []).join('|')}`
    if (cachedCellStyles?.key === key) {
      return cachedCellStyles.value
    }

    const styles = new Map<string, CSSProperties>()
    const normalStyles = normalCellStylesByColumnId.value
    const pinnedStyles = pinnedCellStylesByColumnId.value

    for (const [columnId, style] of normalStyles) {
      styles.set(columnId, style)
    }
    for (const [columnId, style] of pinnedStyles) {
      styles.set(columnId, style)
    }
    for (const columnId of cellStyleCacheByColumnId.keys()) {
      if (!styles.has(columnId)) {
        cellStyleCacheByColumnId.delete(columnId)
      }
    }

    cachedCellStyles = { key, value: styles }
    return styles
  })

  return {
    rowVirtualizer,
    columnVirtualizer,
    virtualRows,
    totalRowHeight,
    headerSequence,
    rowSequence,
    cellStylesByColumnId,
    getPinnedSide,
  }
}
