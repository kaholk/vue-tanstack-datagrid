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

export function useDataGridVirtualization(options: UseDataGridVirtualizationOptions) {
  const leftPinnedColumnIds = computed(() => new Set(options.columnPinning.value.left ?? []))
  const rightPinnedColumnIds = computed(() => new Set(options.columnPinning.value.right ?? []))
  const cellStyleCacheByColumnId = new Map<string, CellStyleCacheEntry>()

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
  const headerSequence = computed(() => buildRenderedColumnSequence({
    leftPinnedItems: leftPinnedHeaders.value,
    rightPinnedItems: rightPinnedHeaders.value,
    nonPinnedItems: nonPinnedHeaders.value,
    virtualNonPinnedColumns: virtualNonPinnedColumns.value,
    nonPinnedTotalWidth: nonPinnedTotalWidth.value,
    getColumn: (header) => header.column,
  }))
  const rowSequence = computed(() => buildRenderedColumnSequence({
    leftPinnedItems: leftPinnedColumns.value,
    rightPinnedItems: rightPinnedColumns.value,
    nonPinnedItems: nonPinnedColumns.value,
    virtualNonPinnedColumns: virtualNonPinnedColumns.value,
    nonPinnedTotalWidth: nonPinnedTotalWidth.value,
    getColumn: (column) => column,
  }))
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
    const styles = new Map<string, CSSProperties>()

    for (const column of nonPinnedColumns.value) {
      styles.set(column.id, createNormalCellStyle(column))
    }

    return styles
  })

  const pinnedCellStylesByColumnId = computed(() => {
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

    return styles
  })

  const cellStylesByColumnId = computed(() => {
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
